import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShippingOption {
  id: string;
  name: string;
  company: {
    name: string;
    picture: string;
  };
  price: string;
  delivery_time: number;
}

interface ShippingQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  customerId: string | null;
  onShippingSelected: () => void;
}

export const ShippingQuoteDialog = ({
  open,
  onOpenChange,
  taskId,
  customerId,
  onShippingSelected
}: ShippingQuoteDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<ShippingOption | null>(null);

  const handleQuote = async () => {
    if (!customerId) {
      toast.error("Cliente não vinculado à tarefa");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('melhor-envio-integration', {
        body: {
          action: 'calculate_shipping',
          task_id: taskId,
          customer_id: customerId
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setOptions(data.options || []);
      if (data.options?.length === 0) {
        toast.info("Nenhuma opção de frete disponível");
      }
    } catch (error: any) {
      console.error('Erro ao cotar frete:', error);
      toast.error(error.message || "Erro ao cotar frete");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = async () => {
    if (!selectedOption) return;

    try {
      const { error } = await supabase
        .from('design_tasks')
        .update({
          shipping_option: selectedOption as any,
          shipping_value: parseFloat(selectedOption.price)
        })
        .eq('id', taskId);

      if (error) throw error;

      toast.success("Opção de frete selecionada!");
      onShippingSelected();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar frete:', error);
      toast.error("Erro ao salvar opção de frete");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Cotação de Frete
          </DialogTitle>
          <DialogDescription>
            Selecione a melhor opção de frete para o cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {options.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Clique no botão abaixo para cotar o frete
              </p>
              <Button onClick={handleQuote} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cotando...
                  </>
                ) : (
                  'Cotar Frete'
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {options.map((option) => (
                  <div
                    key={option.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedOption?.id === option.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedOption(option)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={option.company.picture}
                          alt={option.company.name}
                          className="h-10 w-10 object-contain"
                        />
                        <div>
                          <p className="font-medium">{option.company.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {option.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">R$ {option.price}</p>
                        <Badge variant="secondary">
                          {option.delivery_time} dia(s)
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSelectOption} disabled={!selectedOption}>
                  Confirmar Seleção
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};