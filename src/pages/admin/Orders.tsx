import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreateOrderForm } from "@/components/orders/CreateOrderForm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { OrderTaskCard } from "@/components/orders/TaskCard";
import { TaskDetailsDialog } from "@/components/creation/TaskDetailsDialog";
import { DesignTask } from "@/types/design-task";

export default function Orders() {
  const [tasks, setTasks] = useState<DesignTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<DesignTask | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data, error } = await supabase
        .from('design_tasks')
        .select(`
          *,
          order:orders(
            customer_name,
            customer_email,
            customer_phone,
            quantity,
            customization_data,
            model:shirt_models(name, sku)
          ),
          designer:profiles!design_tasks_assigned_to_fkey(full_name),
          campaign:campaigns(name)
        `)
        .eq('created_by', user.id)
        .in('status', ['awaiting_approval', 'approved', 'completed'])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Flatten the joined data
      const flattenedTasks = (data || []).map((task: any) => ({
        ...task,
        customer_name: task.order?.customer_name,
        customer_email: task.order?.customer_email,
        customer_phone: task.order?.customer_phone,
        quantity: task.order?.quantity,
        customization_data: task.order?.customization_data,
        model_name: task.order?.model?.name,
        model_code: task.order?.model?.sku,
        designer_name: task.designer?.full_name,
        designer_initials: task.designer?.full_name?.split(' ').map((n: string) => n[0]).join(''),
        campaign_name: task.campaign?.name,
      }));

      setTasks(flattenedTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task: DesignTask) => {
    setSelectedTask(task);
    setDetailsDialogOpen(true);
  };

  const awaitingApprovalTasks = tasks.filter(t => t.status === 'awaiting_approval');
  const approvedTasks = tasks.filter(t => t.status === 'approved');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">Gerencie seus pedidos e aprovações</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadTasks}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Pedido
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Criar Novo Pedido</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[75vh] pr-4">
                <CreateOrderForm
                  onSuccess={() => {
                    setCreateDialogOpen(false);
                    loadTasks();
                  }}
                  onCancel={() => setCreateDialogOpen(false)}
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna: Mockup Pronto */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Mockup Pronto</CardTitle>
              <Badge variant="secondary">{awaitingApprovalTasks.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando sua aprovação
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {awaitingApprovalTasks.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum mockup aguardando aprovação
                </div>
              ) : (
                awaitingApprovalTasks.map((task) => (
                  <OrderTaskCard
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task)}
                  />
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Coluna: Aprovados */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Aprovados</CardTitle>
              <Badge variant="default">{approvedTasks.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Mockups aprovados e em produção
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {approvedTasks.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum pedido aprovado
                </div>
              ) : (
                approvedTasks.map((task) => (
                  <OrderTaskCard
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task)}
                  />
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Coluna: Concluídos */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Concluídos</CardTitle>
              <Badge variant="secondary">{completedTasks.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Pedidos finalizados
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {completedTasks.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum pedido concluído
                </div>
              ) : (
                completedTasks.map((task) => (
                  <OrderTaskCard
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task)}
                  />
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Detalhes da Task */}
      <TaskDetailsDialog
        task={selectedTask}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onTaskUpdated={loadTasks}
      />
    </div>
  );
}
