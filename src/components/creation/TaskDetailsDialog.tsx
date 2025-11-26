/**
 * TaskDetailsDialog - Modal de detalhes da tarefa
 * 
 * CONTEXTOS:
 * 
 * 1. ORDERS (Vendedores):
 *    - Visualizam tarefas onde needs_logo === true
 *    - Podem fazer upload do LOGO DO CLIENTE
 *    - Podem enviar tarefa para designer após upload
 *    - NÃO veem mockups ou customização detalhada
 * 
 * 2. CREATION (Designers):
 *    - Visualizam tarefas onde needs_logo !== true (ou logo já foi enviado)
 *    - Podem assumir tarefas não atribuídas
 *    - Podem fazer upload de MOCKUPS
 *    - Podem enviar para aprovação
 *    - NÃO veem nada sobre "logo do cliente não enviado"
 * 
 * IMPORTANTE: As duas páginas usam o mesmo componente mas com lógicas
 * completamente diferentes baseadas no contexto (orders vs creation).
 */

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
import { DesignTask, DesignTaskHistory, DbTaskStatus } from "@/types/design-task";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CustomizationViewer } from "./CustomizationViewer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserRole } from "@/hooks/useUserRole";
import { LogoSectionUploader } from "@/components/orders/LogoSectionUploader";
import { ChangeRequestsTab } from "./ChangeRequestsTab";
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
  Copy,
  Phone,
  AlertCircle
} from "lucide-react";

interface TaskDetailsDialogProps {
  task: DesignTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
  context?: 'orders' | 'creation';
}

export const TaskDetailsDialog = ({
  task,
  open,
  onOpenChange,
  onTaskUpdated,
  context = 'creation',
}: TaskDetailsDialogProps) => {
  const [history, setHistory] = useState<DesignTaskHistory[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadNotes, setUploadNotes] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [uploadedPreviews, setUploadedPreviews] = useState<Array<{url: string, name: string}>>([]);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoSections, setLogoSections] = useState<any[]>([]);
  const [hasUnresolvedChanges, setHasUnresolvedChanges] = useState(false);
  
  const { roles, isSalesperson, isDesigner, isSuperAdmin, isAdmin } = useUserRole();

  console.log('👤 User Roles:', { 
    roles, 
    isSalesperson, 
    isDesigner,
    isAdmin,
    isSuperAdmin
  });

  useEffect(() => {
    if (task && open) {
      loadHistory();
      checkUnresolvedChanges();
    }
  }, [task, open]);

  const checkUnresolvedChanges = async () => {
    if (!task) return;
    
    const { data, error } = await supabase
      .from("change_requests")
      .select("id")
      .eq("task_id", task.id)
      .is("resolved_at", null)
      .limit(1);

    if (!error && data) {
      setHasUnresolvedChanges(data.length > 0);
    }
  };

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!open) {
      setUploadedPreviews([]);
      setUploadProgress("");
      setLogoSections([]);
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
    onOpenChange(false); // ✅ Fecha o modal para forçar recarregamento ao reabrir
  };

  const handleStatusChange = async (newStatus: DbTaskStatus, notes?: string) => {
    if (!task) return;

    console.log('🔄 Tentando atualizar status:', { 
      taskId: task.id, 
      currentStatus: task.status, 
      newStatus,
      createdBy: task.created_by,
      assignedTo: task.assigned_to,
      isSalesperson,
      isDesigner,
      isAdmin,
      isSuperAdmin,
      currentUserId: currentUser?.id
    });

    const { error } = await supabase
      .from("design_tasks")
      .update({ status: newStatus })
      .eq("id", task.id);

    if (error) {
      console.error("❌ Erro ao atualizar status:", error);
      console.error("❌ Detalhes do erro:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      toast.error(`Erro ao atualizar status: ${error.message}`);
      return;
    }

    console.log('✅ Status atualizado com sucesso!');

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
    onOpenChange(false); // ✅ Fecha o modal para forçar recarregamento ao reabrir
  };

  const handleSendToDesigner = async () => {
    // Validar se todas as logos obrigatórias foram selecionadas
    const requiredSections = logoSections.filter(s => s.required);
    const allFilled = requiredSections.every(s => s.file !== null);
    
    if (!allFilled) {
      toast.error("Selecione todas as logos obrigatórias antes de enviar");
      return;
    }
    
    if (!task || !task.lead_id || !task.order_id) {
      toast.error("Dados da tarefa incompletos");
      return;
    }
    
    if (!currentUser) {
      toast.error("Usuário não autenticado");
      return;
    }

    setLogoUploading(true);
    try {
      // Upload de todas as logos e construir customization_data atualizado
      const uploadedUrls: Record<string, string> = {};
      
      for (const section of logoSections) {
        if (section.file) {
          const fileExt = section.file.name.split('.').pop();
          const fileName = `${task.lead_id}_${section.id}_${Date.now()}.${fileExt}`;
          const filePath = `logos/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('customer-logos')
            .upload(filePath, section.file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('customer-logos')
            .getPublicUrl(filePath);

          uploadedUrls[section.fieldPath] = publicUrl;
        }
      }

      // Buscar customization_data atual do pedido
      const { data: orderData, error: orderFetchError } = await supabase
        .from('orders')
        .select('customization_data')
        .eq('id', task.order_id)
        .single();

      if (orderFetchError || !orderData) throw new Error("Erro ao buscar dados do pedido");

      // Atualizar customization_data com as URLs das logos
      const updatedCustomization = { ...(orderData.customization_data as any) };
      
      for (const [path, url] of Object.entries(uploadedUrls)) {
        const keys = path.split('.');
        let current = updatedCustomization;
        
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = url;
      }

      // Atualizar pedido com customization_data atualizado
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({ customization_data: updatedCustomization })
        .eq('id', task.order_id);

      if (orderUpdateError) throw orderUpdateError;

      // Atualizar lead
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          needs_logo: false,
          salesperson_status: 'sent_to_designer'
        })
        .eq('id', task.lead_id);

      if (leadError) throw leadError;

      // Atualizar design task
      const { error: taskError } = await supabase
        .from('design_tasks')
        .update({
          status: 'pending'
        })
        .eq('id', task.id);

      if (taskError) throw taskError;

      // Adicionar histórico
      await supabase
        .from('design_task_history')
        .insert([{
          task_id: task.id,
          user_id: currentUser.id,
          action: 'sent_to_designer',
          old_status: task.status as DbTaskStatus,
          new_status: 'pending' as DbTaskStatus,
          notes: `${logoSections.length} logo(s) enviada(s). Tarefa encaminhada para o designer.`
        }]);

      toast.success("Logos enviadas! Tarefa encaminhada para o designer.");
      setLogoSections([]);
      onTaskUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending to designer:", error);
      toast.error("Erro ao enviar para designer");
    } finally {
      setLogoUploading(false);
    }
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
    onOpenChange(false);
    onTaskUpdated(); // ✅ Garante ordem correta
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

  const handlePriorityChange = async (newPriority: "low" | "normal" | "high" | "urgent") => {
    if (!task) return;

    const { error } = await supabase
      .from("design_tasks")
      .update({ priority: newPriority })
      .eq("id", task.id);

    if (error) {
      toast.error("Erro ao atualizar prioridade");
      return;
    }

    toast.success("Prioridade atualizada!");
    onTaskUpdated();
  };

  if (!task) return null;

  const statusBadge = getStatusBadge(task.status);
  const priorityBadge = getPriorityBadge(task.priority);
  
  // Identificar contexto do vendedor (precisa de logo e ainda não foi enviado)
  const isVendorContext = (isSalesperson || isSuperAdmin || isAdmin) && 
                          context === 'orders' && 
                          task?.needs_logo === true;
  
  console.log('🔍 TaskDetailsDialog Debug:', {
    context,
    isSalesperson,
    isDesigner,
    needs_logo: task?.needs_logo,
    isVendorContext,
    currentUserId: currentUser?.id,
    taskCreatedBy: task?.created_by,
    taskAssignedTo: task?.assigned_to,
    taskStatus: task?.status,
    uploaded_logo_url: task?.uploaded_logo_url
  });
  
  // Verificações de permissões
  const isTaskCreator = task?.created_by === currentUser?.id;
  const isAssignedDesigner = task?.assigned_to === currentUser?.id;
  
  // ✅ PERMITIR assumir tarefas em 'pending' que não têm designer E não precisam de logo
  const canAssign = task?.status === 'pending' && 
                    !task?.assigned_to && 
                    !task?.needs_logo && // Não permitir assumir tarefas que ainda precisam de logo
                    isDesigner &&
                    context === 'creation';
  
  // ✅ FASE 2: Corrigir lógica de upload - permitir qualquer designer na tarefa in_progress
  const canUpload = (task?.status === 'in_progress' || task?.status === 'changes_requested') &&
                   isDesigner &&
                   context === 'creation' &&
                   !isVendorContext;
  
  // ✅ FASE 5: Log de debug detalhado
  console.log('🎯 Permissões Debug (DETALHADO):', {
    // Permissões
    canAssign,
    canUpload,
    canSendApproval: isAssignedDesigner && task?.status === 'in_progress',
    
    // Estado da tarefa
    taskId: task?.id,
    status: task?.status,
    assigned_to: task?.assigned_to,
    needs_logo: task?.needs_logo,
    
    // Dados do usuário
    currentUserId: currentUser?.id,
    isDesigner,
    isSalesperson,
    isAssignedDesigner,
    
    // Contexto
    context,
    isVendorContext,
    
    // Dados relevantes
    uploaded_logo_url: task?.uploaded_logo_url ? 'EXISTS' : 'NULL',
    design_files_count: task?.design_files?.length || 0,
    
    // Cálculos de permissão
    uploadPermissionBreakdown: {
      statusOK: task?.status === 'in_progress' || task?.status === 'changes_requested',
      isDesignerOK: isDesigner,
      contextOK: context === 'creation',
      notVendorContextOK: !isVendorContext,
    }
  });
  const canSendApproval = isAssignedDesigner && 
                         task?.status === 'in_progress';
  const canRequestChanges = isAssignedDesigner && 
                           task?.status === 'awaiting_approval';
  const canApprove = isAssignedDesigner && 
                    task?.status === 'awaiting_approval';
  const canSendProduction = isAssignedDesigner && 
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
              <DialogTitle className="text-xl">
                {isVendorContext ? 'Upload de Logo - ' : ''}{task.customer_name}
              </DialogTitle>
              {!isVendorContext && (
                <p className="text-sm text-muted-foreground mt-1">
                  {task.campaign_name} • {task.quantity} unidades
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {isVendorContext && task.customer_phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const phone = task.customer_phone?.replace(/\D/g, '');
                    window.open(`https://wa.me/55${phone}`, '_blank');
                  }}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Chamar no WhatsApp
                </Button>
              )}
              {!isVendorContext && (
                <>
                  <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                  <Badge variant={priorityBadge.variant}>{priorityBadge.label}</Badge>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {isVendorContext ? (
          // INTERFACE DE UPLOAD POR SEÇÃO PARA VENDEDOR
          <div className="space-y-6 p-6 flex-1 overflow-y-auto">
            {/* Informações Básicas */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Upload das Logos do Cliente</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Cliente:</span>
                  <p className="font-medium">{task.customer_name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Campanha:</span>
                  <p className="font-medium">{task.campaign_name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Quantidade:</span>
                  <p className="font-medium">{task.quantity || 'N/A'} unidades</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Modelo:</span>
                  <p className="font-medium">{task.model_name || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Componente de Upload por Seção */}
            <LogoSectionUploader 
              customizationData={task.customization_data}
              onAllLogosReady={(sections) => {
                setLogoSections(sections);
              }}
              onLogoChange={(sections) => {
                setLogoSections(sections);
              }}
              currentSections={logoSections}
            />
          </div>
        ) : (
          // INTERFACE COMPLETA DO DESIGNER
          <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-5">
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
              <TabsTrigger value="changes">
                <AlertCircle className="h-4 w-4 mr-2" />
                Alterações
                {hasUnresolvedChanges && (
                  <span className="ml-1 flex h-2 w-2 rounded-full bg-red-600" />
                )}
              </TabsTrigger>
              <TabsTrigger value="history">
                <HistoryIcon className="h-4 w-4 mr-2" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-4 overflow-y-auto pr-4">
              <TabsContent value="details" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-6">
                {/* ✅ FASE 1: Seção "Logo do Cliente" REMOVIDA do contexto designer */}
                {/* Designers só veem as informações do cliente e pedido, não precisam saber sobre logo */}

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
                    
                    {/* 🆕 Prioridade editável */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Prioridade</Label>
                      <Select 
                        value={task.priority}
                        onValueChange={handlePriorityChange}
                        disabled={!isSuperAdmin && !isAdmin && !isAssignedDesigner}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">🟢 Baixa</SelectItem>
                          <SelectItem value="normal">🟡 Normal</SelectItem>
                          <SelectItem value="high">🟠 Alta</SelectItem>
                          <SelectItem value="urgent">🔴 Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* 🆕 FASE 6: Exibir nome do criador/vendedor */}
                    {task.creator_name && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Criado por</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                            Vendedor
                          </Badge>
                          <p className="text-sm font-medium">
                            {task.creator_name}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 🆕 FASE 6: Logo do Cliente (se enviada) */}
                {task.uploaded_logo_url && (
                  <Card className="col-span-2">
                    <CardContent className="p-4 space-y-2">
                      <Label className="text-xs text-muted-foreground font-semibold">Logo do Cliente</Label>
                      <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden border flex items-center justify-center">
                        <img 
                          src={task.uploaded_logo_url} 
                          alt="Logo enviado"
                          className="max-w-full max-h-full object-contain p-2"
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(task.uploaded_logo_url!, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar Logo Original
                      </Button>
                    </CardContent>
                  </Card>
                )}

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
              {isVendorContext ? (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-2">
                        <Label>Upload do Logo do Cliente</Label>
                        <p className="text-sm text-muted-foreground">
                          Faça o upload do logo do cliente para encaminhar a tarefa ao designer.
                        </p>
                      </div>
                      <Input 
                        type="file" 
                        accept=".png,.jpg,.jpeg,.svg,.ai,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              toast.error("Arquivo muito grande. Máximo: 10MB");
                              return;
                            }
                            setLogoFile(file);
                            toast.success("Logo selecionado!");
                          }
                        }}
                        disabled={logoUploading}
                      />
                      {logoFile && (
                        <div className="flex items-center gap-2 p-3 bg-accent rounded-md">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">{logoFile.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLogoFile(null)}
                            disabled={logoUploading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* ✅ FASE 3: Preview do logo enviado (apenas para vendedores) */}
                  {task.uploaded_logo_url && (
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <Label className="text-sm font-medium">Logo Enviado</Label>
                        <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden border">
                          <img 
                            src={task.uploaded_logo_url} 
                            alt="Logo enviado"
                            className="w-full h-full object-contain p-4"
                          />
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full"
                          onClick={() => window.open(task.uploaded_logo_url!, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Baixar Logo Enviado
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <CustomizationViewer data={task.customization_data} />
              )}
            </TabsContent>

            <TabsContent value="files" className="space-y-4 mt-0">
              {/* ✅ FASE 4: Melhor feedback visual do upload de mockup */}
              {canUpload && (
                <Card className="border-2 border-dashed hover:border-primary transition-colors">
                  <CardContent className="p-6 space-y-4">
                    <div className="text-center space-y-2">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <Label htmlFor="mockup-upload" className="text-lg font-medium cursor-pointer">
                        Enviar Mockup para Cliente
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        PDF, PNG, JPG, AI, PSD ou ZIP • Múltiplos arquivos permitidos • Máximo 10MB cada
                      </p>
                    </div>
                    
                    <Input 
                      id="mockup-upload"
                      type="file" 
                      accept=".pdf,.png,.jpg,.jpeg,.ai,.psd,.zip"
                      onChange={handleFileUpload}
                      multiple
                      disabled={uploading}
                      className="cursor-pointer"
                    />
                    
                    <Textarea 
                      placeholder="Notas desta versão (opcional)..."
                      value={uploadNotes}
                      onChange={(e) => setUploadNotes(e.target.value)}
                      disabled={uploading}
                      className="min-h-[80px]"
                    />
                    
                    {uploading && (
                      <div className="flex items-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="font-medium">{uploadProgress}</span>
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

            <TabsContent value="changes" className="mt-0">
              <ChangeRequestsTab 
                taskId={task.id} 
                onChangeRequestAdded={checkUnresolvedChanges}
              />
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
        )}

        <div className="flex justify-center pt-4 border-t">
          {isVendorContext ? (
            // VENDEDOR - Botão de enviar para designer
            <Button 
              onClick={handleSendToDesigner}
              disabled={
                logoUploading || 
                logoSections.length === 0 ||
                !logoSections.filter(s => s.required).every(s => s.file !== null)
              }
              size="lg"
              className="w-full max-w-md"
            >
              {logoUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando logos...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar para Designer
                  {logoSections.length > 0 && (
                    <span className="ml-2 text-xs opacity-75">
                      ({logoSections.filter(s => s.file).length}/{logoSections.length})
                    </span>
                  )}
                </>
              )}
            </Button>
          ) : (
            // DESIGNER - Footer com todos os botões
            <div className="flex justify-between w-full">
              <div>
                {(isSuperAdmin || isAdmin || isDesigner) && (
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteTask}
                    disabled={uploading || logoUploading}
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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button 
                            variant="outline"
                            onClick={() => handleStatusChange('changes_requested')}
                            disabled={!hasUnresolvedChanges}
                          >
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            Solicitar Alterações
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!hasUnresolvedChanges && (
                        <TooltipContent>
                          <p>Adicione uma solicitação de alteração na aba "Alterações"</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
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

                {/* Botões para Vendedores (quando não é needs_logo) */}
                {canSalespersonRequestChanges && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button 
                            variant="outline"
                            onClick={() => handleStatusChange('changes_requested', 'Cliente solicitou alterações')}
                            disabled={!hasUnresolvedChanges}
                          >
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            Solicitar Alterações
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!hasUnresolvedChanges && (
                        <TooltipContent>
                          <p>Adicione uma solicitação de alteração na aba "Alterações"</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {canSalespersonApprove && (
                  <Button onClick={() => handleStatusChange('approved', 'Mockup aprovado pelo vendedor')}>
                    <Check className="h-4 w-4 mr-2" />
                    Aprovar Mockup
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
