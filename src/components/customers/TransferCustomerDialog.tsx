import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users } from "lucide-react";

interface Salesperson {
  id: string;
  full_name: string;
}

interface TransferCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  currentSalespersonId: string | null;
  onTransferSuccess: () => void;
}

export const TransferCustomerDialog = ({
  open,
  onOpenChange,
  customerId,
  currentSalespersonId,
  onTransferSuccess,
}: TransferCustomerDialogProps) => {
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadSalespersons();
    }
  }, [open]);

  const loadSalespersons = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles!inner (
            id,
            full_name
          )
        `)
        .eq("role", "salesperson");

      if (error) throw error;

      const formattedSalespersons = (data || [])
        .map((item: any) => ({
          id: item.profiles.id,
          full_name: item.profiles.full_name || "Sem nome",
        }))
        .filter((s) => s.id !== currentSalespersonId);

      setSalespersons(formattedSalespersons);
    } catch (error) {
      console.error("Error loading salespersons:", error);
      toast.error("Erro ao carregar vendedores");
    }
  };

  const handleTransfer = async () => {
    if (!selectedSalespersonId) {
      toast.error("Selecione um vendedor");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({ created_by: selectedSalespersonId })
        .eq("id", customerId);

      if (error) throw error;

      toast.success("Cliente transferido com sucesso!");
      onTransferSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error transferring customer:", error);
      toast.error("Erro ao transferir cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Transferir Cliente para Outro Vendedor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Novo Vendedor Responsável</label>
            <Select value={selectedSalespersonId} onValueChange={setSelectedSalespersonId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um vendedor" />
              </SelectTrigger>
              <SelectContent>
                {salespersons.map((salesperson) => (
                  <SelectItem key={salesperson.id} value={salesperson.id}>
                    {salesperson.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {salespersons.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum outro vendedor disponível para transferência.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleTransfer} disabled={loading || !selectedSalespersonId}>
            {loading ? "Transferindo..." : "Transferir Cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};