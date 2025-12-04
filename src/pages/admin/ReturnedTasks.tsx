import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TaskDetailsDialog } from "@/components/creation/TaskDetailsDialog";
import { TaskCardSkeleton } from "@/components/creation/TaskCardSkeleton";
import { DesignTask } from "@/types/design-task";
import { toast } from "sonner";
import { AlertTriangle, Upload, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { RefreshIndicator } from "@/components/dashboard/RefreshIndicator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Página de Tarefas Devolvidas pelos Designers
 * 
 * Exibe tarefas que foram rejeitadas pelos designers
 * para que os vendedores possam corrigir e reenviar
 */

interface TaskRejection {
  id: string;
  task_id: string;
  reason_type: string;
  reason_text: string | null;
  created_at: string;
  resolved: boolean;
}

const REJECTION_REASONS: Record<string, string> = {
  'low_quality_logo': '📷 Logo com baixa qualidade',
  'missing_logo': '🖼️ Logo não enviada ou incompleta',
  'missing_info': '📋 Falta informações no pedido',
  'incomplete_specs': '🎨 Especificações incompletas',
  'wrong_format': '📁 Formato de arquivo incorreto',
  'other': '❓ Outro motivo',
};

const ReturnedTasks = () => {
  const { isSuperAdmin, isAdmin, isSalesperson } = useUserRole();
  const [tasks, setTasks] = useState<DesignTask[]>([]);
  const [taskRejections, setTaskRejections] = useState<Record<string, TaskRejection>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<DesignTask | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingRejectedTask, setEditingRejectedTask] = useState(false);

  const refreshData = useCallback(async () => {
    await loadTasks();
  }, []);

  const { lastUpdated, isRefreshing, refresh } = useAutoRefresh(
    refreshData,
    { interval: 30000, enabled: true }
  );

  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (isSalesperson && !isSuperAdmin && !isAdmin && currentUserId === null) {
      return;
    }
    loadTasks();
  }, [currentUserId, isSalesperson, isSuperAdmin, isAdmin]);

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
            uploaded_logo_url,
            logo_action,
            salesperson_status
          )
        `)
        .is('deleted_at', null)
        .order("updated_at", { ascending: false });

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
        logo_action: task.lead?.logo_action,
        uploaded_logo_url: task.lead?.uploaded_logo_url || null,
        salesperson_status: task.lead?.salesperson_status,
        created_by_salesperson: task.created_by_salesperson,
        creator_name: task.creator?.full_name || null,
        designer_name: null,
        designer_initials: null,
      }));

      // Filtrar tarefas REJEITADAS pelo designer
      let rejectedByDesigner = formattedTasks.filter(task =>
        (task as any).salesperson_status === 'rejected_by_designer'
      );

      // Buscar detalhes das rejeições
      if (rejectedByDesigner.length > 0) {
        const taskIds = rejectedByDesigner.map(t => t.id);
        const { data: rejections } = await supabase
          .from('task_rejections')
          .select('*')
          .in('task_id', taskIds)
          .eq('resolved', false)
          .order('created_at', { ascending: false });

        if (rejections) {
          const rejectionsMap: Record<string, TaskRejection> = {};
          rejections.forEach(r => {
            if (!rejectionsMap[r.task_id]) {
              rejectionsMap[r.task_id] = r as TaskRejection;
            }
          });
          setTaskRejections(rejectionsMap);
        }
      }

      // Filtrar por vendedor se não for admin
      if (isSalesperson && !isSuperAdmin && !isAdmin && currentUserId) {
        rejectedByDesigner = rejectedByDesigner.filter(task => task.created_by === currentUserId);
      }

      setTasks(rejectedByDesigner);

      // Atualizar tarefa selecionada se o modal estiver aberto
      if (selectedTask) {
        const updatedSelectedTask = rejectedByDesigner.find(t => t.id === selectedTask.id);
        if (updatedSelectedTask) {
          setSelectedTask(updatedSelectedTask);
        } else {
          setDialogOpen(false);
          setSelectedTask(null);
        }
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast.error("Erro ao carregar tarefas devolvidas");
    } finally {
      setLoading(false);
    }
  };

  const handleResendToDesigner = async (task: DesignTask) => {
    try {
      // Marcar rejeição como resolvida
      if (taskRejections[task.id]) {
        await supabase
          .from('task_rejections')
          .update({ 
            resolved: true, 
            resolved_at: new Date().toISOString(),
            resolved_by: currentUserId
          })
          .eq('id', taskRejections[task.id].id);
      }

      // Atualizar lead para remover status de rejeitado
      if (task.lead_id) {
        await supabase
          .from('leads')
          .update({
            salesperson_status: 'sent_to_designer',
            needs_logo: false,
          })
          .eq('id', task.lead_id);
      }

      // Registrar no histórico
      await supabase.from('design_task_history').insert({
        task_id: task.id,
        user_id: currentUserId,
        action: 'resent_to_designer',
        notes: 'Tarefa reenviada ao designer após correção',
      });

      toast.success("Tarefa reenviada para o designer!");
      loadTasks();
    } catch (error) {
      console.error("Error resending task:", error);
      toast.error("Erro ao reenviar tarefa");
    }
  };

  const handleEditRejectedTask = (task: DesignTask) => {
    setEditingRejectedTask(true);
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
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            Tarefas Devolvidas
          </h1>
          <p className="text-muted-foreground mt-1">
            {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''} devolvida{tasks.length !== 1 ? 's' : ''} pelo designer
          </p>
        </div>

        <RefreshIndicator 
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          onRefresh={refresh}
        />
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
            <AlertTriangle className="h-16 w-16 text-muted-foreground/50" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Nenhuma tarefa devolvida</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Tarefas devolvidas pelos designers aparecerão aqui para você corrigir e reenviar.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => {
            const rejection = taskRejections[task.id];
            const reasonLabel = rejection ? REJECTION_REASONS[rejection.reason_type] || rejection.reason_type : 'Motivo não especificado';
            
            return (
              <Card key={task.id} className="border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 hover:shadow-lg transition-shadow">
                <CardContent className="p-4 space-y-4">
                  {/* Alert de rejeição */}
                  <Alert className="bg-white dark:bg-gray-800 border-amber-400 dark:border-amber-600">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="text-amber-700 dark:text-amber-300 font-semibold">
                      Tarefa Devolvida
                    </AlertTitle>
                    <AlertDescription className="space-y-1 text-gray-700 dark:text-gray-300">
                      <p><span className="font-medium text-amber-600 dark:text-amber-400">Motivo:</span> {reasonLabel}</p>
                      {rejection?.reason_text && (
                        <p className="text-sm italic">"{rejection.reason_text}"</p>
                      )}
                    </AlertDescription>
                  </Alert>

                  {/* Info do cliente */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-lg">{task.customer_name}</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>📦 {task.quantity} unidade{task.quantity !== 1 ? 's' : ''}</p>
                      {task.campaign_name && <p>🏷️ {task.campaign_name}</p>}
                      {task.model_name && <p>👕 {task.model_name}</p>}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditRejectedTask(task)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Corrigir
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-amber-600 hover:bg-amber-700"
                      onClick={() => handleResendToDesigner(task)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reenviar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedTask && (
        <TaskDetailsDialog
          task={selectedTask}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onTaskUpdated={handleTaskUpdated}
          isEditingRejected={editingRejectedTask}
        />
      )}
    </div>
  );
};

export default ReturnedTasks;
