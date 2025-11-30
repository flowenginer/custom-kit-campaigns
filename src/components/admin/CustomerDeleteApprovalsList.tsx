import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

interface DeleteRequest {
  id: string;
  customer_id: string;
  customer_name: string;
  reason: string;
  requested_by: string;
  requested_by_name: string;
  requested_at: string;
}

export const CustomerDeleteApprovalsList = () => {
  const [requests, setRequests] = useState<DeleteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<DeleteRequest | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const loadRequests = async () => {
    const { data, error } = await supabase
      .from("pending_customer_delete_requests")
      .select(`
        *,
        customers (name),
        profiles:requested_by (full_name)
      `)
      .eq("status", "pending")
      .order("requested_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar solicitações");
      return;
    }

    const formatted = data.map((req: any) => ({
      id: req.id,
      customer_id: req.customer_id,
      customer_name: req.customers?.name || "N/A",
      reason: req.reason,
      requested_by: req.requested_by,
      requested_by_name: req.profiles?.full_name || "N/A",
      requested_at: req.requested_at,
    }));

    setRequests(formatted);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();

    const channel = supabase
      .channel("customer_delete_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_customer_delete_requests",
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (request: DeleteRequest) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Soft delete: set is_active to false
      const { error: customerError } = await supabase
        .from("customers")
        .update({ is_active: false })
        .eq("id", request.customer_id);

      if (customerError) throw customerError;

      // Update request status
      const { error: updateError } = await supabase
        .from("pending_customer_delete_requests")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      // Notify salesperson
      await supabase.from("notifications").insert({
        user_id: request.requested_by,
        title: "✅ Exclusão Aprovada",
        message: `Sua solicitação de exclusão do cliente ${request.customer_name} foi aprovada.`,
        type: "customer_delete_approved",
      });

      toast.success("Exclusão aprovada com sucesso!");
      loadRequests();
    } catch (error: any) {
      toast.error("Erro ao aprovar exclusão");
      console.error(error);
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

      const { error } = await supabase
        .from("pending_customer_delete_requests")
        .update({
          status: "rejected",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      // Notify salesperson
      await supabase.from("notifications").insert({
        user_id: selectedRequest.requested_by,
        title: "❌ Exclusão Rejeitada",
        message: `Sua solicitação de exclusão do cliente ${selectedRequest.customer_name} foi rejeitada. Motivo: ${rejectionReason}`,
        type: "customer_delete_rejected",
      });

      toast.success("Exclusão rejeitada");
      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedRequest(null);
      loadRequests();
    } catch (error: any) {
      toast.error("Erro ao rejeitar exclusão");
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Nenhuma solicitação de exclusão pendente
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{request.customer_name}</h3>
                  <Badge variant="destructive">Exclusão Solicitada</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong>Vendedor:</strong> {request.requested_by_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Data:</strong> {format(new Date(request.requested_at), "dd/MM/yyyy 'às' HH:mm")}
                </p>
                <p className="text-sm">
                  <strong>Motivo:</strong> {request.reason}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleApprove(request)}
                  disabled={processing}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowRejectDialog(true);
                  }}
                  disabled={processing}
                >
                  <X className="h-4 w-4 mr-1" />
                  Rejeitar
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição para {selectedRequest?.customer_name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da rejeição..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRejectionReason("");
              setSelectedRequest(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={processing}>
              Confirmar Rejeição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
