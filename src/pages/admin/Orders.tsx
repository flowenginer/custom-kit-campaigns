import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TaskDetailsDialog } from "@/components/creation/TaskDetailsDialog";
import { TaskCardSkeleton } from "@/components/creation/TaskCardSkeleton";
import { TaskCard } from "@/components/creation/TaskCard";
import { DesignTask } from "@/types/design-task";
import { toast } from "sonner";
import { RefreshCw, PackageSearch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Página EXCLUSIVA de Vendedores para gerenciar LEADS SEM LOGO
 * 
 * REGRAS:
 * - Exibe APENAS tarefas onde needs_logo = true
 * - Vendedor pode fazer upload da logo do cliente
 * - Após upload, tarefa vai para "pending" e aparece na página Creation para designers
 * - Designers NÃO veem esta página
 */

const Orders = () => {
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
            needs_logo,
            uploaded_logo_url
          )
        `)
        .is('deleted_at', null)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      console.log('📦 Orders.tsx - Total tasks fetched:', data?.length);

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
        designer_name: null,
        designer_initials: null,
      }));

      // ✅ Filtrar APENAS tarefas que PRECISAM de logo (needs_logo = true)
      const pendingLogoTasks = formattedTasks.filter(task => task.needs_logo === true);
      console.log('🔍 Orders.tsx - Tasks needing logo:', pendingLogoTasks.length);

      setTasks(pendingLogoTasks);

      // Atualizar tarefa selecionada se o modal estiver aberto
      if (selectedTask) {
        const updatedSelectedTask = pendingLogoTasks.find(t => t.id === selectedTask.id);
        if (updatedSelectedTask) {
          setSelectedTask(updatedSelectedTask);
        } else {
          // Tarefa não está mais na lista (logo foi enviado), fechar modal
          setDialogOpen(false);
          setSelectedTask(null);
        }
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast.error("Erro ao carregar pedidos");
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

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pedidos - Aguardando Logo</h1>
          <p className="text-muted-foreground mt-1">
            {tasks.length} pedido{tasks.length !== 1 ? 's' : ''} aguardando envio de logo do cliente
          </p>
        </div>

        <Button 
          variant="outline" 
          onClick={loadTasks}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <TaskCardSkeleton key={i} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <PackageSearch className="h-16 w-16 text-muted-foreground/50" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Nenhum pedido aguardando logo</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Todos os pedidos já possuem logo enviada ou foram encaminhados para o designer.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard 
              key={task.id}
              task={task}
              onClick={() => handleTaskClick(task)}
            />
          ))}
        </div>
      )}

      {/* ✅ Modal com contexto de VENDEDOR */}
      <TaskDetailsDialog
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onTaskUpdated={handleTaskUpdated}
        context="orders"
      />
    </div>
  );
};

export default Orders;
