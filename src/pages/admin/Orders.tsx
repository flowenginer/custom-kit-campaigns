import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Clock, CheckCircle, Package } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreateOrderForm } from "@/components/orders/CreateOrderForm";
import { OrderTaskCard } from "@/components/orders/TaskCard";
import { TaskDetailsDialog } from "@/components/creation/TaskDetailsDialog";
import { DesignTask } from "@/types/design-task";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderFilters, OrderFilterOptions } from "@/components/orders/OrderFilters";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDebounce } from "use-debounce";

export default function Orders() {
  const [tasks, setTasks] = useState<DesignTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DesignTask | null>(null);
  const [filters, setFilters] = useState<OrderFilterOptions>({
    dateRange: undefined,
    statuses: [],
    campaigns: [],
  });
  const [recentlyUpdatedTasks, setRecentlyUpdatedTasks] = useState<Set<string>>(new Set());
  
  const [debouncedFilters] = useDebounce(filters, 500);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No user found");
        return;
      }

      let query = supabase
        .from("design_tasks")
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
          campaign:campaigns(name),
          lead:leads!design_tasks_lead_id_fkey (
            needs_logo
          )
        `)
        .is('deleted_at', null)
        .or(`created_by.eq.${user.id},created_by.is.null`)
        .eq('lead.needs_logo', true);

      // Apply date range filter
      if (debouncedFilters.dateRange?.from) {
        query = query.gte("created_at", debouncedFilters.dateRange.from.toISOString());
      }
      if (debouncedFilters.dateRange?.to) {
        const toDate = new Date(debouncedFilters.dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        query = query.lte("created_at", toDate.toISOString());
      }

      // Apply status filter
      if (debouncedFilters.statuses.length > 0) {
        query = query.in("status", debouncedFilters.statuses as any);
      } else {
        // Default: show only these 3 statuses
        query = query.in("status", ["awaiting_approval", "approved", "completed"] as any);
      }

      // Apply campaign filter
      if (debouncedFilters.campaigns.length > 0) {
        query = query.in("campaign_id", debouncedFilters.campaigns);
      }

      query = query.order("updated_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("Error loading tasks:", error);
        return;
      }

      const flattenedTasks = (data || []).map((task) => {
        const orderData = Array.isArray(task.order) ? task.order[0] : task.order;
        const modelData = orderData?.model && (Array.isArray(orderData.model) ? orderData.model[0] : orderData.model);
        const designerData = Array.isArray(task.designer) ? task.designer[0] : task.designer;
        const campaignData = Array.isArray(task.campaign) ? task.campaign[0] : task.campaign;
        const leadData = task.lead;

        return {
          ...task,
          design_files: (task.design_files as any) || [],
          customer_name: orderData?.customer_name,
          customer_email: orderData?.customer_email,
          customer_phone: orderData?.customer_phone,
          quantity: orderData?.quantity,
          customization_data: orderData?.customization_data,
          model_name: modelData?.name,
          model_code: modelData?.sku,
          designer_name: designerData?.full_name,
          campaign_name: campaignData?.name,
          needs_logo: leadData?.needs_logo,
        } as DesignTask;
      });

      setTasks(flattenedTasks);
    } catch (error) {
      console.error("Error in loadTasks:", error);
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Setup realtime subscription
  useEffect(() => {
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel("orders-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "design_tasks",
            filter: `created_by=eq.${user.id}`,
          },
          (payload) => {
            console.log("🔔 Mudança em design_tasks:", payload);

            const eventType = payload.eventType;
            const newRecord = payload.new as DesignTask;
            const oldRecord = payload.old as DesignTask;

            if (eventType === "INSERT") {
              toast.success("Novo pedido adicionado!");
              loadTasks();
            } else if (eventType === "UPDATE") {
              // Status changed
              if (oldRecord?.status !== newRecord?.status) {
                if (newRecord.status === "awaiting_approval") {
                  toast.success("✅ Mockup pronto para aprovação!", {
                    description: `O mockup de ${newRecord.customer_name || "cliente"} está pronto.`,
                    action: {
                      label: "Ver Mockup",
                      onClick: () => {
                        setSelectedTask(newRecord);
                      },
                    },
                  });
                } else if (newRecord.status === "approved") {
                  toast.success("🎉 Mockup aprovado!");
                } else if (newRecord.status === "completed") {
                  toast.success("📦 Pedido enviado para produção!");
                }
              }

              // Add visual feedback
              setRecentlyUpdatedTasks((prev) => new Set(prev).add(newRecord.id));
              setTimeout(() => {
                setRecentlyUpdatedTasks((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(newRecord.id);
                  return newSet;
                });
              }, 3000);

              // Update task in state
              setTasks((prev) =>
                prev.map((task) =>
                  task.id === newRecord.id ? { ...task, ...newRecord } : task
                )
              );
            } else if (eventType === "DELETE") {
              setTasks((prev) => prev.filter((task) => task.id !== oldRecord.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtime();
  }, [loadTasks]);

  const handleTaskClick = (task: DesignTask) => {
    setSelectedTask(task);
  };

  const handleFiltersChange = useCallback((newFilters: OrderFilterOptions) => {
    setFilters(newFilters);
  }, []);

  const awaitingApprovalTasks = useMemo(
    () => tasks.filter((t) => t.status === "awaiting_approval"),
    [tasks]
  );
  const approvedTasks = useMemo(
    () => tasks.filter((t) => t.status === "approved"),
    [tasks]
  );
  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === "completed"),
    [tasks]
  );

  const activeFiltersCount =
    (filters.dateRange?.from ? 1 : 0) +
    filters.statuses.length +
    filters.campaigns.length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">Gerencie seus pedidos e aprovações</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadTasks} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Atualizar
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Pedido
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Pedido</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar um novo pedido
                </DialogDescription>
              </DialogHeader>
              <CreateOrderForm
                onSuccess={() => {
                  setCreateDialogOpen(false);
                  loadTasks();
                }}
                onCancel={() => setCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <OrderFilters onFiltersChange={handleFiltersChange} />

      {/* Grid de colunas Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Mockup Pronto - awaiting_approval */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Mockup Pronto
            </CardTitle>
            <CardDescription>
              Aguardando sua aprovação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </>
            ) : awaitingApprovalTasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {activeFiltersCount > 0
                    ? "Nenhum pedido encontrado com os filtros aplicados"
                    : "Nenhum mockup aguardando aprovação"}
                </p>
              </div>
            ) : (
              awaitingApprovalTasks.map((task) => (
                <OrderTaskCard
                  key={task.id}
                  task={task}
                  onClick={() => handleTaskClick(task)}
                  className={cn(
                    "transition-all duration-300",
                    recentlyUpdatedTasks.has(task.id) && "ring-2 ring-primary animate-pulse"
                  )}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Aprovados - approved */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Aprovados
            </CardTitle>
            <CardDescription>
              Mockups aprovados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </>
            ) : approvedTasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                  <CheckCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {activeFiltersCount > 0
                    ? "Nenhum pedido encontrado com os filtros aplicados"
                    : "Nenhum pedido aprovado"}
                </p>
              </div>
            ) : (
              approvedTasks.map((task) => (
                <OrderTaskCard
                  key={task.id}
                  task={task}
                  onClick={() => handleTaskClick(task)}
                  className={cn(
                    "transition-all duration-300",
                    recentlyUpdatedTasks.has(task.id) && "ring-2 ring-primary animate-pulse"
                  )}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Concluídos - completed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" />
              Concluídos
            </CardTitle>
            <CardDescription>
              Enviados para produção
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </>
            ) : completedTasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {activeFiltersCount > 0
                    ? "Nenhum pedido encontrado com os filtros aplicados"
                    : "Nenhum pedido concluído"}
                </p>
              </div>
            ) : (
              completedTasks.map((task) => (
                <OrderTaskCard
                  key={task.id}
                  task={task}
                  onClick={() => handleTaskClick(task)}
                  className={cn(
                    "transition-all duration-300",
                    recentlyUpdatedTasks.has(task.id) && "ring-2 ring-primary animate-pulse"
                  )}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Details Dialog */}
      {selectedTask && (
        <TaskDetailsDialog
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedTask(null);
            }
          }}
          onTaskUpdated={loadTasks}
        />
      )}
    </div>
  );
}
