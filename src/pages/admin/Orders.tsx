import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TaskDetailsDialog } from "@/components/creation/TaskDetailsDialog";
import { TaskCardSkeleton } from "@/components/creation/TaskCardSkeleton";
import { TaskCard } from "@/components/creation/TaskCard";
import { DesignTask } from "@/types/design-task";
import { toast } from "sonner";
import { RefreshCw, PackageSearch, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { NewLayoutRequestDialog } from "@/components/orders/NewLayoutRequestDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { Checkbox } from "@/components/ui/checkbox";

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
  const { isSuperAdmin } = useUserRole();
  const [tasks, setTasks] = useState<DesignTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<DesignTask | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

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

  const handleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map(t => t.id));
    }
  };

  const handleSelectTask = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedTasks.length === 0) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir ${selectedTasks.length} tarefa(s)? Esta ação não pode ser desfeita.`
    );
    
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('design_tasks')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', selectedTasks);

      if (error) throw error;

      toast.success(`${selectedTasks.length} tarefa(s) excluída(s) com sucesso`);
      setSelectedTasks([]);
      loadTasks();
    } catch (error) {
      console.error("Error deleting tasks:", error);
      toast.error("Erro ao excluir tarefas");
    }
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

        <div className="flex gap-2">
          <Button 
            variant="default"
            onClick={() => setNewRequestOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Requisição
          </Button>
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

      {isSuperAdmin && tasks.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={selectedTasks.length === tasks.length && tasks.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
              Selecionar todos
              {selectedTasks.length > 0 && ` (${selectedTasks.length} selecionado${selectedTasks.length !== 1 ? 's' : ''})`}
            </label>
          </div>
          
          {selectedTasks.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Apagar Selecionados ({selectedTasks.length})
            </Button>
          )}
        </div>
      )}

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
              selectable={isSuperAdmin}
              selected={selectedTasks.includes(task.id)}
              onSelect={handleSelectTask}
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

      {/* ✅ Modal de Nova Requisição de Layout */}
      <NewLayoutRequestDialog
        open={newRequestOpen}
        onOpenChange={setNewRequestOpen}
        onSuccess={loadTasks}
      />
    </div>
  );
};

export default Orders;
