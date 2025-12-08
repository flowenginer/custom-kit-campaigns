import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

interface UrgentReason {
  id: string;
  label: string;
  description?: string;
}

interface PriorityChangeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  currentPriority: "normal" | "urgent";
  requestedPriority: "normal" | "urgent";
  customerName?: string;
  onSuccess?: () => void;
}

export const PriorityChangeRequestDialog = ({
  open,
  onOpenChange,
  taskId,
  currentPriority,
  requestedPriority,
  customerName,
  onSuccess,
}: PriorityChangeRequestDialogProps) => {
  const [reasons, setReasons] = useState<UrgentReason[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedReasonId, setSelectedReasonId] = useState<string>("");
  const [customText, setCustomText] = useState("");
  const [isOtherSelected, setIsOtherSelected] = useState(false);

  useEffect(() => {
    if (open) {
      loadReasons();
      setSelectedReasonId("");
      setCustomText("");
      setIsOtherSelected(false);
    }
  }, [open]);

  const loadReasons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("urgent_reasons")
        .select("id, label, description")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setReasons(data || []);
    } catch (error) {
      console.error("Error loading reasons:", error);
      toast.error("Erro ao carregar motivos");
    } finally {
      setLoading(false);
    }
  };

  const handleReasonSelect = (value: string) => {
    setSelectedReasonId(value);
    setIsOtherSelected(value === "other");
    if (value !== "other") {
      setCustomText("");
    }
  };

  const handleSubmit = async () => {
    if (!selectedReasonId) {
      toast.error("Selecione um motivo");
      return;
    }

    if (isOtherSelected && !customText.trim()) {
      toast.error("Descreva o motivo da urgência");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Check for existing pending request
      const { data: existing } = await supabase
        .from("pending_priority_change_requests")
        .select("id")
        .eq("task_id", taskId)
        .eq("status", "pending")
        .maybeSingle();

      if (existing) {
        toast.error("Já existe uma solicitação pendente para esta tarefa");
        onOpenChange(false);
        return;
      }

      const { error } = await supabase
        .from("pending_priority_change_requests")
        .insert({
          task_id: taskId,
          current_priority: currentPriority,
          requested_priority: requestedPriority,
          urgent_reason_id: isOtherSelected ? null : selectedReasonId,
          urgent_reason_text: isOtherSelected ? customText : null,
          requested_by: user.id,
        });

      if (error) throw error;

      toast.success("Solicitação enviada! Aguarde aprovação do administrador.");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting request:", error);
      toast.error(error.message || "Erro ao enviar solicitação");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Solicitar Alteração de Prioridade
          </DialogTitle>
          <DialogDescription>
            {customerName && (
              <span className="block mb-2">Cliente: <strong>{customerName}</strong></span>
            )}
            Esta alteração precisa ser aprovada por um administrador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Priority change info */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">De:</span>
              <Badge variant={currentPriority === "urgent" ? "destructive" : "secondary"}>
                {currentPriority === "urgent" ? "🔴 Urgente" : "🟡 Normal"}
              </Badge>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Para:</span>
              <Badge variant={requestedPriority === "urgent" ? "destructive" : "secondary"}>
                {requestedPriority === "urgent" ? "🔴 Urgente" : "🟡 Normal"}
              </Badge>
            </div>
          </div>

          {/* Reason selection */}
          <div className="space-y-3">
            <Label>Motivo da alteração *</Label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <RadioGroup value={selectedReasonId} onValueChange={handleReasonSelect}>
                {reasons.map((reason) => (
                  <div key={reason.id} className="flex items-start space-x-3 p-2 rounded hover:bg-muted/50">
                    <RadioGroupItem value={reason.id} id={reason.id} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={reason.id} className="cursor-pointer font-medium">
                        {reason.label}
                      </Label>
                      {reason.description && (
                        <p className="text-sm text-muted-foreground">{reason.description}</p>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex items-start space-x-3 p-2 rounded hover:bg-muted/50">
                  <RadioGroupItem value="other" id="other" className="mt-1" />
                  <Label htmlFor="other" className="cursor-pointer font-medium">
                    Outro motivo
                  </Label>
                </div>
              </RadioGroup>
            )}
          </div>

          {/* Custom text for "other" */}
          {isOtherSelected && (
            <div className="space-y-2">
              <Label htmlFor="customText">Descreva o motivo *</Label>
              <Textarea
                id="customText"
                placeholder="Descreva detalhadamente o motivo da urgência..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !selectedReasonId}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Solicitar Aprovação"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
