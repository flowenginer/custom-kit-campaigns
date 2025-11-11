import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanColumn } from "@/components/creation/KanbanColumn";
import { TaskDetailsDialog } from "@/components/creation/TaskDetailsDialog";
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

const Creation = () => {
  const [tasks, setTasks] = useState<DesignTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<DesignTask | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("design_tasks")
        .select(`
          *,
          orders!inner (
            customer_name,
            customer_email,
            customer_phone,
            quantity,
            customization_data
          ),
          campaigns (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedTasks: DesignTask[] = (data || []).map((task: any) => ({
        ...task,
        customer_name: task.orders?.customer_name,
        customer_email: task.orders?.customer_email,
        customer_phone: task.orders?.customer_phone,
        quantity: task.orders?.quantity,
        customization_data: task.orders?.customization_data,
        campaign_name: task.campaigns?.name,
        designer_name: null, // TODO: Join with profiles
        designer_initials: null,
      }));

      setTasks(formattedTasks);
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
    setDialogOpen(false);
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

      <div className="grid grid-cols-6 gap-4 overflow-x-auto pb-4">
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
