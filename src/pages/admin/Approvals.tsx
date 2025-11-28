import { UrgentApprovalsList } from "@/components/admin/UrgentApprovalsList";
import { ApprovalsHistory } from "@/components/admin/ApprovalsHistory";
import { DeleteApprovalsList } from "@/components/admin/DeleteApprovalsList";
import { DeleteApprovalsHistory } from "@/components/admin/DeleteApprovalsHistory";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Trash2 } from "lucide-react";
import { usePendingApprovalsCount } from "@/hooks/usePendingApprovalsCount";
import { usePendingDeletesCount } from "@/hooks/usePendingDeletesCount";
import { useCallback } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { RefreshIndicator } from "@/components/dashboard/RefreshIndicator";

const Approvals = () => {
  const { count: urgentCount } = usePendingApprovalsCount();
  const { count: deleteCount } = usePendingDeletesCount();

  const refreshData = useCallback(async () => {
    // Forçar re-render (os componentes têm seus próprios refetch)
    window.location.reload();
  }, []);

  const { lastUpdated, isRefreshing, refresh } = useAutoRefresh(
    refreshData,
    { interval: 60000, enabled: false } // Desabilitado pois tem realtime
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aprovações</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie solicitações de prioridade urgente
          </p>
        </div>
        <RefreshIndicator 
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          onRefresh={refresh}
        />
      </div>

      <Tabs defaultValue="urgent" className="w-full">
        <TabsList>
          <TabsTrigger value="urgent">
            🔴 Urgência {urgentCount > 0 && `(${urgentCount})`}
          </TabsTrigger>
          <TabsTrigger value="delete">
            🗑️ Exclusões {deleteCount > 0 && `(${deleteCount})`}
          </TabsTrigger>
        </TabsList>

        {/* ABA URGÊNCIA */}
        <TabsContent value="urgent" className="mt-6">
          <Card className="border-orange-200 bg-orange-50/50 mb-6">
            <CardHeader>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <CardTitle className="text-orange-900">Solicitações de Prioridade Urgente</CardTitle>
                  <CardDescription className="text-orange-700">
                    Vendedores precisam de aprovação administrativa para criar tarefas com prioridade urgente.
                    Revise cada solicitação e aprove ou ajuste a prioridade conforme necessário.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue="pending" className="w-full">
            <TabsList>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-6">
              <UrgentApprovalsList />
            </TabsContent>
            <TabsContent value="history" className="mt-6">
              <ApprovalsHistory />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ABA EXCLUSÕES */}
        <TabsContent value="delete" className="mt-6">
          <Card className="border-red-200 bg-red-50/50 mb-6">
            <CardHeader>
              <div className="flex items-start gap-3">
                <Trash2 className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <CardTitle className="text-red-900">Solicitações de Exclusão</CardTitle>
                  <CardDescription className="text-red-700">
                    Vendedores solicitaram a exclusão de tarefas. Revise cada solicitação e aprove ou rejeite conforme necessário.
                    Tarefas aprovadas para exclusão serão removidas do sistema.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue="pending" className="w-full">
            <TabsList>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-6">
              <DeleteApprovalsList />
            </TabsContent>
            <TabsContent value="history" className="mt-6">
              <DeleteApprovalsHistory />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Approvals;
