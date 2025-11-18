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
  Loader2,
  FileText,
  Palette,
  History as HistoryIcon,
  Copy
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
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    if (task && open) {
      loadHistory();
      checkUserRole();
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

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    setUserRole(roleData?.role || '');
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

    // Se foi criado por vendedor e está indo para aprovação, atualizar lead ao invés de webhook
    if (task.created_by_salesperson && newStatus === 'awaiting_approval') {
      const { error: leadError } = await supabase
        .from("leads")
        .update({ salesperson_status: 'awaiting_final_confirmation' })
        .eq("id", task.lead_id);

      if (leadError) {
        console.error("Error updating lead:", leadError);
      }

      toast.success("Status atualizado! Aguardando confirmação do vendedor.");
      onTaskUpdated();
      return;
    }

    // Disparar webhook se o status for "awaiting_approval" e NÃO foi criado por vendedor
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

  const handleDeleteTask = async () => {
    if (!task) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a tarefa de ${task.customer_name}? Esta ação não pode ser desfeita.`
    );
    
    if (!confirmed) return;

    const { error } = await supabase
      .from('design_tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', task.id);

    if (error) {
      toast.error('Erro ao excluir tarefa');
      console.error(error);
      return;
    }

    toast.success('Tarefa excluída com sucesso');
    onTaskUpdated();
    onOpenChange(false);
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
  
  // Verificações de permissões
  const isDesigner = task?.assigned_to === currentUser?.id;
  const isSalesperson = userRole === 'salesperson';
  const isTaskCreator = task?.created_by === currentUser?.id;
  
  const canAssign = task?.status === 'pending' && !task?.assigned_to;
  const canUpload = isDesigner && 
                   task?.status !== 'completed' && 
                   task?.status !== 'approved';
  const canSendApproval = isDesigner && 
                         task?.status === 'in_progress';
  const canRequestChanges = isDesigner && 
                           task?.status === 'awaiting_approval';
  const canApprove = isDesigner && 
                    task?.status === 'awaiting_approval';
  const canSendProduction = isDesigner && 
                           task?.status === 'approved';
  
  // Permissões para vendedores
  const canSalespersonApprove = isSalesperson && 
                                isTaskCreator && 
                                task?.status === 'awaiting_approval';
  const canSalespersonRequestChanges = isSalesperson && 
                                       isTaskCreator && 
                                       task?.status === 'awaiting_approval';

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
            <TabsTrigger value="details">
              <FileText className="h-4 w-4 mr-2" />
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="customization">
              <Palette className="h-4 w-4 mr-2" />
              Personalização
            </TabsTrigger>
            <TabsTrigger value="files">
              <Upload className="h-4 w-4 mr-2" />
              Enviar Mockup ({task.design_files.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              <HistoryIcon className="h-4 w-4 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-4 overflow-y-auto pr-4">
            <TabsContent value="details" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-6">
                {/* COLUNA 1: Informações do Cliente */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold text-sm">Informações do Cliente</h3>
                    <div>
                      <Label className="text-xs text-muted-foreground">Nome</Label>
                      <p className="text-sm font-medium">{task.customer_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Telefone</Label>
                      <div className="flex items-center gap-2">
                        <p className="text-sm flex-1">{task.customer_phone}</p>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(task.customer_phone);
                            toast.success("Telefone copiado!");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <div className="flex items-center gap-2">
                        <p className="text-sm flex-1 truncate">{task.customer_email}</p>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(task.customer_email);
                            toast.success("Email copiado!");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* COLUNA 2: Informações do Pedido */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold text-sm">Informações do Pedido</h3>
                    <div>
                      <Label className="text-xs text-muted-foreground">Campanha</Label>
                      <p className="text-sm font-medium">{task.campaign_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Modelo</Label>
                      <p className="text-sm">{task.model_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Código do Produto</Label>
                      <p className="text-sm font-mono">{task.model_code || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Quantidade</Label>
                      <p className="text-sm">{task.quantity} unidades</p>
                    </div>
                  </CardContent>
                </Card>

                {/* COLUNA 3: Designer Responsável (largura total) */}
                <Card className="col-span-2">
                  <CardContent className="p-4">
                    <Label className="text-xs text-muted-foreground">Designer Responsável</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{task.designer_initials || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {task.designer_name || "Não atribuído"}
                        </p>
                        {task.assigned_at && (
                          <p className="text-xs text-muted-foreground">
                            Atribuído {format(new Date(task.assigned_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={file.version === task.current_version ? "default" : "outline"}>
                            v{file.version} {file.version === task.current_version && "(atual)"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(file.uploaded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Baixar
                        </Button>
                      </div>

                      {/* Preview Visual do Mockup */}
                      <div 
                        className="relative w-full h-48 bg-muted rounded-lg overflow-hidden cursor-pointer group"
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        <img 
                          src={file.url} 
                          alt={`Mockup v${file.version}`}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = '<div class="flex items-center justify-center h-full"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></div>';
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <ExternalLink className="h-8 w-8 text-white" />
                        </div>
                      </div>

                      {file.notes && (
                        <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          <strong>Notas:</strong> {file.notes}
                        </p>
                      )}
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
            {(userRole === 'super_admin' || userRole === 'admin' || isDesigner) && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteTask}
                disabled={uploading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Tarefa
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {canAssign && (
              <Button onClick={handleAssignSelf}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assumir Tarefa
              </Button>
            )}
            
            {canSendApproval && (
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
            
            {canRequestChanges && !canSalespersonRequestChanges && (
              <Button 
                variant="outline"
                onClick={() => handleStatusChange('changes_requested')}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Solicitar Alterações
              </Button>
            )}
            
            {canApprove && !canSalespersonApprove && (
              <Button onClick={() => handleStatusChange('approved')}>
                <Check className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
            )}
            
            {canSendProduction && (
              <Button onClick={() => handleStatusChange('completed')}>
                <Send className="h-4 w-4 mr-2" />
                Enviar para Produção
              </Button>
            )}

            {/* Botões para Vendedores */}
            {canSalespersonRequestChanges && (
              <Button 
                variant="outline"
                onClick={() => handleStatusChange('changes_requested', 'Cliente solicitou alterações')}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Solicitar Alterações
              </Button>
            )}
            
            {canSalespersonApprove && (
              <Button onClick={() => handleStatusChange('approved', 'Mockup aprovado pelo vendedor')}>
                <Check className="h-4 w-4 mr-2" />
                Aprovar Mockup
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
