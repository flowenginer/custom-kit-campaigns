import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanColumn } from "@/components/creation/KanbanColumn";
import { TaskDetailsDialog } from "@/components/creation/TaskDetailsDialog";
import { TaskCardSkeleton } from "@/components/creation/TaskCardSkeleton";
import { ColorThemePanel } from "@/components/creation/ColorThemePanel";
import { CardFontEditor } from "@/components/creation/CardFontEditor";
import { DesignTask } from "@/types/design-task";
import { useUserRole } from "@/hooks/useUserRole";
import { useCardFontSizes } from "@/hooks/useCardFontSizes";
import { useCardCollapse } from "@/hooks/useCardCollapse";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<DesignTask | null>(null);
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

  useEffect(() => {
    loadTasks();
    getCurrentUser();
  }, []);

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
    localStorage.setItem('kanban-sort-option', sortOption);
  }, [sortOption]);

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
            logo_action
          )
        `)
        .is('deleted_at', null)
        .order("updated_at", { ascending: false })
        .limit(100);

      if (error) throw error;

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
        uploaded_logo_url: task.lead?.uploaded_logo_url || null,
        created_by_salesperson: task.created_by_salesperson,
        creator_name: task.creator?.full_name || null,
        designer_name: task.designer?.full_name || null,
        designer_initials: task.designer?.full_name 
          ? task.designer.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          : null,
        status_changed_at: task.status_changed_at,
      }));

      setTasks(formattedTasks);

      // Atualizar tarefa selecionada se o modal estiver aberto
      if (selectedTask) {
        const updatedSelectedTask = formattedTasks.find(t => t.id === selectedTask.id);
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
    } catch (error) {
      console.error("Error updating order number:", error);
      toast.error("Erro ao atualizar número do pedido");
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
        toast.error("É obrigatório preencher o número do pedido antes de enviar para Produção");
        return;
      }
      
      const confirm = window.confirm("Tem certeza que deseja enviar para Produção?");
      if (!confirm) return;
    }

    try {
      const { error } = await supabase
        .from("design_tasks")
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
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
    </div>
  );
};

export default Creation;
