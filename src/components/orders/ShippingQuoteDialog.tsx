import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Package, Truck, AlertTriangle, Scale, Ruler } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShippingOption {
  id: number;
  name: string;
  company: string;
  price: number;
  discount: number;
  final_price: number;
  delivery_time: number;
  delivery_range?: {
    min: number;
    max: number;
  };
}

interface DimensionInfo {
  calculated: {
    weight: number;
    width: number;
    height: number;
    length: number;
    quantity: number;
  };
  warnings: string[];
  usingDefaults: boolean;
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
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<ShippingOption | null>(null);
  const [dimensionInfo, setDimensionInfo] = useState<DimensionInfo | null>(null);

  const handleQuote = async () => {
    if (!customerId) {
      toast.error("Cliente não vinculado à tarefa");
      return;
    }

    setLoading(true);
    setOptions([]);
    setSelectedOption(null);
    setDimensionInfo(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('melhor-envio-integration', {
        body: {
          action: 'calculate_shipping',
          data: {
            task_id: taskId,
            customer_id: customerId
          }
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Salvar info de dimensões
      if (data.dimensions) {
        setDimensionInfo(data.dimensions);
        
        // Mostrar warning se houver problemas
        if (data.dimensions.warnings?.length > 0) {
          toast.warning("Atenção: Cotação com dimensões estimadas", {
            description: "Verifique os alertas de dimensões abaixo"
          });
        }
      }

      // Filtrar apenas opções válidas (sem erro)
      const validOptions = (data.quotes || []).filter((q: any) => !q.error && q.price > 0);
      setOptions(validOptions);
      
      if (validOptions.length === 0) {
        toast.info("Nenhuma opção de frete disponível para esta rota");
      } else {
        toast.success(`${validOptions.length} opções de frete encontradas!`);
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

    setSaving(true);
    try {
      const shippingData = {
        id: selectedOption.id,
        name: selectedOption.name,
        company: selectedOption.company,
        price: selectedOption.final_price,
        delivery_time: selectedOption.delivery_time,
      };

      const { error } = await supabase
        .from('design_tasks')
        .update({
          shipping_option: shippingData as any,
          shipping_value: selectedOption.final_price
        })
        .eq('id', taskId);

      if (error) throw error;

      toast.success(`Frete selecionado: ${selectedOption.name} - R$ ${selectedOption.final_price.toFixed(2)}`);
      onShippingSelected();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar frete:', error);
      toast.error("Erro ao salvar opção de frete");
    } finally {
      setSaving(false);
    }
  };

  const getCarrierIcon = (company: string) => {
    if (company?.toLowerCase().includes('correios')) return '📦';
    if (company?.toLowerCase().includes('jadlog')) return '🚚';
    if (company?.toLowerCase().includes('azul')) return '✈️';
    if (company?.toLowerCase().includes('latam')) return '✈️';
    return '📬';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Cotação de Frete
          </DialogTitle>
          <DialogDescription>
            Selecione a melhor opção de frete para o cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {options.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Clique no botão abaixo para cotar o frete
              </p>
              <Button onClick={handleQuote} disabled={loading} size="lg">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando melhores fretes...
                  </>
                ) : (
                  <>
                    <Truck className="mr-2 h-4 w-4" />
                    Cotar Frete
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* Alertas de dimensões */}
              {dimensionInfo && (
                <div className="space-y-2">
                  {/* Info das dimensões calculadas */}
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                      <Ruler className="h-4 w-4" />
                      <span className="font-medium">Dimensões calculadas:</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Peso</span>
                        <span className="font-medium">{dimensionInfo.calculated.weight} kg</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Largura</span>
                        <span className="font-medium">{dimensionInfo.calculated.width} cm</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Altura</span>
                        <span className="font-medium">{dimensionInfo.calculated.height} cm</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Compr.</span>
                        <span className="font-medium">{dimensionInfo.calculated.length} cm</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Qtd</span>
                        <span className="font-medium">{dimensionInfo.calculated.quantity} un</span>
                      </div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {dimensionInfo.warnings.length > 0 && (
                    <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="ml-2">
                        <p className="font-medium mb-1">Atenção: Valores estimados</p>
                        <ul className="text-xs space-y-0.5 list-disc list-inside">
                          {dimensionInfo.warnings.map((warning, i) => (
                            <li key={i}>{warning}</li>
                          ))}
                        </ul>
                        <p className="text-xs mt-2 opacity-80">
                          Para cotações precisas, cadastre as dimensões dos produtos em Produtos → Preços.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Lista de opções */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {options.map((option) => (
                  <div
                    key={option.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedOption?.id === option.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    }`}
                    onClick={() => setSelectedOption(option)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl flex-shrink-0">
                          {getCarrierIcon(option.company)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{option.company}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {option.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {option.discount > 0 && (
                          <p className="text-xs text-muted-foreground line-through">
                            R$ {option.price.toFixed(2)}
                          </p>
                        )}
                        <p className="font-bold text-lg text-primary">
                          R$ {option.final_price.toFixed(2)}
                        </p>
                        <Badge variant="secondary" className="mt-1">
                          {option.delivery_range 
                            ? `${option.delivery_range.min}-${option.delivery_range.max} dias` 
                            : `${option.delivery_time} dia(s)`
                          }
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ações */}
              <div className="flex justify-between items-center gap-2 pt-4 border-t">
                <Button variant="ghost" size="sm" onClick={handleQuote} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Recotar'
                  )}
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSelectOption} 
                    disabled={!selectedOption || saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Confirmar Seleção'
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};