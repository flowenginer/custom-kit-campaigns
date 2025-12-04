import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Check, MessageSquare, Upload, X, Loader2, ZoomIn, Image as ImageIcon } from 'lucide-react';
import { ImageZoomModal } from '@/components/ui/image-zoom-modal';

interface ApprovalData {
  id: string;
  task_id: string;
  layout_id: string | null;
  expires_at: string;
  approved_at: string | null;
  changes_requested_at: string | null;
  task: {
    id: string;
    order_id: string;
    status: string;
    current_version: number;
    design_files: any[];
    order: {
      customer_name: string;
      customer_phone: string;
    };
    campaign: {
      name: string;
    } | null;
    layout?: {
      id: string;
      layout_number: number;
      campaign_name: string | null;
      uniform_type: string | null;
      model_name: string | null;
      design_files: any[];
      current_version: number;
    };
  };
}

export default function LayoutApproval() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<ApprovalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [changeDescription, setChangeDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadApprovalData();
    }
  }, [token]);

  const loadApprovalData = async () => {
    try {
      setLoading(true);
      
      // Fetch approval link with related data
      const { data: linkData, error: linkError } = await supabase
        .from('layout_approval_links')
        .select('*')
        .eq('token', token)
        .single();

      if (linkError || !linkData) {
        setError('Link inválido ou não encontrado.');
        return;
      }

      // Check expiration
      if (new Date(linkData.expires_at) < new Date()) {
        setError('Este link expirou. Por favor, solicite um novo link.');
        return;
      }

      // Fetch task data
      const { data: taskData, error: taskError } = await supabase
        .from('design_tasks')
        .select(`
          id,
          order_id,
          status,
          current_version,
          design_files,
          orders!inner (
            customer_name,
            customer_phone
          ),
          campaigns (
            name
          )
        `)
        .eq('id', linkData.task_id)
        .single();

      if (taskError || !taskData) {
        setError('Tarefa não encontrada.');
        return;
      }

      // If there's a layout_id, fetch layout data
      let layoutData = null;
      if (linkData.layout_id) {
        const { data: layout } = await supabase
          .from('design_task_layouts')
          .select('*')
          .eq('id', linkData.layout_id)
          .single();
        layoutData = layout;
      }

      setData({
        ...linkData,
        task: {
          id: taskData.id,
          order_id: taskData.order_id,
          status: taskData.status,
          current_version: taskData.current_version || 1,
          design_files: (taskData.design_files as any[]) || [],
          order: taskData.orders as any,
          campaign: taskData.campaigns as any,
          layout: layoutData || undefined,
        },
      });

    } catch (err) {
      console.error('Error loading approval data:', err);
      setError('Erro ao carregar dados. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getMockupUrl = (): string | null => {
    // First check layout-specific design files
    if (data?.task.layout?.design_files) {
      const files = data.task.layout.design_files as any[];
      const latestApproved = files
        .filter((f: any) => f.client_approved || f.url)
        .sort((a: any, b: any) => (b.version || 0) - (a.version || 0))[0];
      if (latestApproved?.url) return latestApproved.url;
    }

    // Then check task-level design files
    if (data?.task.design_files) {
      const files = data.task.design_files as any[];
      const latestApproved = files
        .filter((f: any) => f.client_approved || f.url)
        .sort((a: any, b: any) => (b.version || 0) - (a.version || 0))[0];
      if (latestApproved?.url) return latestApproved.url;
    }

    return null;
  };

  const handleApprove = async () => {
    if (!data) return;
    
    setSubmitting(true);
    try {
      // Update approval link
      await supabase
        .from('layout_approval_links')
        .update({ approved_at: new Date().toISOString() })
        .eq('id', data.id);

      // Update layout status if exists
      if (data.layout_id) {
        await supabase
          .from('design_task_layouts')
          .update({ 
            status: 'approved',
            client_approved_at: new Date().toISOString()
          })
          .eq('id', data.layout_id);
      }

      // Update task status
      await supabase
        .from('design_tasks')
        .update({ 
          status: 'approved',
          client_approved_at: new Date().toISOString()
        })
        .eq('id', data.task_id);

      // Log history
      await supabase
        .from('design_task_history')
        .insert({
          task_id: data.task_id,
          action: 'client_approved',
          old_status: data.task.status as any,
          new_status: 'approved',
          notes: 'Layout aprovado pelo cliente via link de aprovação'
        });

      toast.success('Layout aprovado com sucesso!');
      
      // Reload data to show updated state
      loadApprovalData();
    } catch (err) {
      console.error('Error approving:', err);
      toast.error('Erro ao aprovar. Por favor, tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles = newFiles.filter(f => f.size <= 10 * 1024 * 1024); // 10MB max
      if (validFiles.length < newFiles.length) {
        toast.error('Alguns arquivos excedem 10MB e foram ignorados.');
      }
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const sanitizeFileName = (name: string): string => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_');
  };

  const handleRequestChange = async () => {
    if (!data || !changeDescription.trim()) {
      toast.error('Por favor, descreva as alterações necessárias.');
      return;
    }

    setUploading(true);
    try {
      // Upload files if any
      const attachments: { name: string; url: string }[] = [];
      
      for (const file of files) {
        const safeName = sanitizeFileName(file.name);
        const filePath = `change-requests/${data.task_id}/${Date.now()}_${safeName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('customer-logos')
          .upload(filePath, file);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('customer-logos')
            .getPublicUrl(filePath);
          
          attachments.push({ name: file.name, url: urlData.publicUrl });
        }
      }

      // Create change request
      await supabase
        .from('change_requests')
        .insert({
          task_id: data.task_id,
          layout_id: data.layout_id,
          description: changeDescription,
          attachments,
          source: 'client',
          created_by: null // Public/client request
        });

      // Update approval link
      await supabase
        .from('layout_approval_links')
        .update({ changes_requested_at: new Date().toISOString() })
        .eq('id', data.id);

      // Update layout status if exists
      if (data.layout_id) {
        await supabase
          .from('design_task_layouts')
          .update({ status: 'changes_requested' })
          .eq('id', data.layout_id);
      }

      // Update task status
      await supabase
        .from('design_tasks')
        .update({ status: 'changes_requested' })
        .eq('id', data.task_id);

      // Log history
      await supabase
        .from('design_task_history')
        .insert({
          task_id: data.task_id,
          action: 'client_changes_requested',
          old_status: data.task.status as any,
          new_status: 'changes_requested',
          notes: `Cliente solicitou alterações: ${changeDescription.substring(0, 100)}...`
        });

      toast.success('Solicitação de alteração enviada com sucesso!');
      
      // Reset form and reload
      setChangeDescription('');
      setFiles([]);
      setShowChangeForm(false);
      loadApprovalData();
    } catch (err) {
      console.error('Error requesting change:', err);
      toast.error('Erro ao enviar solicitação. Por favor, tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Link Inválido</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const mockupUrl = getMockupUrl();
  const isAlreadyApproved = !!data.approved_at;
  const isAlreadyRequested = !!data.changes_requested_at;
  const version = data.task.layout?.current_version || data.task.current_version || 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Aprovação de Layout</h1>
          <p className="text-muted-foreground">
            Visualize e aprove o mockup do seu pedido
          </p>
        </div>

        {/* Customer Info Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <p className="font-medium">{data.task.order.customer_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Campanha:</span>
                <p className="font-medium">
                  {data.task.layout?.campaign_name || data.task.campaign?.name || '-'}
                </p>
              </div>
              {data.task.layout && (
                <>
                  <div>
                    <span className="text-muted-foreground">Modelo:</span>
                    <p className="font-medium">{data.task.layout.model_name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="font-medium">{data.task.layout.uniform_type || '-'}</p>
                  </div>
                </>
              )}
              <div>
                <span className="text-muted-foreground">Versão:</span>
                <p className="font-medium">{version}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mockup Display */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            {mockupUrl ? (
              <div 
                className="relative cursor-zoom-in group"
                onClick={() => setZoomImage(mockupUrl)}
              >
                <img
                  src={mockupUrl}
                  alt="Mockup do layout"
                  className="w-full h-auto rounded-lg border"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                  <ZoomIn className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Mockup não disponível</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Messages */}
        {isAlreadyApproved && (
          <Card className="mb-6 border-green-500/50 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-green-600">
                <Check className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Layout Aprovado!</p>
                  <p className="text-sm opacity-80">
                    Você aprovou este layout em {new Date(data.approved_at!).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isAlreadyRequested && !isAlreadyApproved && (
          <Card className="mb-6 border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-amber-600">
                <MessageSquare className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Alterações Solicitadas</p>
                  <p className="text-sm opacity-80">
                    Você solicitou alterações em {new Date(data.changes_requested_at!).toLocaleDateString('pt-BR')}. 
                    Aguarde o novo mockup.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {!isAlreadyApproved && !isAlreadyRequested && (
          <div className="space-y-4">
            {!showChangeForm ? (
              <>
                <Button
                  className="w-full h-14 text-lg"
                  size="lg"
                  onClick={handleApprove}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Check className="h-5 w-5 mr-2" />
                  )}
                  Aprovar Layout
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-14 text-lg"
                  size="lg"
                  onClick={() => setShowChangeForm(true)}
                >
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Solicitar Alteração
                </Button>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Descreva as alterações necessárias:
                    </label>
                    <Textarea
                      value={changeDescription}
                      onChange={(e) => setChangeDescription(e.target.value)}
                      placeholder="Ex: Trocar a logo do patrocinador pela nova versão, ajustar a cor da manga..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Anexar arquivos (opcional):
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md text-sm"
                        >
                          <span className="truncate max-w-[150px]">{file.name}</span>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Upload className="h-4 w-4" />
                        Adicionar arquivo
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handleFileSelect}
                      />
                    </label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowChangeForm(false);
                        setChangeDescription('');
                        setFiles([]);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleRequestChange}
                      disabled={uploading || !changeDescription.trim()}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Enviar Solicitação
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Link válido até {new Date(data.expires_at).toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* Zoom Modal */}
      <ImageZoomModal
        isOpen={!!zoomImage}
        imageUrl={zoomImage || ''}
        alt="Mockup ampliado"
        onClose={() => setZoomImage(null)}
      />
    </div>
  );
}
