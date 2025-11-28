import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { TaskPriority } from "@/types/design-task";

interface PendingUrgentRequest {
  id: string;
  request_data: any;
  requested_priority: TaskPriority;
  requested_by: string;
  requested_at: string;
  status: string;
  requester_name?: string;
  urgent_reason?: {
    label: string;
    description: string | null;
  } | null;
  urgent_reason_text?: string | null;
}

export const UrgentApprovalsList = () => {
  const [requests, setRequests] = useState<PendingUrgentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PendingUrgentRequest | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [finalPriority, setFinalPriority] = useState<TaskPriority>("urgent");
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pending_urgent_requests")
        .select(`
          *,
          requester:profiles!pending_urgent_requests_requested_by_fkey(
            full_name
          ),
          urgent_reason:urgent_reasons!pending_urgent_requests_urgent_reason_id_fkey(
            label,
            description
          )
        `)
        .eq("status", "pending")
        .order("requested_at", { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((req: any) => ({
        ...req,
        requester_name: req.requester?.full_name || "Vendedor",
      })) || [];

      setRequests(formattedData);
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
      toast.error("Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const requestData = selectedRequest.request_data;

      // 1. Upload logo if exists
      let logoUrl = requestData.logoUrl;
      if (requestData.hasLogo && requestData.logoFile) {
        // Logo handling would go here
      }

      // 2. Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          campaign_id: requestData.campaignId,
          model_id: requestData.model?.id,
          customer_name: requestData.customer.name,
          customer_phone: requestData.customer.phone,
          customer_email: requestData.customer.email,
          quantity: requestData.quantity,
          customization_data: requestData.customization,
          session_id: `urgent-${selectedRequest.id}`,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 3. Create lead
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert({
          campaign_id: requestData.campaignId,
          name: requestData.customer.name,
          phone: requestData.customer.phone,
          email: requestData.customer.email,
          quantity: String(requestData.quantity),
          customization_summary: requestData.customization,
          needs_logo: requestData.hasLogo,
          uploaded_logo_url: logoUrl,
          order_id: order.id,
          session_id: `urgent-${selectedRequest.id}`,
          completed: true,
          created_by: selectedRequest.requested_by,
          created_by_salesperson: true,
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // 4. Update design_task with lead_id and priority
      const { data: task, error: taskError } = await supabase
        .from("design_tasks")
        .update({
          lead_id: lead.id,
          priority: finalPriority,
        })
        .eq("order_id", order.id)
        .select()
        .single();

      if (taskError) throw taskError;

      // 5. Update pending request status
      const { error: updateError } = await supabase
        .from("pending_urgent_requests")
        .update({
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          final_priority: finalPriority,
          created_order_id: order.id,
          created_task_id: task.id,
        })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      // 6. Notify requester
      await supabase.from("notifications").insert({
        user_id: selectedRequest.requested_by,
        title: "✅ Solicitação de Urgência Aprovada",
        message: `Sua solicitação para ${requestData.customer.name} foi aprovada com prioridade ${getPriorityLabel(finalPriority)}`,
        type: "urgent_approved",
        task_id: task.id,
      });

      toast.success("Solicitação aprovada com sucesso!");
      setShowApprovalDialog(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (error) {
      console.error("Erro ao aprovar:", error);
      toast.error("Erro ao aprovar solicitação");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error("Informe o motivo da rejeição");
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Update pending request status
      const { error: updateError } = await supabase
        .from("pending_urgent_requests")
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      // Notify requester
      await supabase.from("notifications").insert({
        user_id: selectedRequest.requested_by,
        title: "❌ Solicitação de Urgência Rejeitada",
        message: `Sua solicitação foi rejeitada. Motivo: ${rejectionReason}`,
        type: "urgent_rejected",
      });

      toast.success("Solicitação rejeitada");
      setShowRejectionDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
      loadRequests();
    } catch (error) {
      console.error("Erro ao rejeitar:", error);
      toast.error("Erro ao rejeitar solicitação");
    } finally {
      setProcessing(false);
    }
  };

  const getPriorityLabel = (priority: TaskPriority) => {
    const labels: Record<TaskPriority, string> = {
      normal: "🟡 Normal",
      urgent: "🔴 Urgente",
    };
    return labels[priority];
  };

  const getPriorityColor = (priority: TaskPriority) => {
    const colors: Record<TaskPriority, string> = {
      normal: "bg-yellow-100 text-yellow-800",
      urgent: "bg-red-100 text-red-800",
    };
    return colors[priority];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma Solicitação Pendente</h3>
          <p className="text-sm text-muted-foreground">
            Todas as solicitações de urgência foram processadas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">
                    {request.request_data.customer.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Solicitado por: {request.requester_name}</span>
                    <span>•</span>
                    <span>
                      {format(new Date(request.requested_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
                <Badge className={getPriorityColor(request.requested_priority)}>
                  {getPriorityLabel(request.requested_priority)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Telefone:</span>
                  <p className="font-medium">{request.request_data.customer.phone}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Quantidade:</span>
                  <p className="font-medium">{request.request_data.quantity} unidades</p>
                </div>
                {request.request_data.customer.email && (
                  <div>
                    <span className="text-muted-foreground">E-mail:</span>
                    <p className="font-medium">{request.request_data.customer.email}</p>
                  </div>
                )}
                {request.request_data.model && (
                  <div>
                    <span className="text-muted-foreground">Modelo:</span>
                    <p className="font-medium">{request.request_data.model.name}</p>
                  </div>
                )}
              </div>

              {/* Motivo da Urgência */}
              {(request.urgent_reason || request.urgent_reason_text) && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-orange-900 mb-1">
                        📌 MOTIVO DA URGÊNCIA:
                      </p>
                      {request.urgent_reason && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-orange-800">
                            {request.urgent_reason.label}
                          </p>
                          {request.urgent_reason.description && (
                            <p className="text-xs text-orange-700">
                              {request.urgent_reason.description}
                            </p>
                          )}
                        </div>
                      )}
                      {request.urgent_reason_text && (
                        <p className="text-sm text-orange-800 mt-2">
                          <span className="font-medium">Detalhes: </span>
                          {request.urgent_reason_text}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {request.request_data.internalNotes && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground mb-1">Observações:</p>
                  <p className="text-sm">{request.request_data.internalNotes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    setSelectedRequest(request);
                    setFinalPriority("urgent");
                    setShowApprovalDialog(true);
                  }}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprovar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowRejectionDialog(true);
                  }}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeitar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Solicitação de Urgência</DialogTitle>
            <DialogDescription>
              Defina a prioridade final para esta tarefa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Prioridade Final</Label>
              <RadioGroup value={finalPriority} onValueChange={(value) => setFinalPriority(value as TaskPriority)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="normal" id="final-normal" />
                  <Label htmlFor="final-normal" className="cursor-pointer">🟡 Normal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="urgent" id="final-urgent" />
                  <Label htmlFor="final-urgent" className="cursor-pointer">🔴 Urgente</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)} disabled={processing}>
              Cancelar
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? "Aprovando..." : "Aprovar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação de Urgência</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição para o vendedor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Motivo da Rejeição</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Ex: A quantidade não justifica prioridade urgente..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)} disabled={processing}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing || !rejectionReason.trim()}>
              {processing ? "Rejeitando..." : "Rejeitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
