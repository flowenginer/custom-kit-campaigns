import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Check, MessageSquare, Upload, X, Loader2, ZoomIn, Image as ImageIcon, ThumbsDown } from 'lucide-react';
import { ImageZoomModal } from '@/components/ui/image-zoom-modal';
import { Badge } from '@/components/ui/badge';

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

interface MockupStatus {
  version: number;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  changeDescription?: string;
}

export default function LayoutApproval() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [data, setData] = useState<ApprovalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [mockupStatuses, setMockupStatuses] = useState<MockupStatus[]>([]);
  const [activeChangeForm, setActiveChangeForm] = useState<number | null>(null);
  const [changeDescription, setChangeDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [allSubmitted, setAllSubmitted] = useState(false);

  // Limpa o token removendo caracteres extras que o WhatsApp mobile pode adicionar
  const cleanToken = token?.trim().replace(/[^a-zA-Z0-9]/g, '') || '';

  useEffect(() => {
    if (cleanToken) {
      loadApprovalData();
    }
  }, [cleanToken]);

  const loadApprovalData = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Token original:', token);
      console.log('🔍 Token limpo:', cleanToken);
      
      const { data: linkData, error: linkError } = await supabase
        .from('layout_approval_links')
        .select('*')
        .eq('token', cleanToken)
        .single();

      if (linkError || !linkData) {
        setError('Link inválido ou não encontrado.');
        return;
      }

      if (new Date(linkData.expires_at) < new Date()) {
        setError('Este link expirou. Por favor, solicite um novo link.');
        return;
      }

      console.log('🔍 Buscando task_id:', linkData.task_id);
      
      const { data: taskData, error: taskError } = await supabase
        .from('design_tasks')
        .select(`
          id,
          order_id,
          status,
          current_version,
          design_files,
          orders (
            customer_name,
            customer_phone
          ),
          campaigns (
            name
          )
        `)
        .eq('id', linkData.task_id)
        .maybeSingle();

      console.log('📦 Task data:', taskData, 'Error:', taskError);

      if (taskError) {
        console.error('❌ Task error:', taskError);
        setError('Erro ao carregar tarefa. Por favor, tente novamente.');
        return;
      }

      if (!taskData) {
        setError('Tarefa não encontrada.');
        return;
      }

      let layoutData = null;
      if (linkData.layout_id) {
        const { data: layout } = await supabase
          .from('design_task_layouts')
          .select('*')
          .eq('id', linkData.layout_id)
          .single();
        layoutData = layout;
      }

      const approvalData: ApprovalData = {
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
      };

      setData(approvalData);

      // Initialize mockup statuses
      const mockups = getMockupsFromData(approvalData);
      setMockupStatuses(mockups.map(m => ({ version: m.version, status: 'pending' })));

    } catch (err) {
      console.error('Error loading approval data:', err);
      setError('Erro ao carregar dados. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getMockupsFromData = (approvalData: ApprovalData): { url: string; version: number }[] => {
    const mockups: { url: string; version: number }[] = [];
    
    if (approvalData?.task.layout?.design_files) {
      const files = approvalData.task.layout.design_files as any[];
      files
        .filter((f: any) => f.url)
        .sort((a: any, b: any) => (b.version || 0) - (a.version || 0))
        .forEach((f: any) => {
          mockups.push({ url: f.url, version: f.version || 1 });
        });
    }

    if (mockups.length === 0 && approvalData?.task.design_files) {
      const files = approvalData.task.design_files as any[];
      files
        .filter((f: any) => f.url)
        .sort((a: any, b: any) => (b.version || 0) - (a.version || 0))
        .forEach((f: any) => {
          mockups.push({ url: f.url, version: f.version || 1 });
        });
    }

    return mockups;
  };

  const getAllMockups = (): { url: string; version: number }[] => {
    if (!data) return [];
    return getMockupsFromData(data);
  };

  const handleApproveMockup = (version: number) => {
    setMockupStatuses(prev => 
      prev.map(m => m.version === version ? { ...m, status: 'approved' } : m)
    );
    toast.success(`Versão ${version} aprovada!`);
  };

  const handleRejectMockup = (version: number) => {
    setMockupStatuses(prev => 
      prev.map(m => m.version === version ? { ...m, status: 'rejected' } : m)
    );
    toast.info(`Versão ${version} recusada.`);
  };

  const handleRequestChangeMockup = (version: number) => {
    setActiveChangeForm(version);
    setChangeDescription('');
    setFiles([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles = newFiles.filter(f => f.size <= 10 * 1024 * 1024);
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

  const submitChangeRequest = async (version: number) => {
    if (!data || !changeDescription.trim()) {
      toast.error('Por favor, descreva as alterações necessárias.');
      return;
    }

    setUploading(true);
    try {
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

      await supabase
        .from('change_requests')
        .insert({
          task_id: data.task_id,
          layout_id: data.layout_id,
          description: `[Versão ${version}] ${changeDescription}`,
          attachments,
          source: 'client',
          created_by: null
        });

      setMockupStatuses(prev => 
        prev.map(m => m.version === version ? { ...m, status: 'changes_requested', changeDescription } : m)
      );

      toast.success(`Solicitação de alteração para versão ${version} enviada!`);
      setActiveChangeForm(null);
      setChangeDescription('');
      setFiles([]);
    } catch (err) {
      console.error('Error requesting change:', err);
      toast.error('Erro ao enviar solicitação. Por favor, tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitAll = async () => {
    if (!data) return;
    
    const pendingCount = mockupStatuses.filter(m => m.status === 'pending').length;
    if (pendingCount > 0) {
      toast.error(`Você ainda tem ${pendingCount} versão(ões) sem decisão.`);
      return;
    }

    setSubmitting(-1);
    try {
      const approved = mockupStatuses.filter(m => m.status === 'approved');
      const rejected = mockupStatuses.filter(m => m.status === 'rejected');
      const changesRequested = mockupStatuses.filter(m => m.status === 'changes_requested');

      // Build summary
      const summary = [
        approved.length > 0 ? `✅ Aprovadas: v${approved.map(m => m.version).join(', v')}` : '',
        rejected.length > 0 ? `❌ Recusadas: v${rejected.map(m => m.version).join(', v')}` : '',
        changesRequested.length > 0 ? `🔄 Alterações: v${changesRequested.map(m => m.version).join(', v')}` : '',
      ].filter(Boolean).join(' | ');

      // Update approval link
      if (approved.length > 0 && rejected.length === 0 && changesRequested.length === 0) {
        await supabase
          .from('layout_approval_links')
          .update({ approved_at: new Date().toISOString() })
          .eq('id', data.id);
      } else if (changesRequested.length > 0 || rejected.length > 0) {
        await supabase
          .from('layout_approval_links')
          .update({ changes_requested_at: new Date().toISOString() })
          .eq('id', data.id);
      }

      // Determine task status based on majority decision
      let newStatus = data.task.status;
      if (approved.length === mockupStatuses.length) {
        newStatus = 'approved';
      } else if (changesRequested.length > 0 || rejected.length > 0) {
        newStatus = 'changes_requested';
      }

      // Update task status
      await supabase
        .from('design_tasks')
        .update({ 
          status: newStatus as any,
          ...(newStatus === 'approved' ? { client_approved_at: new Date().toISOString() } : {})
        })
        .eq('id', data.task_id);

      // Log history with detailed summary
      await supabase
        .from('design_task_history')
        .insert({
          task_id: data.task_id,
          action: 'client_feedback_submitted',
          old_status: data.task.status as any,
          new_status: newStatus as any,
          notes: `Feedback do cliente via link: ${summary}`
        });

      toast.success('Feedback enviado com sucesso!');
      setAllSubmitted(true);
    } catch (err) {
      console.error('Error submitting:', err);
      toast.error('Erro ao enviar feedback. Por favor, tente novamente.');
    } finally {
      setSubmitting(null);
    }
  };

  const getStatusBadge = (status: MockupStatus['status']) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 text-white">Aprovado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500 text-white">Recusado</Badge>;
      case 'changes_requested':
        return <Badge className="bg-amber-500 text-white">Alteração Solicitada</Badge>;
      default:
        return <Badge variant="outline">Aguardando Decisão</Badge>;
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

  const mockups = getAllMockups();

  if (allSubmitted) {
    const approved = mockupStatuses.filter(m => m.status === 'approved');
    const rejected = mockupStatuses.filter(m => m.status === 'rejected');
    const changesRequested = mockupStatuses.filter(m => m.status === 'changes_requested');

    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-4">Feedback Enviado!</h2>
              <div className="text-left space-y-2 mb-4">
                {approved.length > 0 && (
                  <p className="text-green-600">✅ Aprovadas: Versões {approved.map(m => m.version).join(', ')}</p>
                )}
                {rejected.length > 0 && (
                  <p className="text-red-600">❌ Recusadas: Versões {rejected.map(m => m.version).join(', ')}</p>
                )}
                {changesRequested.length > 0 && (
                  <p className="text-amber-600">🔄 Alterações solicitadas: Versões {changesRequested.map(m => m.version).join(', ')}</p>
                )}
              </div>
              <p className="text-muted-foreground text-sm">
                Nossa equipe foi notificada e entrará em contato em breve.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Aprovação de Layout</h1>
          <p className="text-muted-foreground">
            Avalie cada mockup individualmente: aprove, solicite alterações ou recuse
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
              <div>
                <span className="text-muted-foreground">Total de Mockups:</span>
                <p className="font-medium">{mockups.length}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Decisões Pendentes:</span>
                <p className="font-medium">{mockupStatuses.filter(m => m.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mockups Gallery with Individual Actions */}
        {mockups.length > 0 ? (
          <div className="space-y-6 mb-6">
            {mockups.map((mockup, index) => {
              const statusInfo = mockupStatuses.find(m => m.version === mockup.version);
              const currentStatus = statusInfo?.status || 'pending';
              const isShowingChangeForm = activeChangeForm === mockup.version;

              return (
                <Card key={mockup.version} className={
                  currentStatus === 'approved' ? 'border-green-500/50' :
                  currentStatus === 'rejected' ? 'border-red-500/50' :
                  currentStatus === 'changes_requested' ? 'border-amber-500/50' : ''
                }>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium bg-primary text-primary-foreground px-3 py-1 rounded-full">
                        Versão {mockup.version}
                        {index === 0 && ' (mais recente)'}
                      </span>
                      {getStatusBadge(currentStatus)}
                    </div>
                    
                    <div 
                      className="relative cursor-zoom-in group mb-4"
                      onClick={() => setZoomImage(mockup.url)}
                    >
                      <img
                        src={mockup.url}
                        alt={`Mockup versão ${mockup.version}`}
                        className="w-full h-auto rounded-lg border"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                        <ZoomIn className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    {/* Action buttons for each mockup */}
                    {currentStatus === 'pending' && !isShowingChangeForm && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => handleApproveMockup(mockup.version)}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Aprovar
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleRequestChangeMockup(mockup.version)}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Solicitar Alteração
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleRejectMockup(mockup.version)}
                        >
                          <ThumbsDown className="h-4 w-4 mr-2" />
                          Recusar
                        </Button>
                      </div>
                    )}

                    {/* Change request form */}
                    {isShowingChangeForm && (
                      <div className="space-y-4 border-t pt-4 mt-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Descreva as alterações necessárias para a versão {mockup.version}:
                          </label>
                          <Textarea
                            placeholder="Ex: Alterar a cor do logo, ajustar posição do texto..."
                            value={changeDescription}
                            onChange={(e) => setChangeDescription(e.target.value)}
                            rows={3}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Anexar imagens de referência (opcional):
                          </label>
                          <div className="border-2 border-dashed rounded-lg p-4 text-center">
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleFileSelect}
                              className="hidden"
                              id={`file-upload-${mockup.version}`}
                            />
                            <label 
                              htmlFor={`file-upload-${mockup.version}`}
                              className="cursor-pointer flex flex-col items-center gap-2"
                            >
                              <Upload className="h-8 w-8 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Clique para selecionar arquivos
                              </span>
                            </label>
                          </div>
                          
                          {files.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {files.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-muted rounded px-3 py-1">
                                  <span className="text-sm truncate">{file.name}</span>
                                  <button
                                    onClick={() => removeFile(idx)}
                                    className="text-destructive hover:text-destructive/80"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => submitChangeRequest(mockup.version)}
                            disabled={uploading || !changeDescription.trim()}
                            className="flex-1"
                          >
                            {uploading ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <MessageSquare className="h-4 w-4 mr-2" />
                            )}
                            Enviar Solicitação
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setActiveChangeForm(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Status message after decision */}
                    {currentStatus === 'approved' && (
                      <div className="bg-green-500/10 rounded-lg p-3 flex items-center gap-2 text-green-600">
                        <Check className="h-5 w-5" />
                        <span className="text-sm font-medium">Esta versão foi aprovada</span>
                      </div>
                    )}
                    {currentStatus === 'rejected' && (
                      <div className="bg-red-500/10 rounded-lg p-3 flex items-center gap-2 text-red-600">
                        <ThumbsDown className="h-5 w-5" />
                        <span className="text-sm font-medium">Esta versão foi recusada</span>
                      </div>
                    )}
                    {currentStatus === 'changes_requested' && (
                      <div className="bg-amber-500/10 rounded-lg p-3 flex items-center gap-2 text-amber-600">
                        <MessageSquare className="h-5 w-5" />
                        <span className="text-sm font-medium">Alteração solicitada</span>
                      </div>
                    )}

                    {/* Button to change decision */}
                    {currentStatus !== 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => setMockupStatuses(prev => 
                          prev.map(m => m.version === mockup.version ? { ...m, status: 'pending' } : m)
                        )}
                      >
                        Alterar decisão
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum mockup disponível</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit All Button */}
        {mockups.length > 0 && (
          <Card className="sticky bottom-4">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm">
                  <span className="text-green-600 mr-3">✅ {mockupStatuses.filter(m => m.status === 'approved').length} aprovado(s)</span>
                  <span className="text-amber-600 mr-3">🔄 {mockupStatuses.filter(m => m.status === 'changes_requested').length} alteração(ões)</span>
                  <span className="text-red-600">❌ {mockupStatuses.filter(m => m.status === 'rejected').length} recusado(s)</span>
                </div>
              </div>
              <Button
                className="w-full h-14 text-lg"
                size="lg"
                onClick={handleSubmitAll}
                disabled={submitting !== null || mockupStatuses.some(m => m.status === 'pending')}
              >
                {submitting !== null ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Check className="h-5 w-5 mr-2" />
                )}
                Enviar Feedback
              </Button>
              {mockupStatuses.some(m => m.status === 'pending') && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Defina uma decisão para todas as versões antes de enviar
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <ImageZoomModal
        isOpen={!!zoomImage}
        onClose={() => setZoomImage(null)}
        imageUrl={zoomImage || ''}
        alt="Mockup"
      />
    </div>
  );
}
