import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, ArrowRight, Check, X } from "lucide-react";

interface PriorityChangeHistory {
  id: string;
  task_id: string;
  current_priority: string;
  requested_priority: string;
  urgent_reason_text: string | null;
  requested_at: string;
  reviewed_at: string | null;
  status: string;
  rejection_reason: string | null;
  requester_name?: string;
  reviewer_name?: string;
  customer_name?: string;
  reason_label?: string;
}

export const PriorityChangeApprovalsHistory = () => {
  const [history, setHistory] = useState<PriorityChangeHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("pending_priority_change_requests")
        .select("*")
        .neq("status", "pending")
        .order("reviewed_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const enrichedHistory = await Promise.all(
        (data || []).map(async (item) => {
          // Get requester name
          const { data: requester } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", item.requested_by)
            .single();

          // Get reviewer name
          let reviewerName = "";
          if (item.reviewed_by) {
            const { data: reviewer } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", item.reviewed_by)
              .single();
            reviewerName = reviewer?.full_name || "";
          }

          // Get customer name
          const { data: taskData } = await supabase
            .from("design_tasks")
            .select("order_id")
            .eq("id", item.task_id)
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

          // Get reason label
          let reasonLabel = "";
          if (item.urgent_reason_id) {
            const { data: reasonData } = await supabase
              .from("urgent_reasons")
              .select("label")
              .eq("id", item.urgent_reason_id)
              .single();
            reasonLabel = reasonData?.label || "";
          }

          return {
            ...item,
            requester_name: requester?.full_name || "Usuário",
            reviewer_name: reviewerName,
            customer_name: customerName,
            reason_label: reasonLabel,
          };
        })
      );

      setHistory(enrichedHistory);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Nenhum registro no histórico</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item) => (
        <Card key={item.id} className={item.status === "approved" ? "border-green-200" : "border-red-200"}>
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.customer_name || "Cliente"}</span>
                  <Badge variant={item.status === "approved" ? "default" : "destructive"}>
                    {item.status === "approved" ? (
                      <><Check className="h-3 w-3 mr-1" /> Aprovado</>
                    ) : (
                      <><X className="h-3 w-3 mr-1" /> Rejeitado</>
                    )}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Badge variant={item.current_priority === "urgent" ? "destructive" : "secondary"} className="text-xs">
                    {item.current_priority === "urgent" ? "Urgente" : "Normal"}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant={item.requested_priority === "urgent" ? "destructive" : "secondary"} className="text-xs">
                    {item.requested_priority === "urgent" ? "Urgente" : "Normal"}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground">
                  Solicitado por <strong>{item.requester_name}</strong>
                  {item.reviewer_name && (
                    <>, {item.status === "approved" ? "aprovado" : "rejeitado"} por <strong>{item.reviewer_name}</strong></>
                  )}
                </p>

                {item.status === "rejected" && item.rejection_reason && (
                  <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                    Motivo: {item.rejection_reason}
                  </p>
                )}
              </div>

              <div className="text-right text-sm text-muted-foreground">
                {item.reviewed_at && (
                  <p>{format(new Date(item.reviewed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
