import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, X, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PriorityChangeRequest {
  id: string;
  task_id: string;
  current_priority: string;
  requested_priority: string;
  urgent_reason_id: string | null;
  urgent_reason_text: string | null;
  requested_by: string;
  requested_at: string;
  status: string;
  requester_name?: string;
  customer_name?: string;
  reason_label?: string;
}

export const PriorityChangeApprovalsList = () => {
  const [requests, setRequests] = useState<PriorityChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PriorityChangeRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    loadRequests();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("priority_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_priority_change_requests",
        },
        () => loadRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("pending_priority_change_requests")
        .select("*")
        .eq("status", "pending")
        .order("requested_at", { ascending: false });

      if (error) throw error;

      // Fetch additional data
      const enrichedRequests = await Promise.all(
        (data || []).map(async (request) => {
          // Get requester name
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", request.requested_by)
            .single();

          // Get customer name from task
          const { data: taskData } = await supabase
            .from("design_tasks")
            .select("order_id")
            .eq("id", request.task_id)
            .single();

          let customerName = "";
          if (taskData?.order_id) {
            const { data: orderData } = await supabase
              .from("orders")
              .select("customer_name")
              .eq("id", taskData.order_id)
              .single();
            customerName = orderData?.customer_name || "";
          }

          // Get reason label if urgent_reason_id exists
          let reasonLabel = "";
          if (request.urgent_reason_id) {
            const { data: reasonData } = await supabase
              .from("urgent_reasons")
              .select("label")
              .eq("id", request.urgent_reason_id)
              .single();
            reasonLabel = reasonData?.label || "";
          }

          return {
            ...request,
            requester_name: profile?.full_name || "Usuário",
            customer_name: customerName,
            reason_label: reasonLabel,
          };
        })
      );

      setRequests(enrichedRequests);
    } catch (error) {
      console.error("Error loading requests:", error);
      toast.error("Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: PriorityChangeRequest) => {
    setProcessing(request.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Update the design_task priority
      const { error: taskError } = await supabase
        .from("design_tasks")
        .update({ priority: request.requested_priority as "normal" | "urgent" })
        .eq("id", request.task_id);

      if (taskError) throw taskError;

      // Update the request status
      const { error: requestError } = await supabase
        .from("pending_priority_change_requests")
        .update({
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (requestError) throw requestError;

      // Create notification for the requester
      await supabase.from("notifications").insert({
        user_id: request.requested_by,
        task_id: request.task_id,
        title: "✅ Alteração de Prioridade Aprovada",
        message: `Sua solicitação para alterar a prioridade de "${request.customer_name}" foi aprovada.`,
        type: "approval",
        customer_name: request.customer_name,
      });

      // Add to task history
      await supabase.from("design_task_history").insert({
        task_id: request.task_id,
        user_id: user.id,
        action: "priority_changed",
        notes: `Prioridade alterada de ${request.current_priority === "urgent" ? "Urgente" : "Normal"} para ${request.requested_priority === "urgent" ? "Urgente" : "Normal"} (aprovação de solicitação)`,
      });

      toast.success("Solicitação aprovada! Prioridade alterada.");
      loadRequests();
    } catch (error: any) {
      console.error("Error approving:", error);
      toast.error(error.message || "Erro ao aprovar solicitação");
    } finally {
      setProcessing(null);
    }
  };

  const openRejectDialog = (request: PriorityChangeRequest) => {
    setSelectedRequest(request);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      toast.error("Informe o motivo da rejeição");
      return;
    }

    setProcessing(selectedRequest.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Update the request status
      const { error } = await supabase
        .from("pending_priority_change_requests")
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      // Create notification for the requester
      await supabase.from("notifications").insert({
        user_id: selectedRequest.requested_by,
        task_id: selectedRequest.task_id,
        title: "❌ Alteração de Prioridade Rejeitada",
        message: `Sua solicitação para alterar a prioridade de "${selectedRequest.customer_name}" foi rejeitada. Motivo: ${rejectionReason}`,
        type: "status_change",
        customer_name: selectedRequest.customer_name,
      });

      toast.success("Solicitação rejeitada");
      setRejectDialogOpen(false);
      loadRequests();
    } catch (error: any) {
      console.error("Error rejecting:", error);
      toast.error(error.message || "Erro ao rejeitar solicitação");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhuma solicitação pendente</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id} className="border-orange-200">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {request.customer_name || "Cliente"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Solicitado por <strong>{request.requester_name}</strong> em{" "}
                    {format(new Date(request.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Priority change */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Prioridade:</span>
                <Badge variant={request.current_priority === "urgent" ? "destructive" : "secondary"}>
                  {request.current_priority === "urgent" ? "🔴 Urgente" : "🟡 Normal"}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant={request.requested_priority === "urgent" ? "destructive" : "secondary"}>
                  {request.requested_priority === "urgent" ? "🔴 Urgente" : "🟡 Normal"}
                </Badge>
              </div>

              {/* Reason */}
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">
                  📌 Motivo:
                </p>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  {request.reason_label || request.urgent_reason_text || "Não informado"}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => handleApprove(request)}
                  disabled={processing === request.id}
                  className="flex-1"
                >
                  {processing === request.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Aprovar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openRejectDialog(request)}
                  disabled={processing === request.id}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Rejeitar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição. Esta informação será enviada ao vendedor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da rejeição..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={!rejectionReason.trim()}>
              Confirmar Rejeição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
