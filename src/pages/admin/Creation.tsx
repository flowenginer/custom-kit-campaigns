import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanColumn } from "@/components/creation/KanbanColumn";
import { TaskDetailsDialog } from "@/components/creation/TaskDetailsDialog";
import { TaskCardSkeleton } from "@/components/creation/TaskCardSkeleton";
import { ColorThemePanel } from "@/components/creation/ColorThemePanel";
import { CardFontEditor } from "@/components/creation/CardFontEditor";
import { ProductionConfirmDialog } from "@/components/creation/ProductionConfirmDialog";
import { DuplicateOrderDialog } from "@/components/creation/DuplicateOrderDialog";
import { MissingOrderNumberDialog } from "@/components/creation/MissingOrderNumberDialog";
import { DesignTask } from "@/types/design-task";
import type { DbTaskStatus } from "@/types/design-task";
import { useUserRole } from "@/hooks/useUserRole";
import { useCardFontSizes } from "@/hooks/useCardFontSizes";
import { useCardCollapse } from "@/hooks/useCardCollapse";
import { useSoundNotifications } from "@/hooks/useSoundNotifications";
import { toast } from "sonner";
import { 
  Inbox, 
  Palette, 
  Eye, 
  CheckCircle, 
  AlertCircle,
  Package,
  Search,
  X,
  ArrowUpDown
} from "lucide-react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { RefreshIndicator } from "@/components/dashboard/RefreshIndicator";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

const Creation = () => {
  const [tasks, setTasks] = useState<DesignTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<DesignTask | null>(null);
  const selectedTaskRef = useRef<DesignTask | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<DesignTask | null>(null);
  const [productionConfirmOpen, setProductionConfirmOpen] = useState(false);
  const [pendingProductionTask, setPendingProductionTask] = useState<{
    task: DesignTask;
    newStatus: DbTaskStatus;
  } | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    orderNumber: string;
    existingCustomerName: string;
  } | null>(null);
  const [missingOrderDialogOpen, setMissingOrderDialogOpen] = useState(false);
  const [missingOrderCustomerName, setMissingOrderCustomerName] = useState("");
  const [autoCollapseEmpty, setAutoCollapseEmpty] = useState<boolean>(() => {
    const saved = localStorage.getItem('kanban-auto-collapse-empty');
    return saved ? JSON.parse(saved) : false;
  });
  const [columnColors, setColumnColors] = useState<string[]>(() => {
    const saved = localStorage.getItem('kanban-column-colors');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [designerFilter, setDesignerFilter] = useState<string>("all");
  const [salespersonFilter, setSalespersonFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOption, setSortOption] = useState<string>(() => {
    return localStorage.getItem('kanban-sort-option') || 'updated_at_desc';
  });
  
  const { allowedKanbanColumns, isSuperAdmin, isAdmin, isDesigner, isSalesperson, isLoading } = useUserRole();
  const { sizes: fontSizes, updateSize, resetToDefaults } = useCardFontSizes();
  const { collapsedCards, toggleCard, collapseAll, expandAll } = useCardCollapse();
  const { playNewCard, playStatusChange } = useSoundNotifications();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const refreshData = useCallback(async () => {
    await loadTasks();
  }, []);

  const { lastUpdated, isRefreshing, refresh } = useAutoRefresh(
    refreshData,
    { interval: 60000, enabled: true }
  );

  // Manter ref sincronizado com selectedTask
  useEffect(() => {
    selectedTaskRef.current = selectedTask;
  }, [selectedTask]);

  useEffect(() => {
    loadTasks();
    getCurrentUser();
    
    // Subscribe to realtime changes for new cards and updates
    const channel = supabase
      .channel("design_tasks_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "design_tasks",
        },
        (payload) => {
          // Tocar som apenas em INSERT (novos cards)
          if (payload.eventType === 'INSERT') {
            playNewCard();
          }
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playNewCard]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  useEffect(() => {
    if (columnColors.length > 0) {
      localStorage.setItem('kanban-column-colors', JSON.stringify(columnColors));
    } else {
      localStorage.removeItem('kanban-column-colors');
    }
  }, [columnColors]);

  useEffect(() => {
    localStorage.setItem('kanban-auto-collapse-empty', JSON.stringify(autoCollapseEmpty));
  }, [autoCollapseEmpty]);

  const handleColorsChange = (colors: string[]) => {
    setColumnColors(colors);
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("design_tasks")
        .select(`
          id,
          order_id,
          lead_id,
          campaign_id,
          status,
          priority,
          deadline,
          assigned_to,
          assigned_at,
          current_version,
          design_files,
          created_at,
          updated_at,
          completed_at,
          status_changed_at,
          created_by,
          created_by_salesperson,
          order_number,
          customer_id,
          orders!inner (
            customer_name,
            customer_email,
            customer_phone,
            quantity,
            customization_data,
            model_id,
            shirt_models (
              name,
              sku,
              image_front
            )
          ),
          campaigns (
            name,
            segment_tag
          ),
          creator:profiles!design_tasks_created_by_fkey (
            full_name
          ),
          designer:profiles!design_tasks_assigned_to_fkey (
            full_name
          ),
          lead:leads!design_tasks_lead_id_fkey (
            needs_logo,
            uploaded_logo_url,
            logo_action,
            logo_description,
            business_segment_id,
            business_segment_other,
            business_segments (
              id,
              name,
              icon
            )
          )
        `)
        .is('deleted_at', null)
        .order("updated_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Buscar layouts associados às tarefas
      const taskIds = data?.map(t => t.id) || [];
      let layoutsByTaskId: Record<string, any[]> = {};
      
      if (taskIds.length > 0) {
        const { data: layoutsData, error: layoutsError } = await supabase
          .from('design_task_layouts')
          .select(`
            *,
            shirt_models:model_id (
              image_front,
              image_back,
              image_left,
              image_right
            )
          `)
          .in('task_id', taskIds)
          .order('layout_number', { ascending: true });

        if (!layoutsError && layoutsData) {
          layoutsByTaskId = layoutsData.reduce((acc, layout: any) => {
            if (!acc[layout.task_id]) acc[layout.task_id] = [];
            acc[layout.task_id].push({
              ...layout,
              model_image_front: layout.shirt_models?.image_front || layout.customization_data?.modelImages?.front || null,
              model_image_back: layout.shirt_models?.image_back || layout.customization_data?.modelImages?.back || null,
              model_image_left: layout.shirt_models?.image_left || layout.customization_data?.modelImages?.left || null,
              model_image_right: layout.shirt_models?.image_right || layout.customization_data?.modelImages?.right || null,
            });
            return acc;
          }, {} as Record<string, any[]>);
        }
      }

      const formattedTasks: DesignTask[] = (data || []).map((task: any) => ({
        ...task,
        customer_name: task.orders?.customer_name,
        customer_email: task.orders?.customer_email,
        customer_phone: task.orders?.customer_phone,
        quantity: task.orders?.quantity,
        customization_data: task.orders?.customization_data,
        campaign_name: task.campaigns?.name,
        segment_tag: task.campaigns?.segment_tag,
        model_name: task.orders?.shirt_models?.name,
        model_code: task.orders?.shirt_models?.sku,
        model_image_front: task.orders?.shirt_models?.image_front,
        needs_logo: task.lead?.needs_logo,
        logo_action: task.lead?.logo_action,
        logo_description: task.lead?.logo_description || null,
        uploaded_logo_url: task.lead?.uploaded_logo_url || null,
        created_by_salesperson: task.created_by_salesperson,
        creator_name: task.creator?.full_name || null,
        designer_name: task.designer?.full_name || null,
        designer_initials: task.designer?.full_name 
          ? task.designer.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          : null,
        status_changed_at: task.status_changed_at,
        customer_id: task.customer_id,
        task_layouts: layoutsByTaskId[task.id] || [],
        // Business segment from lead
        business_segment_id: task.lead?.business_segment_id || null,
        business_segment_name: (task.lead?.business_segments as any)?.name || null,
        business_segment_icon: (task.lead?.business_segments as any)?.icon || null,
        business_segment_other: task.lead?.business_segment_other || null,
      }));

      setTasks(formattedTasks);

      // ✅ FIX: Usar ref para evitar stale closure
      const currentSelectedTask = selectedTaskRef.current;
      if (currentSelectedTask) {
        const updatedSelectedTask = formattedTasks.find(t => t.id === currentSelectedTask.id);
        if (updatedSelectedTask) {
          setSelectedTask(updatedSelectedTask);
        }
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast.error("Erro ao carregar tarefas");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task: DesignTask) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  const handleTaskUpdated = () => {
    loadTasks();
  };

  const handleOrderNumberUpdate = async (taskId: string, orderNumber: string) => {
    try {
      const { error } = await supabase
        .from("design_tasks")
        .update({ order_number: orderNumber })
        .eq("id", taskId);

      if (error) throw error;

      // ✅ Atualizar estado local imediatamente
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, order_number: orderNumber }
            : task
        )
      );

      toast.success("Número do pedido salvo!");
    } catch (error) {
      console.error("Error updating order number:", error);
      toast.error("Erro ao atualizar número do pedido");
    }
  };

  const handleProductionConfirm = async () => {
    if (!pendingProductionTask) return;
    
    const { task, newStatus } = pendingProductionTask;
    
    try {
      const { error } = await supabase
        .from("design_tasks")
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq("id", task.id);

      if (error) throw error;

      toast.success("Pedido enviado para Produção com sucesso!");
      loadTasks();
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Erro ao enviar para Produção");
    } finally {
      setProductionConfirmOpen(false);
      setPendingProductionTask(null);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as DesignTask;
    setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    
    if (!over || active.id === over.id) return;

    const task = active.data.current?.task as DesignTask;
    const newStatus = over.id as DesignTask['status'];

    // ✅ VALIDAÇÃO: Não permitir mover para coluna "logo_needed" (é apenas visual)
    if (newStatus === 'logo_needed') {
      toast.error("Não é possível mover tarefas para 'Leads sem Logo'. Use a página Pedidos para gerenciar logos.");
      return;
    }

    // ✅ VALIDAÇÃO: Não permitir mover DE "logo_needed" por drag (use o botão no modal)
    if (task.needs_logo === true) {
      toast.error("Para enviar esta tarefa ao designer, use o botão 'Enviar para Designer' no modal da tarefa.");
      return;
    }

    // ✅ NOVA VALIDAÇÃO: Obrigatório ter alteração registrada para mover para "changes_requested"
    if (newStatus === 'changes_requested') {
      const { data: changeRequests, error } = await supabase
        .from("change_requests")
        .select("id")
        .eq("task_id", task.id)
        .is("resolved_at", null)
        .limit(1);

      if (error || !changeRequests || changeRequests.length === 0) {
        toast.error("Adicione uma solicitação de alteração na aba 'Alterações' antes de mover para Revisão Necessária");
        return;
      }
    }

    // Validações de negócio
    if (newStatus === 'awaiting_approval' && !task.assigned_to) {
      toast.error("A tarefa precisa estar atribuída a um designer para ser enviada para aprovação");
      return;
    }

    // ✅ NOVA VALIDAÇÃO: Mockup obrigatório para enviar para aprovação
    if (newStatus === 'awaiting_approval') {
      const hasDesignFiles = task.design_files && task.design_files.length > 0;
      
      if (!hasDesignFiles) {
        toast.error(
          "Para enviar para aprovação, é obrigatório ter pelo menos 1 mockup enviado. " +
          "Acesse a aba 'Enviar Mockup' no card da tarefa."
        );
        return;
      }
    }

    // ✅ NOVA VALIDAÇÃO: Impedir ir para "in_progress" sem designer
    if (newStatus === 'in_progress' && !task.assigned_to) {
      toast.error("Você precisa assumir a tarefa antes de movê-la para 'Em Progresso'. Clique na tarefa e use o botão 'Assumir Tarefa'.");
      return;
    }

    if (task.status === 'completed' && newStatus !== 'completed') {
      toast.error("Não é possível mover tarefas de volta da Produção");
      return;
    }

    if (newStatus === 'completed') {
      // Validação: Número do pedido obrigatório para ir para Produção
      if (!task.order_number || task.order_number.trim() === '') {
        setMissingOrderCustomerName(task.customer_name || "Desconhecido");
        setMissingOrderDialogOpen(true);
        return;
      }
      
      // NOVA VALIDAÇÃO: Verificar duplicidade
      const { data: duplicates } = await supabase
        .from("design_tasks")
        .select("id, orders(customer_name)")
        .eq("order_number", task.order_number.trim())
        .eq("status", "completed")
        .is("deleted_at", null)
        .neq("id", task.id)
        .limit(1);
      
      if (duplicates && duplicates.length > 0) {
        const customerName = (duplicates[0] as any).orders?.customer_name || "Desconhecido";
        
        // Abrir dialog elegante ao invés de toast
        setDuplicateInfo({
          orderNumber: task.order_number,
          existingCustomerName: customerName
        });
        setDuplicateDialogOpen(true);
        return;
      }
      
      // Abrir dialog de confirmação ao invés de window.confirm
      setPendingProductionTask({ task, newStatus });
      setProductionConfirmOpen(true);
      return;
    }

    // Aqui, newStatus é garantido não ser 'completed' ou 'logo_needed'
    const validStatus = newStatus as Exclude<DbTaskStatus, 'completed'>;
    
    try {
      // Tocar som de mudança de status
      playStatusChange();
      
      const { error } = await supabase
        .from("design_tasks")
        .update({ 
          status: validStatus,
          completed_at: null
        })
        .eq("id", task.id);

      if (error) throw error;

      toast.success("Status atualizado com sucesso!");
      loadTasks();
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Erro ao atualizar status da tarefa");
    }
  };

  // Filtrar tarefas para designers
  const filterTasksForDesigner = (tasks: DesignTask[]) => {
    // Super Admin e Admin veem tudo
    if (isSuperAdmin || isAdmin) return tasks;
    
    // Designer vê: tarefas não atribuídas + suas próprias tarefas
    if (isDesigner) {
      return tasks.filter(task => 
        task.assigned_to === null ||           // Não atribuída
        task.assigned_to === currentUserId     // Atribuída a ele
      );
    }
    
    return tasks;
  };

  // Filtrar tarefas para vendedores
  const filterTasksForSalesperson = (tasks: DesignTask[]) => {
    // Super Admin e Admin veem tudo
    if (isSuperAdmin || isAdmin) {
      return tasks;
    }
    
    // Vendedor vê APENAS suas próprias tarefas criadas
    if (isSalesperson && !isDesigner) {
      return tasks.filter(task => task.created_by === currentUserId);
    }
    
    return tasks;
  };

  // Filtrar tarefas por prioridade
  const filterByPriority = (tasks: DesignTask[]) => {
    if (priorityFilter === "all") return tasks;
    return tasks.filter(task => task.priority === priorityFilter);
  };

  // Filtrar tarefas por designer
  const filterByDesigner = (tasks: DesignTask[]) => {
    if (designerFilter === "all") return tasks;
    return tasks.filter(task => task.assigned_to === designerFilter);
  };

  // Filtrar tarefas por vendedor
  const filterBySalesperson = (tasks: DesignTask[]) => {
    if (salespersonFilter === "all") return tasks;
    return tasks.filter(task => task.created_by === salespersonFilter);
  };

  // Filtrar tarefas por busca de nome do cliente ou número do pedido
  const filterBySearch = (tasks: DesignTask[]) => {
    if (!searchQuery.trim()) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter(task => 
      task.customer_name?.toLowerCase().includes(query) ||
      task.order_number?.toLowerCase().includes(query)
    );
  };

  // Ordenar tarefas
  const sortTasks = (tasks: DesignTask[]) => {
    const sorted = [...tasks];
    
    switch (sortOption) {
      case 'timer1_asc':
        // Timer 1 - mais antigo primeiro (created_at ASC)
        return sorted.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      
      case 'timer1_desc':
        // Timer 1 - mais recente primeiro (created_at DESC)
        return sorted.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      
      case 'timer2_asc':
        // Timer 2 - mais antigo no container (status_changed_at ASC)
        return sorted.sort((a, b) => 
          new Date(a.status_changed_at).getTime() - new Date(b.status_changed_at).getTime()
        );
      
      case 'timer2_desc':
        // Timer 2 - mais recente no container (status_changed_at DESC)
        return sorted.sort((a, b) => 
          new Date(b.status_changed_at).getTime() - new Date(a.status_changed_at).getTime()
        );
      
      case 'quantity_desc':
        // Mais unidades primeiro
        return sorted.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
      
      case 'quantity_asc':
        // Menos unidades primeiro
        return sorted.sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
      
      case 'version_desc':
        // Mais atualizações/versões primeiro
        return sorted.sort((a, b) => (b.current_version || 0) - (a.current_version || 0));
      
      case 'version_asc':
        // Menos atualizações/versões primeiro
        return sorted.sort((a, b) => (a.current_version || 0) - (b.current_version || 0));
      
      case 'alphabetical':
        // Ordem alfabética A-Z por nome do cliente
        return sorted.sort((a, b) => 
          (a.customer_name || '').localeCompare(b.customer_name || '', 'pt-BR')
        );
      
      case 'order_number_asc':
        // Número do pedido crescente
        return sorted.sort((a, b) => 
          (a.order_number || '').localeCompare(b.order_number || '', 'pt-BR', { numeric: true })
        );
      
      case 'order_number_desc':
        // Número do pedido decrescente
        return sorted.sort((a, b) => 
          (b.order_number || '').localeCompare(a.order_number || '', 'pt-BR', { numeric: true })
        );
      
      case 'updated_at_desc':
      default:
        // Padrão - última atualização (mais recente primeiro)
        return sorted.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    }
  };

  // Aplicar todos os filtros e ordenação
  const applyAllFilters = (tasks: DesignTask[]) => {
    const filtered = filterBySearch(
      filterByDesigner(
        filterBySalesperson(
          filterByPriority(
            filterTasksForSalesperson(
              filterTasksForDesigner(tasks)
            )
          )
        )
      )
    );
    return sortTasks(filtered);
  };

  // Limpar todos os filtros
  const clearAllFilters = () => {
    setSearchQuery("");
    setDesignerFilter("all");
    setSalespersonFilter("all");
    setPriorityFilter("all");
    setSortOption("updated_at_desc");
  };

  // Extrair listas únicas de designers e vendedores
  const uniqueDesigners = useMemo(() => {
    const designers = tasks
      .filter(t => t.designer_name && t.assigned_to)
      .map(t => ({ id: t.assigned_to!, name: t.designer_name! }));
    
    return Array.from(new Map(designers.map(d => [d.id, d])).values());
  }, [tasks]);

  const uniqueSalespersons = useMemo(() => {
    const salespersons = tasks
      .filter(t => t.creator_name && t.created_by)
      .map(t => ({ id: t.created_by!, name: t.creator_name! }));
    
    return Array.from(new Map(salespersons.map(s => [s.id, s])).values());
  }, [tasks]);

  const columns = [
    {
      title: "Leads sem Logo",
      status: "logo_needed" as const,
      icon: Inbox,
      tasks: applyAllFilters(tasks.filter(t => t.needs_logo === true && t.logo_action === 'waiting_client')),
    },
    {
      title: "Novos Com Logo",
      status: "pending" as const,
      icon: Inbox,
      tasks: applyAllFilters(tasks.filter(t => 
        t.status === "pending" && (!t.needs_logo || t.logo_action !== 'waiting_client')
      )),
    },
    {
      title: "Em Progresso",
      status: "in_progress" as const,
      icon: Palette,
      tasks: applyAllFilters(tasks.filter(t => t.status === "in_progress")),
    },
    {
      title: "Aguard. Aprovação",
      status: "awaiting_approval" as const,
      icon: Eye,
      tasks: applyAllFilters(tasks.filter(t => t.status === "awaiting_approval")),
    },
    {
      title: "Revisão Necessária",
      status: "changes_requested" as const,
      icon: AlertCircle,
      tasks: applyAllFilters(tasks.filter(t => t.status === "changes_requested")),
    },
    {
      title: "Aprovado",
      status: "approved" as const,
      icon: CheckCircle,
      tasks: applyAllFilters(tasks.filter(t => t.status === "approved")),
    },
    {
      title: "Produção",
      status: "completed" as const,
      icon: Package,
      tasks: applyAllFilters(tasks.filter(t => t.status === "completed")),
    },
  ];

  // Filtrar colunas baseado em permissões (Super Admin e Admin veem todas)
  const visibleColumns = (isSuperAdmin || isAdmin)
    ? columns 
    : columns.filter(col => allowedKanbanColumns.includes(col.status));

  const inProgressCount = tasks.filter(t => t.status === "in_progress").length;

  // Se ainda está carregando as permissões, mostrar loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Carregando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <ColorThemePanel 
        onColorsChange={handleColorsChange}
        currentColors={columnColors}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Criação</h1>
          <p className="text-muted-foreground mt-1">
            {tasks.length} tarefas • {inProgressCount} em andamento
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Pesquisa por cliente ou número do pedido */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente ou nº pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[220px]"
            />
          </div>

          {/* Filtro por Designer */}
          <Select value={designerFilter} onValueChange={setDesignerFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Designer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Designers</SelectItem>
              {uniqueDesigners.map(designer => (
                <SelectItem key={designer.id} value={designer.id}>
                  {designer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por Vendedor */}
          <Select value={salespersonFilter} onValueChange={setSalespersonFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Vendedores</SelectItem>
              {uniqueSalespersons.map(salesperson => (
                <SelectItem key={salesperson.id} value={salesperson.id}>
                  {salesperson.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro de Prioridade */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="urgent">🔴 Urgente</SelectItem>
              <SelectItem value="normal">🟡 Normal</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro de Ordenação */}
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="w-[220px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_at_desc">Última atualização</SelectItem>
              <SelectItem value="timer1_asc">⏱️ Mais antigo (criação)</SelectItem>
              <SelectItem value="timer1_desc">🕐 Mais recente (criação)</SelectItem>
              <SelectItem value="timer2_asc">⏱️ Mais tempo no status</SelectItem>
              <SelectItem value="timer2_desc">🕐 Menos tempo no status</SelectItem>
              <SelectItem value="quantity_desc">📦 Mais unidades</SelectItem>
              <SelectItem value="quantity_asc">📦 Menos unidades</SelectItem>
              <SelectItem value="version_desc">🔄 Mais atualizações</SelectItem>
              <SelectItem value="version_asc">🔄 Menos atualizações</SelectItem>
              <SelectItem value="alphabetical">🔤 A-Z (cliente)</SelectItem>
              <SelectItem value="order_number_asc">🔢 Nº pedido ↑</SelectItem>
              <SelectItem value="order_number_desc">🔢 Nº pedido ↓</SelectItem>
            </SelectContent>
          </Select>

          {/* Botão para limpar filtros */}
          {(searchQuery || designerFilter !== "all" || salespersonFilter !== "all" || priorityFilter !== "all" || sortOption !== "updated_at_desc") && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}

          <CardFontEditor 
            sizes={fontSizes}
            updateSize={updateSize}
            resetToDefaults={resetToDefaults}
          />

          {/* Toggle para recolher colunas vazias */}
          <Button
            variant={autoCollapseEmpty ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoCollapseEmpty(!autoCollapseEmpty)}
            title="Recolher colunas vazias automaticamente"
          >
            {autoCollapseEmpty ? "Colunas: Auto-recolher ✓" : "Colunas: Normal"}
          </Button>

          <RefreshIndicator 
            lastUpdated={lastUpdated}
            isRefreshing={isRefreshing}
            onRefresh={refresh}
          />
        </div>
      </div>

      {/* Container com altura fixa para manter scroll horizontal sempre visível */}
      <div 
        className="border rounded-lg bg-muted/30" 
        style={{ height: 'calc(100vh - 280px)' }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {loading ? (
            <div className="flex gap-4 overflow-x-auto h-full p-4">
              {[...Array(6)].map((_, i) => (
                <TaskCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto overflow-y-hidden h-full p-4">
              {visibleColumns.map((column, index) => (
                <KanbanColumn
                  key={column.status}
                  title={column.title}
                  status={column.status}
                  icon={column.icon}
                  tasks={column.tasks}
                  onTaskClick={handleTaskClick}
                  backgroundColor={columnColors[index]}
                  fontSizes={fontSizes}
                  showAcceptButton={isDesigner}
                  currentUserId={currentUserId || undefined}
                  onTaskAccepted={loadTasks}
                  collapsedCards={collapsedCards}
                  onToggleCard={toggleCard}
                  onCollapseAll={() => collapseAll(column.tasks.map(t => t.id))}
                  onExpandAll={() => expandAll(column.tasks.map(t => t.id))}
                  onOrderNumberUpdate={handleOrderNumberUpdate}
                  isCollapsed={autoCollapseEmpty && column.tasks.length === 0}
                  autoCollapseEmpty={autoCollapseEmpty}
                />
              ))}
            </div>
          )}
          
          <DragOverlay>
            {activeTask ? (
              <div className="opacity-50 rotate-3 cursor-grabbing">
                <div className="bg-card border rounded-lg p-4 shadow-lg">
                  <p className="font-semibold text-sm">{activeTask.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{activeTask.campaign_name}</p>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <TaskDetailsDialog
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onTaskUpdated={handleTaskUpdated}
        context="creation"
      />

      <ProductionConfirmDialog
        open={productionConfirmOpen}
        onOpenChange={(open) => {
          setProductionConfirmOpen(open);
          if (!open) setPendingProductionTask(null);
        }}
        task={pendingProductionTask?.task ? {
          customer_name: pendingProductionTask.task.customer_name || '',
          order_number: pendingProductionTask.task.order_number || ''
        } : null}
        onConfirm={handleProductionConfirm}
      />

      <DuplicateOrderDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        orderNumber={duplicateInfo?.orderNumber || ''}
        existingCustomerName={duplicateInfo?.existingCustomerName || ''}
      />

      <MissingOrderNumberDialog
        open={missingOrderDialogOpen}
        onOpenChange={setMissingOrderDialogOpen}
        customerName={missingOrderCustomerName}
      />
    </div>
  );
};

export default Creation;
