import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, Ruler, X, Download } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onComplete: () => void;
}

export function BulkActionsBar({ selectedIds, onClearSelection, onComplete }: BulkActionsBarProps) {
  const [bulkPriceDialog, setBulkPriceDialog] = useState(false);
  const [bulkPrice, setBulkPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const applyBulkPrice = async () => {
    if (!bulkPrice || selectedIds.length === 0) return;

    setLoading(true);
    const { error } = await supabase
      .from("shirt_models")
      .update({ base_price: parseFloat(bulkPrice) })
      .in("id", selectedIds);

    if (error) {
      toast.error("Erro ao aplicar preço em lote");
      setLoading(false);
      return;
    }

    toast.success(`✅ Preço aplicado a ${selectedIds.length} produtos!`);
    setBulkPriceDialog(false);
    setBulkPrice("");
    setLoading(false);
    onComplete();
  };

  const exportSelected = () => {
    toast.info("Exportação em desenvolvimento");
  };

  if (selectedIds.length === 0) return null;

  return (
    <Card className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 shadow-lg">
      <div className="flex items-center gap-4 p-4">
        <span className="text-sm font-medium">
          {selectedIds.length} produto{selectedIds.length > 1 ? "s" : ""} selecionado{selectedIds.length > 1 ? "s" : ""}
        </span>

        <div className="h-6 w-px bg-border" />

        <Dialog open={bulkPriceDialog} onOpenChange={setBulkPriceDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <DollarSign className="mr-2 h-4 w-4" />
              Definir Preço Base
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aplicar Preço Base em Lote</DialogTitle>
              <DialogDescription>
                Aplicar preço base para {selectedIds.length} produto{selectedIds.length > 1 ? "s" : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Preço Base (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  placeholder="Ex: 49.90"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkPriceDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={applyBulkPrice} disabled={loading}>
                Aplicar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="outline" size="sm" onClick={exportSelected}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
