import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { DesignTask, DesignTaskHistory } from "@/types/design-task";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CustomizationViewer } from "./CustomizationViewer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Download, 
  ExternalLink, 
  Upload, 
  Check, 
  X, 
  Send,
  UserPlus,
  Trash2,
  RefreshCcw,
  Loader2
} from "lucide-react";

interface TaskDetailsDialogProps {
  task: DesignTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
}

export const TaskDetailsDialog = ({
  task,
  open,
  onOpenChange,
  onTaskUpdated,
}: TaskDetailsDialogProps) => {
  const [history, setHistory] = useState<DesignTaskHistory[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadNotes, setUploadNotes] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [uploadedPreviews, setUploadedPreviews] = useState<Array<{url: string, name: string}>>([]);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  useEffect(() => {
    if (task && open) {
      loadHistory();
    }
  }, [task, open]);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!open) {
      setUploadedPreviews([]);
      setUploadProgress("");
    }
  }, [open]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadHistory = async () => {
    if (!task) return;
    
    const { data, error } = await supabase
      .from("design_task_history")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading history:", error);
      return;
    }

    setHistory(data || []);
  };

  const handleAssignSelf = async () => {
    if (!task || !currentUser) return;

    const { error } = await supabase
      .from("design_tasks")
      .update({
        assigned_to: currentUser.id,
        assigned_at: new Date().toISOString(),
        status: 'in_progress'
      })
      .eq("id", task.id);

    if (error) {
      toast.error("Erro ao atribuir tarefa");
      return;
    }

    toast.success("Tarefa atribuída com sucesso!");
    onTaskUpdated();
  };

  const handleStatusChange = async (newStatus: DesignTask['status'], notes?: string) => {
    if (!task) return;

    const { error } = await supabase
      .from("design_tasks")
      .update({ status: newStatus })
      .eq("id", task.id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

    // Disparar webhook se o status for "awaiting_approval"
    if (newStatus === 'awaiting_approval') {
      try {
        toast.loading("Enviando para aprovação...");
        
        const { error: webhookError } = await supabase.functions.invoke('send-approval-webhook', {
          body: { task_id: task.id }
        });

        if (webhookError) {
          console.error('Erro ao enviar webhook:', webhookError);
          toast.dismiss();
          toast.warning("Status atualizado, mas houve erro ao notificar. Verifique os logs.");
        } else {
          toast.dismiss();
          toast.success("Enviado para aprovação com sucesso!");
        }
      } catch (error) {
        console.error('Erro ao chamar webhook:', error);
        toast.dismiss();
        toast.warning("Status atualizado, mas webhook falhou");
      }
    } else {
      toast.success("Status atualizado!");
    }

    toast.success("Status atualizado!");
    onTaskUpdated();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task || !e.target.files || e.target.files.length === 0) return;

    // Validação de arquivos
    const files = Array.from(e.target.files);
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.ai', '.psd', '.zip'];

    for (const file of files) {
      if (file.size > maxSize) {
        toast.error(`Arquivo ${file.name} é muito grande. Máximo: 10MB`);
        return;
      }
      
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedExtensions.includes(fileExt)) {
        toast.error(`Tipo de arquivo ${fileExt} não permitido`);
        return;
      }
    }

    setUploading(true);
    const newVersion = task.current_version + 1;

    try {
      const uploadedFiles = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Enviando ${i + 1} de ${files.length}...`);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${task.id}/v${newVersion}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('customer-logos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('customer-logos')
          .getPublicUrl(fileName);

        uploadedFiles.push({
          version: newVersion,
          url: publicUrl,
          uploaded_at: new Date().toISOString(),
          notes: uploadNotes || undefined
        });
      }

      // Gerar previews dos arquivos enviados
      const previews = uploadedFiles.map((file, idx) => ({
        url: file.url,
        name: files[idx].name
      }));
      setUploadedPreviews(prev => [...prev, ...previews]);

      const updatedFiles = [...task.design_files, ...uploadedFiles];

      const { error: updateError } = await supabase
        .from("design_tasks")
        .update({
          design_files: updatedFiles,
          current_version: newVersion
        })
        .eq("id", task.id);

      if (updateError) throw updateError;

      toast.success("Mockup enviado com sucesso!");
      setUploadNotes("");
      setUploadProgress("");
      onTaskUpdated();
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Erro ao enviar mockup");
      setUploadProgress("");
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "secondary", label: "Aguardando" },
      in_progress: { variant: "default", label: "Em Progresso" },
      awaiting_approval: { variant: "default", label: "Aguardando Aprovação" },
      approved: { variant: "default", label: "Aprovado" },
      changes_requested: { variant: "destructive", label: "Revisão Necessária" },
      completed: { variant: "default", label: "Concluído" }
    };
    return variants[status] || variants.pending;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      urgent: { variant: "destructive", label: "🔴 Urgente" },
      high: { variant: "default", label: "🟠 Alta" },
      normal: { variant: "secondary", label: "🟡 Normal" },
      low: { variant: "outline", label: "🟢 Baixa" }
    };
    return variants[priority] || variants.normal;
  };

  if (!task) return null;

  const statusBadge = getStatusBadge(task.status);
  const priorityBadge = getPriorityBadge(task.priority);
  const canUpload = task.assigned_to === currentUser?.id && 
    ['in_progress', 'changes_requested'].includes(task.status);

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        if (uploading) {
          toast.error("Aguarde o upload finalizar");
          return;
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onPointerDownOutside={(e) => {
          if (uploading) {
            e.preventDefault();
            toast.error("Aguarde o upload finalizar");
          }
        }}
        onEscapeKeyDown={(e) => {
          if (uploading) {
            e.preventDefault();
            toast.error("Aguarde o upload finalizar");
          }
        }}
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl">{task.customer_name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {task.campaign_name} • {task.quantity} unidades
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              <Badge variant={priorityBadge.variant}>{priorityBadge.label}</Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">📋 Detalhes</TabsTrigger>
            <TabsTrigger value="customization">🎨 Personalização</TabsTrigger>
            <TabsTrigger value="files">
              🎨 Enviar Mockup ({task.design_files.length})
            </TabsTrigger>
            <TabsTrigger value="history">📜 Histórico</TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-4 overflow-y-auto pr-4">
            <TabsContent value="details" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cliente</Label>
                  <p className="text-sm mt-1">{task.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{task.customer_phone}</p>
                  <p className="text-xs text-muted-foreground">{task.customer_email}</p>
                </div>

                <div>
                  <Label>Campanha</Label>
                  <p className="text-sm mt-1">{task.campaign_name}</p>
                </div>

                <div>
                  <Label>Designer Responsável</Label>
                  <p className="text-sm mt-1">
                    {task.designer_name || "Não atribuído"}
                  </p>
                </div>

                <div>
                  <Label>Prazo de Entrega</Label>
                  <p className="text-sm mt-1">
                    {task.deadline 
                      ? format(new Date(task.deadline), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      : "Não definido"}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="customization" className="mt-0">
              <CustomizationViewer data={task.customization_data} />
            </TabsContent>

            <TabsContent value="files" className="space-y-4 mt-0">
              {canUpload && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Label>Enviar Mockup para Cliente</Label>
                    <Input 
                      type="file" 
                      accept=".pdf,.png,.jpg,.jpeg,.ai,.psd,.zip"
                      onChange={handleFileUpload}
                      multiple
                      disabled={uploading}
                    />
                    <Textarea 
                      placeholder="Notas desta versão (opcional)..."
                      value={uploadNotes}
                      onChange={(e) => setUploadNotes(e.target.value)}
                      disabled={uploading}
                    />
                    {uploading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {uploadProgress}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Preview dos mockups enviados (antes de fechar o dialog) */}
              {uploadedPreviews.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <Label className="mb-3 block">Mockups Prontos para Enviar ao Cliente</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {uploadedPreviews.map((preview, idx) => (
                        <div key={idx} className="relative">
                          <img 
                            src={preview.url} 
                            alt={preview.name}
                            className="w-full h-32 object-cover rounded border cursor-pointer hover:border-primary transition-colors"
                            onClick={() => window.open(preview.url, '_blank')}
                            title="Clique para ver em tamanho completo"
                          />
                          <p className="text-xs mt-1 truncate" title={preview.name}>{preview.name}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                <Label>Mockups Enviados</Label>
                {[...task.design_files].reverse().map((file) => (
                  <Card key={`${file.version}-${file.uploaded_at}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={file.version === task.current_version ? "default" : "outline"}>
                              v{file.version} {file.version === task.current_version && "(atual)"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(file.uploaded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          {file.notes && (
                            <p className="text-sm text-muted-foreground">{file.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(file.url, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {task.design_files.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum arquivo enviado ainda
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <div className="space-y-4">
                {history.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs">
                        {item.user_initials || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-semibold">{item.user_name || 'Sistema'}</span>
                        {' '}
                        {item.notes || item.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <div>
            {/* Actions based on status */}
          </div>
          <div className="flex gap-2">
            {task.status === 'pending' && !task.assigned_to && (
              <Button onClick={handleAssignSelf}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assumir Tarefa
              </Button>
            )}
            {task.status === 'in_progress' && task.assigned_to === currentUser?.id && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button 
                        onClick={() => handleStatusChange('awaiting_approval')}
                        disabled={task.design_files.length === 0}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Enviar para Aprovação
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {task.design_files.length === 0 && (
                    <TooltipContent>
                      <p>Envie pelo menos um mockup antes de enviar para aprovação</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
            {task.status === 'awaiting_approval' && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => handleStatusChange('changes_requested')}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Solicitar Alterações
                </Button>
                <Button onClick={() => handleStatusChange('approved')}>
                  <Check className="h-4 w-4 mr-2" />
                  Aprovar
                </Button>
              </>
            )}
            {task.status === 'approved' && (
              <Button onClick={() => handleStatusChange('completed')}>
                <Send className="h-4 w-4 mr-2" />
                Enviar para Produção
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
