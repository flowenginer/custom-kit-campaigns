import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UrgentReason {
  id: string;
  label: string;
  description: string | null;
}

interface UrgentReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reasonId: string, reasonText?: string) => void;
}

export const UrgentReasonDialog = ({ open, onOpenChange, onConfirm }: UrgentReasonDialogProps) => {
  const [reasons, setReasons] = useState<UrgentReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReasonId, setSelectedReasonId] = useState<string>("");
  const [customText, setCustomText] = useState("");
  const [isOtherSelected, setIsOtherSelected] = useState(false);

  useEffect(() => {
    if (open) {
      loadReasons();
    }
  }, [open]);

  const loadReasons = async () => {
    try {
      const { data, error } = await supabase
        .from("urgent_reasons")
        .select("id, label, description")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setReasons(data || []);
      
      // Reset selections
      setSelectedReasonId("");
      setCustomText("");
      setIsOtherSelected(false);
    } catch (error: any) {
      toast.error("Erro ao carregar motivos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReasonSelect = (reasonId: string) => {
    setSelectedReasonId(reasonId);
    const selectedReason = reasons.find(r => r.id === reasonId);
    setIsOtherSelected(selectedReason?.label.toLowerCase().includes("outro") || false);
    if (!selectedReason?.label.toLowerCase().includes("outro")) {
      setCustomText("");
    }
  };

  const handleConfirm = () => {
    if (!selectedReasonId) {
      toast.error("Por favor, selecione um motivo");
      return;
    }

    if (isOtherSelected && !customText.trim()) {
      toast.error("Por favor, descreva o motivo da urgência");
      return;
    }

    onConfirm(selectedReasonId, isOtherSelected ? customText : undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Motivo da Urgência</DialogTitle>
          <DialogDescription>
            Por favor, selecione o motivo pelo qual este pedido requer prioridade urgente
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup value={selectedReasonId} onValueChange={handleReasonSelect}>
              {reasons.map((reason) => (
                <div key={reason.id} className="flex items-start space-x-3 space-y-0 p-3 rounded-lg border hover:bg-muted/50">
                  <RadioGroupItem value={reason.id} id={reason.id} />
                  <div className="flex-1">
                    <Label htmlFor={reason.id} className="font-medium cursor-pointer">
                      {reason.label}
                    </Label>
                    {reason.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {reason.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </RadioGroup>

            {isOtherSelected && (
              <div className="pl-6 space-y-2">
                <Label htmlFor="custom-reason">Descreva o motivo da urgência</Label>
                <Textarea
                  id="custom-reason"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Explique por que este pedido precisa de prioridade urgente..."
                  rows={4}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
