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
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useUserRole } from "@/hooks/useUserRole";
import { LogoSectionUploader } from "@/components/orders/LogoSectionUploader";
import { ChangeRequestsTab } from "./ChangeRequestsTab";
import { DeleteReasonDialog } from "../orders/DeleteReasonDialog";
import { RejectTaskDialog } from "./RejectTaskDialog";
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
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Eye,
  ArrowRightLeft,
  Edit,
  Receipt
} from "lucide-react";
import { ModificationRequestDialog } from "@/components/orders/ModificationRequestDialog";
import { PriorityChangeRequestDialog } from "@/components/orders/PriorityChangeRequestDialog";
import { BusinessSegmentField } from "./BusinessSegmentField";
import { extractUniformType } from "@/lib/utils";
import { MockupVersionSelectorModal } from "./MockupVersionSelectorModal";
import { QuoteSection } from "@/components/quotes/QuoteSection";

interface TaskDetailsDialogProps {
  task: DesignTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
  context?: 'orders' | 'creation';
  isEditingRejected?: boolean;
}

export const TaskDetailsDialog = ({
  task,
  open,
  onOpenChange,
  onTaskUpdated,
  context = 'creation',
  isEditingRejected = false,
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
  const [selectedApprovedMockups, setSelectedApprovedMockups] = useState<Set<string>>(new Set());
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [designers, setDesigners] = useState<Array<{id: string, full_name: string}>>([]);
  const [selectedDesigner, setSelectedDesigner] = useState<string>("");
  const [transferring, setTransferring] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showModificationDialog, setShowModificationDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [sendingLayout, setSendingLayout] = useState(false);
  const [orderInfoExpanded, setOrderInfoExpanded] = useState(true);
  const [alteracoesExpanded, setAlteracoesExpanded] = useState(true);
  const [showVersionSelector, setShowVersionSelector] = useState(false);
  const [showPriorityChangeDialog, setShowPriorityChangeDialog] = useState(false);
  const [requestedPriority, setRequestedPriority] = useState<"normal" | "urgent">("urgent");
  
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
      setPendingFiles([]);
      setUploadNotes("");
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

    // Buscar nomes dos usuários que têm user_id
    const userIds = data?.map(item => item.user_id).filter(Boolean) || [];
    const uniqueUserIds = [...new Set(userIds)];
    
    let usersMap: Record<string, any> = {};
    
    if (uniqueUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", uniqueUserIds);
      
      if (profiles) {
        usersMap = profiles.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    // Mapear os dados para incluir nome e iniciais do usuário
    const historyWithNames = data?.map(item => {
      const userProfile = item.user_id ? usersMap[item.user_id] : null;
      return {
        ...item,
        user_name: userProfile?.full_name || null,
        user_initials: userProfile?.full_name 
          ? userProfile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() 
          : null
      };
    }) || [];

    setHistory(historyWithNames);
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

    // ✅ Inserir manualmente no histórico ANTES de atualizar o status
    if (currentUser?.id) {
      await supabase
        .from("design_task_history")
        .insert([{
          task_id: task.id,
          user_id: currentUser.id,
          action: 'status_changed',
          old_status: task.status as DbTaskStatus,
          new_status: newStatus,
          notes: notes || null
        }]);
    }

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
      let primaryLogoUrl: string | null = null;
      
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
          
          // Guardar a primeira URL como logo principal
          if (!primaryLogoUrl) {
            primaryLogoUrl = publicUrl;
          }
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

      // 🆕 Se estamos no modo forceShowUpload (tarefa rejeitada), 
      // garantir que front.logoType seja 'custom' para exibir a logo
      if (isEditingRejected && primaryLogoUrl) {
        if (!updatedCustomization.front) {
          updatedCustomization.front = {};
        }
        updatedCustomization.front.logoType = 'custom';
        updatedCustomization.front.logoUrl = primaryLogoUrl;
      }

      // Atualizar pedido com customization_data atualizado
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({ customization_data: updatedCustomization })
        .eq('id', task.order_id);

      if (orderUpdateError) throw orderUpdateError;

      // 🆕 Atualizar lead com a URL da logo e remover status de rejeitado
      const leadUpdateData: any = {
        needs_logo: false,
        salesperson_status: 'sent_to_designer'
      };
      
      if (primaryLogoUrl) {
        leadUpdateData.uploaded_logo_url = primaryLogoUrl;
        leadUpdateData.logo_action = null; // Logo já foi enviada, não precisa mais de ação
      }

      const { error: leadError } = await supabase
        .from('leads')
        .update(leadUpdateData)
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

      // 🆕 Se for tarefa rejeitada, marcar rejeição como resolvida
      if (isEditingRejected) {
        await supabase
          .from('task_rejections')
          .update({ 
            resolved: true, 
            resolved_at: new Date().toISOString(),
            resolved_by: currentUser.id
          })
          .eq('task_id', task.id)
          .eq('resolved', false);
      }

      // Adicionar histórico
      await supabase
        .from('design_task_history')
        .insert([{
          task_id: task.id,
          user_id: currentUser.id,
          action: isEditingRejected ? 'resent_after_rejection' : 'sent_to_designer',
          old_status: task.status as DbTaskStatus,
          new_status: 'pending' as DbTaskStatus,
          notes: isEditingRejected 
            ? `Nova logo enviada após rejeição. Tarefa reenviada para o designer.`
            : `${logoSections.length} logo(s) enviada(s). Tarefa encaminhada para o designer.`
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

  const handleDeleteTask = () => {
    setShowDeleteDialog(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    // Validação de arquivos - aceita TODOS os tipos, apenas limita tamanho
    const files = Array.from(e.target.files);
    const maxSize = 50 * 1024 * 1024; // 50MB

    for (const file of files) {
      if (file.size > maxSize) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        toast.error(`Arquivo ${file.name} muito grande (${sizeMB}MB). Máximo: 50MB`);
        e.target.value = '';
        return;
      }
    }

    // Apenas armazenar arquivos localmente sem fazer upload
    setPendingFiles(files);
    toast.success(`${files.length} arquivo(s) selecionado(s). Adicione notas e clique em "Enviar Mockup".`);
    
    // Limpar o input para permitir selecionar os mesmos arquivos novamente se necessário
    e.target.value = '';
  };

  const handleSubmitMockup = async () => {
    if (!task || pendingFiles.length === 0) return;

    setUploading(true);
    const newVersion = task.current_version + 1;

    try {
      const uploadedFiles = [];

      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        setUploadProgress(`Enviando ${i + 1} de ${pendingFiles.length}...`);
        
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
          notes: uploadNotes || undefined,
          is_revision: task.status === 'changes_requested'
        });
      }

      // Gerar previews dos arquivos enviados
      const previews = uploadedFiles.map((file, idx) => ({
        url: file.url,
        name: pendingFiles[idx].name
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
      setPendingFiles([]);
      onTaskUpdated();
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Erro ao enviar mockup");
      setUploadProgress("");
    } finally {
      setUploading(false);
    }
  };

  // Open version selector modal
  const handleSendLayoutToClientClick = () => {
    if (!task || !currentUser) return;

    // Validation
    if (!task.customer_phone) {
      toast.error('Cliente não possui WhatsApp cadastrado');
      return;
    }

    if (task.design_files.length === 0) {
      toast.error('Nenhum mockup foi enviado ainda');
      return;
    }

    // Open modal to select versions
    setShowVersionSelector(true);
  };

  // Send selected versions to client
  const handleSendLayoutToClient = async (selectedFiles: any[]) => {
    if (!task || !currentUser) return;

    setShowVersionSelector(false);
    setSendingLayout(true);

    try {
      // Get current user profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUser.id)
        .single();

      // Prepare mockups data from SELECTED files only
      const mockupsData = selectedFiles.map(file => ({
        file_name: `mockup_v${file.version}.png`,
        file_url: file.url,
        file_size: 'N/A',
        uploaded_at: file.uploaded_at,
        uploaded_by: task.designer_name || 'Designer'
      }));

      // Get unique versions sent
      const versionsSent = [...new Set(selectedFiles.map(f => f.version))].sort((a, b) => b - a);

      // Build webhook payload
      const webhookPayload = {
        event: "envio_layout",
        card_id: task.id,
        card_data: {
          id: task.id,
          customer_name: task.customer_name || '',
          customer_phone: task.customer_phone || '',
          customer_email: task.customer_email || null,
          segment: task.campaign_name || '',
          product_model: task.model_name || '',
          product_code: task.model_code || '',
          quantity: `${task.quantity || 0} unidades`,
          priority: task.priority || 'normal',
          version: `v${task.current_version}`,
          salesperson: task.creator_name || '',
          designer: task.designer_name || '',
          created_at: task.created_at,
          status: task.status,
          column: task.status,
        },
        personalization: {
          needs_logo_creation: task.needs_logo || false,
          client_logo_description: task.logo_description || '',
          frente: task.customization_data?.front || {},
          costas: task.customization_data?.back || {},
          mangas: task.customization_data?.sleeves || {}
        },
        mockups: mockupsData,
        sent_by: {
          user_id: currentUser.id,
          user_name: userProfile?.full_name || 'Usuário',
          user_role: isDesigner ? 'Designer' : 'Vendedor'
        },
        timestamp: new Date().toISOString()
      };

      console.log('[WEBHOOK] Sending layout to client:', {
        cardId: task.id,
        customer: task.customer_name,
        phone: task.customer_phone,
        mockupsCount: mockupsData.length
      });

      // Send webhook via Edge Function (to avoid CORS issues)
      const { data, error } = await supabase.functions.invoke('send-layout-webhook', {
        body: webhookPayload
      });

      if (error) {
        console.error('[WEBHOOK] Edge function error:', error);
        throw new Error(error.message || 'Edge function failed');
      }

      if (!data?.success) {
        console.error('[WEBHOOK] Webhook failed:', data?.error);
        throw new Error(data?.error || 'Webhook failed');
      }

      console.log('[WEBHOOK] Layout sent successfully:', {
        cardId: task.id,
        response: data,
        sentAt: new Date().toISOString()
      });

      // Add history entry
      await supabase.from('design_task_history').insert({
        task_id: task.id,
        user_id: currentUser.id,
        action: 'layout_sent',
        notes: `📱 Layout enviado para o cliente via WhatsApp - Versões: ${versionsSent.map(v => `v${v}`).join(', ')} (${mockupsData.length} arquivo(s))`
      });

      toast.success(`Layout enviado! Versões: ${versionsSent.map(v => `v${v}`).join(', ')}`);
      onTaskUpdated();
      
    } catch (error: any) {
      console.error('[WEBHOOK] Send layout error:', error);

      if (error.name === 'AbortError') {
        toast.error('Tempo esgotado. Tente novamente.');
      } else {
        toast.error('Erro ao enviar layout. Tente novamente.');
      }
    } finally {
      setSendingLayout(false);
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
      normal: { variant: "secondary", label: "🟡 Normal" }
    };
    return variants[priority] || variants.normal;
  };

  const handlePriorityChange = async (newPriority: "normal" | "urgent") => {
    if (!task) return;

    // Se for vendedor (e não admin/super admin), abrir dialog de solicitação
    if (isSalesperson && !isSuperAdmin && !isAdmin) {
      setRequestedPriority(newPriority);
      setShowPriorityChangeDialog(true);
      return;
    }

    // Admin/Super Admin pode alterar diretamente
    const { error } = await supabase
      .from("design_tasks")
      .update({ priority: newPriority })
      .eq("id", task.id);

    if (error) {
      toast.error("Erro ao atualizar prioridade");
      return;
    }

    // Add to history
    await supabase.from("design_task_history").insert({
      task_id: task.id,
      user_id: currentUser?.id,
      action: "priority_changed",
      notes: `Prioridade alterada para ${newPriority === "urgent" ? "Urgente" : "Normal"}`,
    });

    toast.success("Prioridade atualizada!");
    onTaskUpdated();
  };

  const loadDesigners = async () => {
    // Buscar todos os usuários com role designer
    const { data: designerRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'designer');

    if (rolesError) {
      console.error('Error loading designers:', rolesError);
      return;
    }

    if (!designerRoles || designerRoles.length === 0) {
      toast.error("Nenhum designer encontrado");
      return;
    }

    const designerIds = designerRoles.map(r => r.user_id);

    // Buscar perfis dos designers
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', designerIds);

    if (profilesError) {
      console.error('Error loading designer profiles:', profilesError);
      return;
    }

    // Filtrar o designer atual (não pode transferir para si mesmo)
    const filteredDesigners = (profiles || []).filter(d => d.id !== currentUser?.id);
    setDesigners(filteredDesigners);
  };

  const handleTransferTask = async () => {
    if (!task || !selectedDesigner) return;
    
    setTransferring(true);
    try {
      const { error } = await supabase
        .from("design_tasks")
        .update({
          assigned_to: selectedDesigner,
          assigned_at: new Date().toISOString()
        })
        .eq("id", task.id);

      if (error) throw error;

      // Registrar no histórico
      const designerName = designers.find(d => d.id === selectedDesigner)?.full_name || 'Designer';
      await supabase.from("design_task_history").insert({
        task_id: task.id,
        user_id: currentUser?.id,
        action: 'transfer',
        notes: `Tarefa transferida para ${designerName}`
      });

      toast.success("Tarefa transferida com sucesso!");
      setShowTransferDialog(false);
      setSelectedDesigner("");
      onTaskUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error transferring task:', error);
      toast.error("Erro ao transferir tarefa");
    } finally {
      setTransferring(false);
    }
  };

  if (!task) return null;

  const statusBadge = getStatusBadge(task.status);
  const priorityBadge = getPriorityBadge(task.priority);
  
  // Identificar contexto do vendedor (precisa de logo e ainda não foi enviado OU editando tarefa rejeitada)
  const isVendorContext = (isSalesperson || isSuperAdmin || isAdmin) && 
                          context === 'orders' && 
                          (task?.needs_logo === true || isEditingRejected);
  
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
  
  // Super Admin tem acesso total a todas as funções
  const hasFullAccess = isSuperAdmin || isAdmin;
  
  // Só bloquear quando está aguardando o cliente enviar a logo ("Vou enviar depois")
  const isWaitingClientLogo = task?.logo_action === 'waiting_client';
  
  // Pode assumir: Designer ou Admin/SuperAdmin (Admin bypassa restrição de logo)
  const canAssign = task?.status === 'pending' && 
                    !task?.assigned_to && 
                    (hasFullAccess || (!isWaitingClientLogo && isDesigner)) &&
                    context === 'creation';
  
  // Pode fazer upload: Designer atribuído ou Admin/SuperAdmin (quando status permite)
  const canUpload = (task?.status === 'in_progress' || task?.status === 'changes_requested' || 
                    (hasFullAccess && task?.status === 'pending')) &&
                   (isDesigner || hasFullAccess) &&
                   context === 'creation' &&
                   !isVendorContext;
  
  // Verificar se há mockups com client_approved para exibir colapsados
  const hasApprovedMockups = task?.design_files?.some(file => file.client_approved === true) || false;
  const showCollapsedView = (task?.status === 'approved' || task?.status === 'completed') && hasApprovedMockups;
  
  // ✅ FASE 5: Log de debug detalhado
  console.log('🎯 Permissões Debug (DETALHADO):', {
    // Permissões
    canAssign,
    canUpload,
    hasFullAccess,
    canSendApproval: (isAssignedDesigner || hasFullAccess) && task?.status === 'in_progress',
    
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
    isSuperAdmin,
    isAdmin,
    
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
      hasFullAccessOK: hasFullAccess,
      contextOK: context === 'creation',
      notVendorContextOK: !isVendorContext,
    }
  });
  
  // Pode enviar para aprovação: Designer atribuído ou Admin/SuperAdmin
  const canSendApproval = (isAssignedDesigner || hasFullAccess) && 
                         (task?.status === 'in_progress' || task?.status === 'changes_requested');
  
  // Pode solicitar alterações (como designer): Designer atribuído ou Admin/SuperAdmin
  const canRequestChanges = (isAssignedDesigner || hasFullAccess) && 
                           task?.status === 'awaiting_approval';
  
  // Pode enviar para produção: Designer atribuído ou Admin/SuperAdmin
  const canSendProduction = (isAssignedDesigner || hasFullAccess) && 
                           task?.status === 'approved';
  
  // Permissões para vendedores - Admin/SuperAdmin também tem acesso
  const canSalespersonApprove = (isSalesperson || hasFullAccess) && 
                                (isTaskCreator || hasFullAccess) && 
                                task?.status === 'awaiting_approval';
  const canSalespersonRequestChanges = (isSalesperson || hasFullAccess) && 
                                       (isTaskCreator || hasFullAccess) && 
                                       task?.status === 'awaiting_approval';

  // Pode transferir: Designer atribuído ou Admin/SuperAdmin
  const canTransfer = task?.assigned_to && 
                      (task.assigned_to === currentUser?.id || hasFullAccess) &&
                      task.status !== 'completed' &&
                      context === 'creation';

  // Pode recusar tarefa: Designer ou Admin/SuperAdmin
  // IMPORTANTE: Só pode devolver/recusar DEPOIS de aceitar a tarefa (status = in_progress)
  // Designer precisa primeiro aceitar a tarefa para depois poder devolver
  const canReject = task?.status === 'in_progress' && 
                    (isDesigner || hasFullAccess) &&
                    context === 'creation' &&
                    (task?.assigned_to === currentUser?.id || hasFullAccess);

  // Pode solicitar exclusão: Designer atribuído ou Admin/SuperAdmin
  const canDesignerRequestDelete = (isAssignedDesigner || hasFullAccess) && 
                                   task?.status !== 'completed' &&
                                   context === 'creation';

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
              forceShowUpload={isEditingRejected}
            />

            {/* Botão de Excluir para Vendedor Criador, Admins e Super Admins */}
            {((isSalesperson && isTaskCreator) || isSuperAdmin || isAdmin) && (
              <div className="pt-4 border-t">
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteTask}
                  disabled={logoUploading}
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Solicitar Exclusão desta Tarefa
                </Button>
              </div>
            )}
          </div>
        ) : (
          // INTERFACE COMPLETA DO DESIGNER
          <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">
                <FileText className="h-4 w-4 mr-2" />
                Detalhes
              </TabsTrigger>
              <TabsTrigger value="customization">
                <Palette className="h-4 w-4 mr-2" />
                Personalização
                {(hasUnresolvedChanges || task.design_files.length > 0) && (
                  <span className="ml-1 flex items-center gap-1">
                    {task.design_files.length > 0 && (
                      <span className="text-xs text-muted-foreground">({task.design_files.length})</span>
                    )}
                    {hasUnresolvedChanges && (
                      <span className="flex h-2 w-2 rounded-full bg-red-600" />
                    )}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="quote">
                <Receipt className="h-4 w-4 mr-2" />
                Orçamento
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
                      <p className="text-sm font-medium">{task.campaign_name || 'N/A'}</p>
                    </div>
                    
                    {/* Tipo de Uniforme */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Tipo de Uniforme</Label>
                      <p className="text-sm font-medium">
                        {extractUniformType(task.model_name, task.model_code, task.campaign_name)}
                      </p>
                    </div>
                    
                    {/* Segmento do Cliente - editável */}
                    <BusinessSegmentField task={task} onTaskUpdated={onTaskUpdated} />
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
                        onValueChange={(value) => handlePriorityChange(value as "normal" | "urgent")}
                        disabled={!isSuperAdmin && !isAdmin && !isAssignedDesigner && !isSalesperson}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">🟡 Normal</SelectItem>
                          <SelectItem value="urgent">🔴 Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                      {isSalesperson && !isSuperAdmin && !isAdmin && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Alterações de prioridade requerem aprovação
                        </p>
                      )}
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
                    
                    {/* Frete Selecionado */}
                    {task.shipping_option && (
                      <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                        <Label className="text-xs text-green-700 dark:text-green-400 font-semibold mb-2 block">
                          🚚 Frete Selecionado
                        </Label>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">
                              {(task.shipping_option as any)?.company?.name || 'N/A'}
                            </span>
                            <Badge className="bg-green-600 text-white">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(task.shipping_value || 0)}
                            </Badge>
                          </div>
                          <p className="text-xs text-green-600 dark:text-green-500">
                            {(task.shipping_option as any)?.name || ''} 
                            {(task.shipping_option as any)?.delivery_time && ` - ${(task.shipping_option as any).delivery_time} dias úteis`}
                          </p>
                        </div>
                      </div>
                    )}
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
                        accept="*/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 50 * 1024 * 1024) {
                              const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                              toast.error(`Arquivo muito grande (${sizeMB}MB). Máximo: 50MB`);
                              return;
                            }
                            setLogoFile(file);
                            toast.success("Arquivo selecionado!");
                          }
                        }}
                        disabled={logoUploading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Qualquer formato (CDR, AI, EPS, PSD, PDF, PNG, ZIP...) • Máximo 50MB
                      </p>
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
                // Contexto DESIGNER: Exibir layouts individuais em abas
                <>
                  {/* COLLAPSIBLE TOGGLE BUTTON */}
                  <button 
                    onClick={() => setOrderInfoExpanded(!orderInfoExpanded)}
                    className="flex items-center gap-3 w-full p-4 mb-4 rounded-lg border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 hover:border-primary/50 transition-all cursor-pointer"
                  >
                    {orderInfoExpanded ? (
                      <ChevronDown className="h-5 w-5 text-primary" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-primary" />
                    )}
                    <span className="flex-1 text-left font-semibold text-foreground">
                      Informações do Pedido
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {orderInfoExpanded ? 'Clique para ocultar' : 'Clique para expandir'}
                    </span>
                  </button>

                  {/* COLLAPSIBLE CONTENT - Order Info */}
                  {orderInfoExpanded && (
                    <div className="animate-fade-in">
                      {task.task_layouts && task.task_layouts.length > 1 ? (
                        // MÚLTIPLOS LAYOUTS - Exibir abas para cada mockup
                        <Tabs defaultValue="layout_1" className="space-y-4">
                          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${task.task_layouts.length}, 1fr)` }}>
                            {task.task_layouts.map((layout, index) => (
                              <TabsTrigger key={layout.id} value={`layout_${index + 1}`}>
                                <Palette className="h-4 w-4 mr-2" />
                                Mockup {index + 1}
                                {layout.campaign_name && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({layout.campaign_name})
                                  </span>
                                )}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                          
                          {task.task_layouts.map((layout, index) => (
                            <TabsContent key={layout.id} value={`layout_${index + 1}`} className="mt-0 space-y-6">
                              <CustomizationViewer 
                                data={layout.customization_data}
                                campaignName={layout.campaign_name || undefined}
                                modelName={layout.model_name || undefined}
                                modelCode={task.model_code}
                                modelImageFront={(layout as any).model_image_front || task.model_image_front}
                                taskId={task.id}
                                createdBy={task.created_by}
                                currentUserId={currentUser?.id}
                                isSalesperson={isSalesperson}
                                onModelChange={onTaskUpdated}
                                logoAction={task.logo_action}
                                logoDescription={task.logo_description}
                                task={task}
                                onTaskUpdated={onTaskUpdated}
                              />
                            </TabsContent>
                          ))}
                        </Tabs>
                      ) : task.task_layouts && task.task_layouts.length === 1 ? (
                        // LAYOUT ÚNICO
                        <CustomizationViewer 
                          data={task.task_layouts[0].customization_data}
                          campaignName={task.task_layouts[0].campaign_name || undefined}
                          modelName={task.task_layouts[0].model_name || undefined}
                          modelCode={task.model_code}
                          modelImageFront={(task.task_layouts[0] as any).model_image_front || task.model_image_front}
                          taskId={task.id}
                          createdBy={task.created_by}
                          currentUserId={currentUser?.id}
                          isSalesperson={isSalesperson}
                          onModelChange={onTaskUpdated}
                          logoAction={task.logo_action}
                          logoDescription={task.logo_description}
                          task={task}
                          onTaskUpdated={onTaskUpdated}
                        />
                      ) : (
                        // FALLBACK - Dados antigos
                        <CustomizationViewer 
                          data={task.customization_data}
                          campaignName={task.campaign_name}
                          modelName={task.model_name}
                          modelCode={task.model_code}
                          modelImageFront={task.model_image_front}
                          taskId={task.id}
                          createdBy={task.created_by}
                          currentUserId={currentUser?.id}
                          isSalesperson={isSalesperson}
                          onModelChange={onTaskUpdated}
                          logoAction={task.logo_action}
                          logoDescription={task.logo_description}
                          task={task}
                          onTaskUpdated={onTaskUpdated}
                        />
                      )}
                    </div>
                  )}

                  {/* ALTERAÇÕES - COLLAPSIBLE */}
                  <Card className="border-2 border-dashed border-muted-foreground/30 mt-6">
                    <CardContent className="p-0">
                      <button 
                        onClick={() => setAlteracoesExpanded(!alteracoesExpanded)}
                        className="flex items-center gap-3 w-full p-4 rounded-t-lg hover:bg-muted/50 transition-all cursor-pointer"
                      >
                        {alteracoesExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <RefreshCcw className="h-5 w-5" />
                        <span className="flex-1 text-left font-semibold text-foreground">
                          Alterações
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {alteracoesExpanded ? 'Clique para ocultar' : 'Clique para expandir'}
                        </span>
                      </button>
                      
                      {alteracoesExpanded && (
                        <div className="p-6 pt-0 animate-fade-in">
                          <ChangeRequestsTab
                            taskId={task.id}
                            layoutId={task.task_layouts?.[0]?.id}
                            taskStatus={task.status}
                            onChangeRequestAdded={onTaskUpdated}
                            onClose={() => onOpenChange(false)}
                            canAddChangeRequest={isSalesperson || isAdmin || isSuperAdmin}
                            onSendForApproval={canSendApproval ? async () => {
                              await handleStatusChange('awaiting_approval');
                              onOpenChange(false);
                            } : undefined}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* SEÇÃO DE MOCKUPS - Movido do tab "Enviar Mockup" */}
              {!isVendorContext && (
                <div className="space-y-6 pt-6 border-t mt-6">
                  {/* Upload de Mockup - Apenas para Designer */}
                  {canUpload && (
                    <Card className="border-2 border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-950 hover:border-blue-600 transition-colors">
                      <CardContent className="p-6 space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-900 dark:text-blue-100">
                          <Upload className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                          Upload de Mockup
                        </h3>
                        
                        {task.status === 'changes_requested' && (
                          <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-700 rounded-lg">
                            <RefreshCcw className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                            <span className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                              Enviando mockup de revisão (alterações solicitadas)
                            </span>
                          </div>
                        )}
                        
                        <div className="text-center space-y-2">
                          <Upload className="h-12 w-12 mx-auto text-blue-600 dark:text-blue-400" />
                          <Label htmlFor="mockup-upload" className="text-lg font-medium cursor-pointer text-blue-800 dark:text-blue-200">
                            Selecionar Arquivos do Mockup
                          </Label>
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            Qualquer formato (CDR, AI, EPS, PSD, PDF, PNG, ZIP...) • Múltiplos arquivos • Máximo 50MB cada
                          </p>
                        </div>
                        
                        <Input 
                          id="mockup-upload"
                          type="file" 
                          accept="*/*"
                          onChange={handleFileUpload}
                          multiple
                          disabled={uploading}
                          className="cursor-pointer"
                        />

                        {/* Preview dos arquivos selecionados */}
                        {pendingFiles.length > 0 && (
                          <div className="space-y-2 p-4 bg-blue-100 dark:bg-blue-900 border-2 border-blue-400 dark:border-blue-600 rounded-lg">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                📁 {pendingFiles.length} arquivo(s) selecionado(s)
                              </Label>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPendingFiles([])}
                                disabled={uploading}
                                className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="space-y-1">
                              {pendingFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  <span className="flex-1 truncate">{file.name}</span>
                                  <span className="text-xs text-blue-600 dark:text-blue-400">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-2 p-4 border-2 border-amber-500 dark:border-amber-600 rounded-lg bg-amber-50 dark:bg-amber-950">
                          <Label className="text-base font-medium text-amber-700 dark:text-amber-300">
                            📝 Notas desta versão (opcional)
                          </Label>
                          <Textarea 
                            placeholder="Adicione observações sobre esta versão do mockup..."
                            value={uploadNotes}
                            onChange={(e) => setUploadNotes(e.target.value)}
                            disabled={uploading}
                            className="min-h-[80px] border-amber-300 dark:border-amber-700 focus:border-amber-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-white"
                          />
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            Essas notas serão visíveis junto com os arquivos enviados.
                          </p>
                        </div>

                        {/* Botão de enviar */}
                        <Button
                          onClick={handleSubmitMockup}
                          disabled={uploading || pendingFiles.length === 0}
                          className="w-full"
                          size="lg"
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              {uploadProgress}
                            </>
                          ) : (
                            <>
                              <Send className="h-5 w-5 mr-2" />
                              📤 Enviar Mockup
                            </>
                          )}
                        </Button>
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

                  {/* Lista de Mockups Enviados - 3-column grid */}
                  {task.design_files.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-lg font-semibold">Mockups Enviados</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[...task.design_files].reverse().map((file) => {
                        // Se está em modo colapsado (já aprovado) e o mockup não foi aprovado
                        if (showCollapsedView && file.client_approved === false) {
                          return (
                            <Collapsible key={`${file.version}-${file.uploaded_at}`}>
                              <Card className="opacity-60 border-muted">
                                <CollapsibleTrigger asChild>
                                  <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline">v{file.version}</Badge>
                                        {file.is_revision && (
                                          <Badge variant="warning">📝 Revisão</Badge>
                                        )}
                                        <span className="text-sm text-muted-foreground">Mockup não aprovado</span>
                                      </div>
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </CardContent>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <CardContent className="p-4 pt-0 space-y-3">
                                    {file.notes && (
                                      <div className="p-3 bg-amber-50 dark:bg-amber-950 border-2 border-amber-500 dark:border-amber-600 rounded-lg">
                                        <p className="text-sm text-amber-900 dark:text-amber-100">
                                          <strong>📝 Observações do Designer:</strong> {file.notes}
                                        </p>
                                      </div>
                                    )}
                                    
                                    <div 
                                      className="relative w-full h-48 bg-muted rounded-lg overflow-hidden cursor-pointer group"
                                      onClick={() => window.open(file.url, '_blank')}
                                    >
                                      <img 
                                        src={file.url} 
                                        alt={`Mockup v${file.version}`}
                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <ExternalLink className="h-8 w-8 text-white" />
                                      </div>
                                    </div>
                                    
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          const response = await fetch(file.url);
                                          const blob = await response.blob();
                                          const url = window.URL.createObjectURL(blob);
                                          const link = document.createElement('a');
                                          link.href = url;
                                          link.download = `mockup_v${file.version}_${new Date().getTime()}.png`;
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                          window.URL.revokeObjectURL(url);
                                          toast.success("Download iniciado!");
                                        } catch (error) {
                                          toast.error("Erro ao baixar arquivo");
                                        }
                                      }}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Baixar
                                    </Button>
                                  </CardContent>
                                </CollapsibleContent>
                              </Card>
                            </Collapsible>
                          );
                        }

                        // Card normal para mockups aprovados ou em processo de aprovação
                        const isApproved = selectedApprovedMockups.has(file.url) || file.client_approved;
                        
                        return (
                          <Card 
                            key={`${file.version}-${file.uploaded_at}`}
                            className={`flex flex-col ${isApproved ? "border-2 border-green-500" : ""}`}
                          >
                            {/* TOP HEADER - Version badge + Download button ONLY */}
                            <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 border-b">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant={file.version === task.current_version ? "default" : "outline"}>
                                    v{file.version} {file.version === task.current_version && "(atual)"}
                                  </Badge>
                                  {file.is_revision && (
                                    <Badge variant="warning">📝 Revisão</Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(file.uploaded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const response = await fetch(file.url);
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `mockup_v${file.version}_${new Date().getTime()}.png`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(url);
                                    toast.success("Download iniciado!");
                                  } catch (error) {
                                    toast.error("Erro ao baixar arquivo");
                                  }
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Baixar
                              </Button>
                            </div>

                            {/* MIDDLE SECTION - Mockup Preview */}
                            <div className="flex-1 p-3 space-y-3">
                              {/* Observações do Designer */}
                              {file.notes && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-950 border-2 border-amber-500 dark:border-amber-600 rounded-lg">
                                  <p className="text-sm text-amber-900 dark:text-amber-100">
                                    <strong>📝 Observações do Designer:</strong> {file.notes}
                                  </p>
                                </div>
                              )}

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
                            </div>
                            
                            {/* BOTTOM SECTION - Approval Checkbox (always visible) */}
                            <label 
                              className={`flex items-center gap-3 p-3 border-t cursor-pointer transition-colors ${
                                isApproved 
                                  ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" 
                                  : "bg-muted/30 hover:bg-muted/50"
                              }`}
                            >
                              <Checkbox
                                id={`approve-${file.version}-${file.uploaded_at}`}
                                checked={isApproved}
                                onCheckedChange={(checked) => {
                                  const newSet = new Set(selectedApprovedMockups);
                                  if (checked) {
                                    newSet.add(file.url);
                                  } else {
                                    newSet.delete(file.url);
                                  }
                                  setSelectedApprovedMockups(newSet);
                                }}
                                disabled={!canSalespersonApprove && !isAdmin && !isSuperAdmin}
                              />
                              <span className={`text-sm font-medium flex-1 ${
                                isApproved ? "text-green-700 dark:text-green-400" : "text-muted-foreground"
                              }`}>
                                {isApproved 
                                  ? "✅ Mockup aprovado pelo cliente" 
                                  : "Marcar como aprovado pelo cliente"}
                              </span>
                            </label>
                          </Card>
                        );
                      })}
                      </div>
                    </div>
                  )}

                  {task.design_files.length === 0 && !canUpload && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum mockup enviado ainda
                    </p>
                  )}

                  {/* Botão Enviar Layout para Cliente - Apenas para Vendedor */}
                  {task.design_files.length > 0 && (isSalesperson || isAdmin || isSuperAdmin) && (
                    <Card className="border-2 border-primary/50 bg-primary/5">
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <Phone className="h-5 w-5 text-primary" />
                            <span className="font-medium">Enviar para o Cliente</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Envie o(s) mockup(s) para o cliente aprovar via WhatsApp.
                          </p>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Cliente:</span>
                            <span className="font-medium">{task.customer_name}</span>
                            {task.customer_phone && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span>{task.customer_phone}</span>
                              </>
                            )}
                          </div>
                          <Button
                            onClick={handleSendLayoutToClientClick}
                            disabled={sendingLayout || !task.customer_phone}
                            className="w-full"
                            size="lg"
                          >
                            {sendingLayout ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Phone className="h-4 w-4 mr-2" />
                                📱 Enviar Layout para Cliente
                              </>
                            )}
                          </Button>
                          {!task.customer_phone && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Cliente sem WhatsApp cadastrado
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                </div>
              )}
            </TabsContent>

            {/* Tab de Orçamento */}
            <TabsContent value="quote" className="mt-0">
              {(isSalesperson || isSuperAdmin || isAdmin) && !isDesigner && task.status === 'approved' ? (
                <QuoteSection
                  taskId={task.id}
                  customerName={task.customer_name || "Cliente"}
                  customerPhone={task.customer_phone}
                  customerId={task.customer_id}
                  isSalesperson={isSalesperson}
                  isAdmin={isAdmin || isSuperAdmin}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {task.status !== 'approved' 
                      ? "O orçamento estará disponível após a aprovação do mockup pelo cliente."
                      : "Você não tem permissão para gerenciar orçamentos."}
                  </p>
                </div>
              )}
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
                {((isSalesperson && isTaskCreator) || isSuperAdmin || isAdmin || canDesignerRequestDelete) && (
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteTask}
                    disabled={uploading || logoUploading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Solicitar Exclusão
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {canTransfer && (
                  <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        loadDesigners();
                        setShowTransferDialog(true);
                      }}
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Transferir
                    </Button>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Transferir Tarefa</DialogTitle>
                        <p className="text-sm text-muted-foreground">
                          Selecione o designer que receberá esta tarefa
                        </p>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Designer destino</Label>
                          <Select value={selectedDesigner} onValueChange={setSelectedDesigner}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um designer" />
                            </SelectTrigger>
                            <SelectContent>
                              {designers.map(designer => (
                                <SelectItem key={designer.id} value={designer.id}>
                                  {designer.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Card mostrando tarefa atual */}
                        <Card className="bg-muted/50">
                          <CardContent className="p-3">
                            <p className="text-sm font-medium">{task?.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{task?.campaign_name}</p>
                            <p className="text-xs">Atualmente com: {task?.designer_name}</p>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
                          Cancelar
                        </Button>
                        <Button 
                          onClick={handleTransferTask} 
                          disabled={!selectedDesigner || transferring}
                        >
                          {transferring ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Transferindo...
                            </>
                          ) : (
                            <>
                              <ArrowRightLeft className="h-4 w-4 mr-2" />
                              Confirmar Transferência
                            </>
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {canReject && (
                  <Button 
                    variant="outline" 
                    className="text-destructive border-destructive hover:bg-destructive/10"
                    onClick={() => setShowRejectDialog(true)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Recusar Tarefa
                  </Button>
                )}

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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button 
                        onClick={async () => {
                          // Atualizar design_files marcando quais foram aprovados
                          const updatedFiles = task.design_files.map(file => ({
                            ...file,
                            client_approved: selectedApprovedMockups.has(file.url)
                          }));
                          
                          const { error } = await supabase
                            .from('design_tasks')
                            .update({ 
                              design_files: updatedFiles,
                              status: 'approved',
                              client_approved_at: new Date().toISOString()
                            })
                            .eq('id', task.id);

                          if (error) {
                            toast.error("Erro ao aprovar mockup", {
                              description: error.message
                            });
                            return;
                          }

                          await handleStatusChange('approved', 'Mockup aprovado pelo vendedor');
                        }}
                        disabled={selectedApprovedMockups.size === 0}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Aprovar Mockup
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {selectedApprovedMockups.size === 0 && (
                    <TooltipContent>
                      <p>Selecione pelo menos um mockup aprovado pelo cliente</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      <DeleteReasonDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        taskId={task.id}
        onSuccess={onTaskUpdated}
      />

      {currentUser?.id && (
        <RejectTaskDialog
          task={task}
          open={showRejectDialog}
          onOpenChange={setShowRejectDialog}
          onSuccess={async () => {
            // Delay para garantir propagação no banco antes de recarregar
            await new Promise(resolve => setTimeout(resolve, 300));
            onTaskUpdated();
            onOpenChange(false);
          }}
          currentUserId={currentUser.id}
        />
      )}

      {/* Version Selector Modal for sending layout to client */}
      <MockupVersionSelectorModal
        open={showVersionSelector}
        onOpenChange={setShowVersionSelector}
        mockupVersions={task.design_files}
        currentVersion={task.current_version}
        onConfirm={handleSendLayoutToClient}
      />

      {/* Priority Change Request Dialog for salespeople */}
      <PriorityChangeRequestDialog
        open={showPriorityChangeDialog}
        onOpenChange={setShowPriorityChangeDialog}
        taskId={task.id}
        currentPriority={task.priority as "normal" | "urgent"}
        requestedPriority={requestedPriority}
        customerName={task.customer_name}
        onSuccess={onTaskUpdated}
      />
    </Dialog>
  );
};
