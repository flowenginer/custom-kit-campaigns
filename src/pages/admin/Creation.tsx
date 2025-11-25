import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanColumn } from "@/components/creation/KanbanColumn";
import { TaskDetailsDialog } from "@/components/creation/TaskDetailsDialog";
import { TaskCardSkeleton } from "@/components/creation/TaskCardSkeleton";
import { ColorThemePanel } from "@/components/creation/ColorThemePanel";
import { DesignTask } from "@/types/design-task";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { 
  RefreshCw, 
  Inbox, 
  Palette, 
  Eye, 
  CheckCircle, 
  AlertCircle,
  Package
} from "lucide-react";
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
  
  const { allowedKanbanColumns, isSuperAdmin, isAdmin, isDesigner } = useUserRole();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
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
          created_by,
          created_by_salesperson,
          orders!inner (
            customer_name,
            customer_email,
            customer_phone,
            quantity,
            customization_data,
            model_id,
            shirt_models (
              name,
              sku
            )
          ),
          campaigns (
            name
          ),
          creator:profiles!design_tasks_created_by_fkey (
            full_name
          ),
          designer:profiles!design_tasks_assigned_to_fkey (
            full_name
          ),
          lead:leads!design_tasks_lead_id_fkey (
            needs_logo,
            uploaded_logo_url
          )
        `)
        .is('deleted_at', null)
        .order("updated_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      console.log('📊 Creation.tsx - Total tasks before filter:', data?.length);

      const formattedTasks: DesignTask[] = (data || []).map((task: any) => ({
        ...task,
        customer_name: task.orders?.customer_name,
        customer_email: task.orders?.customer_email,
        customer_phone: task.orders?.customer_phone,
        quantity: task.orders?.quantity,
        customization_data: task.orders?.customization_data,
        campaign_name: task.campaigns?.name,
        model_name: task.orders?.shirt_models?.name,
        model_code: task.orders?.shirt_models?.sku,
        needs_logo: task.lead?.needs_logo,
        uploaded_logo_url: task.lead?.uploaded_logo_url || null,
        created_by_salesperson: task.created_by_salesperson,
        creator_name: task.creator?.full_name || null,
        designer_name: task.designer?.full_name || null,
        designer_initials: task.designer?.full_name 
          ? task.designer.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          : null,
      }));

      // ✅ Filtrar no frontend: Designers NÃO veem tarefas que precisam de logo
      // Tasks com needs_logo=true aparecem APENAS na página Orders (Vendedores)
      const designerTasks = formattedTasks.filter(task => task.needs_logo !== true);
      console.log('✅ Creation.tsx - Designer tasks (needs_logo !== true):', designerTasks.length);

      setTasks(designerTasks);

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

    // Validações de negócio
    if (newStatus === 'awaiting_approval' && !task.assigned_to) {
      toast.error("A tarefa precisa estar atribuída a um designer para ser enviada para aprovação");
      return;
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

  const columns = [
    {
      title: "Leads sem Logo",
      status: "logo_needed" as const,
      icon: Inbox,
      tasks: filterTasksForDesigner(tasks.filter(t => t.needs_logo === true)),
    },
    {
      title: "Novos Com Logo",
      status: "pending" as const,
      icon: Inbox,
      tasks: filterTasksForDesigner(tasks.filter(t => !t.needs_logo && t.status === "pending")),
    },
    {
      title: "Em Progresso",
      status: "in_progress" as const,
      icon: Palette,
      tasks: filterTasksForDesigner(tasks.filter(t => t.status === "in_progress")),
    },
    {
      title: "Aguard. Aprovação",
      status: "awaiting_approval" as const,
      icon: Eye,
      tasks: filterTasksForDesigner(tasks.filter(t => t.status === "awaiting_approval")),
    },
    {
      title: "Revisão Necessária",
      status: "changes_requested" as const,
      icon: AlertCircle,
      tasks: filterTasksForDesigner(tasks.filter(t => t.status === "changes_requested")),
    },
    {
      title: "Aprovado",
      status: "approved" as const,
      icon: CheckCircle,
      tasks: filterTasksForDesigner(tasks.filter(t => t.status === "approved")),
    },
    {
      title: "Produção",
      status: "completed" as const,
      icon: Package,
      tasks: filterTasksForDesigner(tasks.filter(t => t.status === "completed")),
    },
  ];

  // 🆕 FILTRAR COLUNAS BASEADO EM PERMISSÕES (Super Admin vê todas)
  const visibleColumns = isSuperAdmin 
    ? columns 
    : columns.filter(col => allowedKanbanColumns.includes(col.status));

  console.log('📊 Colunas Visíveis:', visibleColumns.map(c => c.title), '| Total:', visibleColumns.length);

  const inProgressCount = tasks.filter(t => t.status === "in_progress").length;

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

        <div className="flex gap-2">
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="urgent">🔴 Urgente</SelectItem>
              <SelectItem value="high">🟠 Alta</SelectItem>
              <SelectItem value="normal">🟡 Normal</SelectItem>
              <SelectItem value="low">🟢 Baixa</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            onClick={loadTasks}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[...Array(6)].map((_, i) => (
              <TaskCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {visibleColumns.map((column, index) => (
              <KanbanColumn
                key={column.status}
                title={column.title}
                status={column.status}
                icon={column.icon}
                tasks={column.tasks}
                onTaskClick={handleTaskClick}
                backgroundColor={columnColors[index]}
                showAcceptButton={isDesigner}
                currentUserId={currentUserId || undefined}
                onTaskAccepted={loadTasks}
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
