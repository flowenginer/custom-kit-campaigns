import { UrgentApprovalsList } from "@/components/admin/UrgentApprovalsList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

const Approvals = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Aprovações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie solicitações de prioridade urgente
        </p>
      </div>

      <Card className="border-orange-200 bg-orange-50/50">
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

      <UrgentApprovalsList />
    </div>
  );
};

export default Approvals;
