import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanColumn } from "@/components/creation/KanbanColumn";
import { TaskDetailsDialog } from "@/components/creation/TaskDetailsDialog";
import { TaskCardSkeleton } from "@/components/creation/TaskCardSkeleton";
import { DesignTask } from "@/types/design-task";
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadTasks();
  }, []);

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
          lead:leads!design_tasks_lead_id_fkey (
            needs_logo
          )
        `)
        .is('deleted_at', null)
        .not('lead.needs_logo', 'eq', true)
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
        model_name: task.orders?.shirt_models?.name,
        model_code: task.orders?.shirt_models?.sku,
        needs_logo: task.lead?.needs_logo,
        created_by_salesperson: task.created_by_salesperson,
        creator_name: task.creator?.full_name || null,
        designer_name: null,
        designer_initials: null,
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

    // Validações de negócio
    if (newStatus === 'awaiting_approval' && !task.assigned_to) {
      toast.error("A tarefa precisa estar atribuída a um designer para ser enviada para aprovação");
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

  const columns = [
    {
      title: "Novos",
      status: "pending" as const,
      icon: Inbox,
      tasks: tasks.filter(t => t.status === "pending"),
    },
    {
      title: "Em Progresso",
      status: "in_progress" as const,
      icon: Palette,
      tasks: tasks.filter(t => t.status === "in_progress"),
    },
    {
      title: "Aguard. Aprovação",
      status: "awaiting_approval" as const,
      icon: Eye,
      tasks: tasks.filter(t => t.status === "awaiting_approval"),
    },
    {
      title: "Revisão Necessária",
      status: "changes_requested" as const,
      icon: AlertCircle,
      tasks: tasks.filter(t => t.status === "changes_requested"),
    },
    {
      title: "Aprovado",
      status: "approved" as const,
      icon: CheckCircle,
      tasks: tasks.filter(t => t.status === "approved"),
    },
    {
      title: "Produção",
      status: "completed" as const,
      icon: Package,
      tasks: tasks.filter(t => t.status === "completed"),
    },
  ];

  const inProgressCount = tasks.filter(t => t.status === "in_progress").length;

  return (
    <div className="p-8 space-y-6">
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
            {columns.map((column) => (
              <KanbanColumn
                key={column.status}
                title={column.title}
                status={column.status}
                icon={column.icon}
                tasks={column.tasks}
                onTaskClick={handleTaskClick}
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
      />
    </div>
  );
};

export default Creation;
