import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, XCircle, Trash2, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PendingDeleteRequest {
  id: string;
  task_id: string;
  reason: string;
  requested_by: string;
  requested_at: string;
  status: string;
  requester_name?: string;
  customer_name?: string;
  campaign_name?: string;
}

export const DeleteApprovalsList = () => {
  const [requests, setRequests] = useState<PendingDeleteRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PendingDeleteRequest | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("pending_delete_requests")
        .select(`
          *,
          requester:profiles!pending_delete_requests_requested_by_fkey(full_name),
          task:design_tasks!pending_delete_requests_task_id_fkey(
            id,
            order_id,
            orders(customer_name, campaign_id, campaigns(name))
          )
        `)
        .eq("status", "pending")
        .order("requested_at", { ascending: false });

      if (error) throw error;

      const formatted = data?.map((req: any) => ({
        id: req.id,
        task_id: req.task_id,
        reason: req.reason,
        requested_by: req.requested_by,
        requested_at: req.requested_at,
        status: req.status,
        requester_name: req.requester?.full_name || "Vendedor",
        customer_name: req.task?.orders?.customer_name || "Cliente não encontrado",
        campaign_name: req.task?.orders?.campaigns?.name || "Campanha não especificada",
      })) || [];

      setRequests(formatted);
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
      toast.error("Erro ao carregar solicitações de exclusão");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("pending_delete_requests_list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_delete_requests",
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

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Soft delete da task
      const { error: taskError } = await supabase
        .from("design_tasks")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", selectedRequest.task_id);

      if (taskError) throw taskError;

      // 2. Atualizar status da solicitação
      const { error: requestError } = await supabase
        .from("pending_delete_requests")
        .update({
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (requestError) throw requestError;

      // 3. Registrar no histórico
      const { error: historyError } = await supabase
        .from("design_task_history")
        .insert({
          task_id: selectedRequest.task_id,
          action: "deleted",
          user_id: user.id,
          notes: `Tarefa excluída. Motivo: ${selectedRequest.reason}`,
        });

      if (historyError) throw historyError;

      // 4. Notificar vendedor
      await supabase.from("notifications").insert({
        user_id: selectedRequest.requested_by,
        task_id: selectedRequest.task_id,
        title: "✅ Exclusão Aprovada",
        message: `Sua solicitação de exclusão da tarefa de ${selectedRequest.customer_name} foi aprovada.`,
        type: "approval",
      });

      toast.success("Exclusão aprovada com sucesso!");
      setShowApproveDialog(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (error) {
      console.error("Erro ao aprovar exclusão:", error);
      toast.error("Erro ao aprovar exclusão");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error("Por favor, informe o motivo da rejeição");
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Atualizar status da solicitação
      const { error: requestError } = await supabase
        .from("pending_delete_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (requestError) throw requestError;

      // 2. Notificar vendedor
      await supabase.from("notifications").insert({
        user_id: selectedRequest.requested_by,
        task_id: selectedRequest.task_id,
        title: "❌ Exclusão Rejeitada",
        message: `Sua solicitação de exclusão da tarefa de ${selectedRequest.customer_name} foi rejeitada. Motivo: ${rejectionReason}`,
        type: "approval",
      });

      toast.success("Solicitação rejeitada");
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
      loadRequests();
    } catch (error) {
      console.error("Erro ao rejeitar exclusão:", error);
      toast.error("Erro ao rejeitar exclusão");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma solicitação pendente</p>
            <p className="text-sm mt-2">
              Não há solicitações de exclusão aguardando aprovação no momento.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {requests.map((request) => (
          <Card key={request.id} className="border-red-200 bg-red-50/30">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-red-600" />
                    {request.customer_name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {request.requester_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(request.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                  Exclusão Solicitada
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Campanha:
                </p>
                <p className="text-sm">{request.campaign_name}</p>
              </div>

              <div className="bg-red-100 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-900 mb-2">
                  📌 MOTIVO DA EXCLUSÃO:
                </p>
                <p className="text-sm text-red-800 whitespace-pre-wrap">
                  {request.reason}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowApproveDialog(true);
                  }}
                  className="flex-1"
                  variant="default"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprovar Exclusão
                </Button>
                <Button
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowRejectDialog(true);
                  }}
                  className="flex-1"
                  variant="outline"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeitar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de Aprovação */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja aprovar a exclusão da tarefa de{" "}
              <strong>{selectedRequest?.customer_name}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita. A tarefa será marcada como excluída.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isProcessing}
              variant="destructive"
            >
              {isProcessing ? "Processando..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição para o vendedor{" "}
              <strong>{selectedRequest?.requester_name}</strong>:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Ex: A tarefa já está em produção e não pode ser excluída."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
              }}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReject}
              disabled={isProcessing || !rejectionReason.trim()}
              variant="destructive"
            >
              {isProcessing ? "Processando..." : "Rejeitar Solicitação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
