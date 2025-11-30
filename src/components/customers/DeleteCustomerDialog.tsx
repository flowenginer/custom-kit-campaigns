import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";

interface DeleteCustomerDialogProps {
  customerId: string;
  customerName: string;
  onSuccess?: () => void;
}

export const DeleteCustomerDialog = ({
  customerId,
  customerName,
  onSuccess,
}: DeleteCustomerDialogProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Informe o motivo da exclusão");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("pending_customer_delete_requests")
        .insert({
          customer_id: customerId,
          reason: reason.trim(),
          requested_by: user?.id,
        });

      if (error) throw error;

      toast.success("Solicitação de exclusão enviada para aprovação");
      setOpen(false);
      setReason("");
      onSuccess?.();
    } catch (error: any) {
      toast.error("Erro ao solicitar exclusão");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Solicitar Exclusão
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Solicitar Exclusão de Cliente</AlertDialogTitle>
          <AlertDialogDescription>
            Você está solicitando a exclusão de <strong>{customerName}</strong>.
            Esta solicitação será enviada para aprovação de um administrador.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">Motivo da exclusão *</label>
          <Textarea
            placeholder="Descreva o motivo da exclusão..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={loading || !reason.trim()}>
            {loading ? "Enviando..." : "Solicitar Exclusão"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
