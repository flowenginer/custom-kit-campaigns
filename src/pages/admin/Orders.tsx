import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TaskDetailsDialog } from "@/components/creation/TaskDetailsDialog";
import { TaskCardSkeleton } from "@/components/creation/TaskCardSkeleton";
import { TaskCard } from "@/components/creation/TaskCard";
import { DesignTask } from "@/types/design-task";
import { toast } from "sonner";
import { PackageSearch, Plus, Trash2, AlertTriangle, RefreshCw, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { NewLayoutRequestDialog } from "@/components/orders/NewLayoutRequestDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { Checkbox } from "@/components/ui/checkbox";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { RefreshIndicator } from "@/components/dashboard/RefreshIndicator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DeleteReasonDialog } from "@/components/orders/DeleteReasonDialog";
import { OrdersHistoryTab } from "@/components/orders/OrdersHistoryTab";

/**
 * Página EXCLUSIVA de Vendedores para gerenciar LEADS SEM LOGO
 * 
 * REGRAS:
 * - Exibe APENAS tarefas onde needs_logo = true
 * - Vendedor pode fazer upload da logo do cliente
 * - Após upload, tarefa vai para "pending" e aparece na página Creation para designers
 * - Designers NÃO veem esta página
 * - NOVA FEATURE: Exibe tarefas rejeitadas pelo designer
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

const Orders = () => {
  const { isSuperAdmin, isAdmin, isSalesperson } = useUserRole();
  const [tasks, setTasks] = useState<DesignTask[]>([]);
  const [rejectedTasks, setRejectedTasks] = useState<DesignTask[]>([]);
  const [taskRejections, setTaskRejections] = useState<Record<string, TaskRejection>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<DesignTask | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [deleteDialogTask, setDeleteDialogTask] = useState<DesignTask | null>(null);
  const [editingRejectedTask, setEditingRejectedTask] = useState(false);

  const refreshData = useCallback(async () => {
    await loadTasks();
  }, []);

  const { lastUpdated, isRefreshing, refresh } = useAutoRefresh(
    refreshData,
    { interval: 60000, enabled: true }
  );

  // Primeiro carregar o usuário
  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    loadCurrentUser();
  }, []);

  // Carregar tarefas APENAS quando temos as informações do usuário
  // Para vendedores, precisamos esperar currentUserId para filtrar corretamente
  useEffect(() => {
    // Se é vendedor e currentUserId ainda não carregou, não fazer nada
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
        logo_action: task.lead?.logo_action,
        uploaded_logo_url: task.lead?.uploaded_logo_url || null,
        salesperson_status: task.lead?.salesperson_status,
        created_by_salesperson: task.created_by_salesperson,
        creator_name: task.creator?.full_name || null,
        designer_name: null,
        designer_initials: null,
      }));

      // ✅ Filtrar tarefas AGUARDANDO logo (waiting_client)
      let pendingLogoTasks = formattedTasks.filter(task => 
        task.needs_logo === true && task.logo_action === 'waiting_client' &&
        (task as any).salesperson_status !== 'rejected_by_designer'
      );
      console.log('🔍 Orders.tsx - Tasks waiting for client logo:', pendingLogoTasks.length);

      // ✅ Filtrar tarefas REJEITADAS pelo designer
      let rejectedByDesigner = formattedTasks.filter(task =>
        (task as any).salesperson_status === 'rejected_by_designer'
      );
      console.log('🔴 Orders.tsx - Tasks rejected by designer:', rejectedByDesigner.length);

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
        pendingLogoTasks = pendingLogoTasks.filter(task => task.created_by === currentUserId);
        rejectedByDesigner = rejectedByDesigner.filter(task => task.created_by === currentUserId);
        console.log('👤 Orders.tsx - Filtered by salesperson:', pendingLogoTasks.length);
      }

      setTasks(pendingLogoTasks);
      setRejectedTasks(rejectedByDesigner);

      // Atualizar tarefa selecionada se o modal estiver aberto
      if (selectedTask) {
        const allTasks = [...pendingLogoTasks, ...rejectedByDesigner];
        const updatedSelectedTask = allTasks.find(t => t.id === selectedTask.id);
        if (updatedSelectedTask) {
          setSelectedTask(updatedSelectedTask);
        } else {
          // Tarefa não está mais na lista, fechar modal
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
    setEditingRejectedTask(false);
    setSelectedTask(task);
    setDialogOpen(true);
  };

  const handleTaskUpdated = () => {
    loadTasks();
  };

  const handleSelectAll = () => {
    const currentTasks = activeTab === 'pending' ? tasks : rejectedTasks;
    if (selectedTasks.length === currentTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(currentTasks.map(t => t.id));
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

  const currentTasks = activeTab === 'pending' ? tasks : rejectedTasks;
  const totalCount = tasks.length + rejectedTasks.length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pedidos - Aguardando Logo</h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} pedido{totalCount !== 1 ? 's' : ''} aguardando ação
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
          
          <RefreshIndicator 
            lastUpdated={lastUpdated}
            isRefreshing={isRefreshing}
            onRefresh={refresh}
          />
        </div>
      </div>

      {/* Tabs para separar pendentes e rejeitadas */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Aguardando Logo
            {tasks.length > 0 && (
              <Badge variant="secondary" className="ml-1">{tasks.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Devolvidas
            {rejectedTasks.length > 0 && (
              <Badge variant="destructive" className="ml-1">{rejectedTasks.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            📋 Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {isSuperAdmin && tasks.length > 0 && (
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-pending"
                  checked={selectedTasks.length === tasks.length && tasks.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all-pending" className="text-sm font-medium cursor-pointer">
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
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-4">
          {rejectedTasks.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                <AlertTriangle className="h-16 w-16 text-muted-foreground/50" />
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">Nenhuma tarefa devolvida</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Tarefas devolvidas pelos designers aparecerão aqui.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {rejectedTasks.map((task) => {
                const rejection = taskRejections[task.id];
                const reasonLabel = rejection ? REJECTION_REASONS[rejection.reason_type] || rejection.reason_type : 'Motivo não especificado';
                
                return (
                    <Card key={task.id} className="border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/40">
                    <CardContent className="p-4 space-y-4">
                      {/* Alert de rejeição */}
                      <Alert className="bg-white dark:bg-gray-800 border-red-400 dark:border-red-600">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <AlertTitle className="text-red-700 dark:text-red-300 font-semibold">Tarefa Devolvida pelo Designer</AlertTitle>
                        <AlertDescription className="space-y-1 text-gray-700 dark:text-gray-300">
                          <p><span className="font-medium text-red-600 dark:text-red-400">Motivo:</span> {reasonLabel}</p>
                          {rejection?.reason_text && (
                            <p><span className="font-medium text-red-600 dark:text-red-400">Observação:</span> {rejection.reason_text}</p>
                          )}
                        </AlertDescription>
                      </Alert>

                      {/* Info da tarefa */}
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{task.customer_name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {task.campaign_name || 'Layout do Zero'} • {task.quantity} unidades
                          </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-400 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-950"
                            onClick={() => setDeleteDialogTask(task)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Solicitar Exclusão
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTaskClick(task)}
                          >
                            Ver Detalhes
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEditRejectedTask(task)}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Editar / Nova Logo
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleResendToDesigner(task)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reenviar ao Designer
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <OrdersHistoryTab />
        </TabsContent>
      </Tabs>

      {/* ✅ Modal com contexto de VENDEDOR */}
      <TaskDetailsDialog
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingRejectedTask(false);
        }}
        onTaskUpdated={handleTaskUpdated}
        context="orders"
        isEditingRejected={editingRejectedTask}
      />

      {/* ✅ Modal de Nova Requisição de Layout */}
      <NewLayoutRequestDialog
        open={newRequestOpen}
        onOpenChange={setNewRequestOpen}
        onSuccess={loadTasks}
      />

      {/* ✅ Modal de Solicitar Exclusão */}
      {deleteDialogTask && (
        <DeleteReasonDialog
          open={!!deleteDialogTask}
          onOpenChange={(open) => !open && setDeleteDialogTask(null)}
          taskId={deleteDialogTask.id}
          onSuccess={() => {
            setDeleteDialogTask(null);
            loadTasks();
          }}
        />
      )}
    </div>
  );
};

export default Orders;
