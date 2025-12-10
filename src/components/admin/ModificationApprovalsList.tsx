import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, XCircle, Download, Loader2, FileText } from "lucide-react";

interface PendingModificationRequest {
  id: string;
  task_id: string;
  description: string;
  attachments: Array<{ name: string; url: string }>;
  requested_by: string;
  requested_at: string;
  status: string;
  requester_name?: string;
  customer_name?: string;
  campaign_name?: string;
}

export const ModificationApprovalsList = () => {
  const [requests, setRequests] = useState<PendingModificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PendingModificationRequest | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRequests();

    const channel = supabase
      .channel("modification_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_modification_requests",
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

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pending_modification_requests")
        .select(`
          *,
          requester:profiles!pending_modification_requests_requested_by_fkey(full_name),
          task:design_tasks!pending_modification_requests_task_id_fkey(
            id,
            orders(customer_name, campaigns(name))
          )
        `)
        .eq("status", "pending")
        .order("requested_at", { ascending: false });

      if (error) throw error;

      const formatted: PendingModificationRequest[] = (data || []).map((req: any) => ({
        id: req.id,
        task_id: req.task_id,
        description: req.description,
        attachments: req.attachments || [],
        requested_by: req.requested_by,
        requested_at: req.requested_at,
        status: req.status,
        requester_name: req.requester?.full_name || "Desconhecido",
        customer_name: req.task?.orders?.customer_name || "N/A",
        campaign_name: req.task?.orders?.campaigns?.name || "N/A",
      }));

      setRequests(formatted);
    } catch (error) {
      console.error("Error loading modification requests:", error);
      toast.error("Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: PendingModificationRequest) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Mover task de volta para "changes_requested"
      const { error: taskError } = await supabase
        .from("design_tasks")
        .update({ status: "changes_requested" })
        .eq("id", request.task_id);

      if (taskError) throw taskError;

      // 2. Atualizar status da solicitação
      const { error: requestError } = await supabase
        .from("pending_modification_requests")
        .update({
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (requestError) throw requestError;

      // 3. Registrar no histórico
      await supabase.from("design_task_history").insert({
        task_id: request.task_id,
        user_id: user.id,
        action: "modification_approved",
        new_status: "changes_requested",
        notes: `Alteração aprovada: ${request.description}`,
      });

      // 4. Notificar vendedor
      await supabase.from("notifications").insert({
        user_id: request.requested_by,
        task_id: request.task_id,
        title: "✅ Solicitação de Alteração Aprovada",
        message: `Sua solicitação de alteração para ${request.customer_name} foi aprovada. A tarefa retornou para revisão.`,
        type: "modification_approved",
      });

      toast.success("Solicitação aprovada com sucesso!");
      loadRequests();
    } catch (error) {
      console.error("Error approving modification request:", error);
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

      const { error } = await supabase
        .from("pending_modification_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason.trim(),
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      // Notificar vendedor
      await supabase.from("notifications").insert({
        user_id: selectedRequest.requested_by,
        task_id: selectedRequest.task_id,
        title: "❌ Solicitação de Alteração Rejeitada",
        message: `Sua solicitação de alteração para ${selectedRequest.customer_name} foi rejeitada. Motivo: ${rejectionReason}`,
        type: "modification_rejected",
      });

      toast.success("Solicitação rejeitada");
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
      loadRequests();
    } catch (error) {
      console.error("Error rejecting modification request:", error);
      toast.error("Erro ao rejeitar solicitação");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Nenhuma solicitação de alteração pendente
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-[600px]">
        <div className="grid gap-4 p-4">
          {requests.map((request) => (
            <Card key={request.id} className="border-amber-200 bg-amber-50/30">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Cliente: {request.customer_name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span>Vendedor: {request.requester_name}</span>
                      <span>•</span>
                      <span>{format(new Date(request.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                    </div>
                  </div>
                  <Badge variant="secondary">{request.campaign_name}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">DESCRIÇÃO DA ALTERAÇÃO:</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap bg-background p-3 rounded border">
                    {request.description}
                  </p>
                </div>

                {request.attachments && request.attachments.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">ANEXOS:</Label>
                    <div className="mt-1 space-y-1">
                      {request.attachments.map((att, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await fetch(att.url);
                              const blob = await response.blob();
                              const downloadUrl = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = downloadUrl;
                              link.download = att.name;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(downloadUrl);
                            } catch {
                              window.open(att.url, '_blank');
                            }
                          }}
                          className="w-full justify-start"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          {att.name}
                          <Download className="h-3 w-3 ml-auto" />
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleApprove(request)}
                    disabled={processing}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovar Alteração
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowRejectDialog(true);
                    }}
                    disabled={processing}
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
      </ScrollArea>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação de Alteração</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição para o vendedor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo da Rejeição *</Label>
            <Textarea
              placeholder="Ex: A alteração solicitada não é viável porque..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Rejeitar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
