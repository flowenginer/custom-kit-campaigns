import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, X, Download, Barcode, Package, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
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
  const [skuLoading, setSkuLoading] = useState(false);
  const [blingLoading, setBlingLoading] = useState(false);
  const [blingEnabled, setBlingEnabled] = useState(false);

  useEffect(() => {
    checkBlingSettings();
  }, []);

  const checkBlingSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('bling_enabled')
        .maybeSingle();

      if (!error && data) {
        setBlingEnabled(data.bling_enabled || false);
      }
    } catch (error) {
      console.error('Error checking Bling settings:', error);
    }
  };

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

  const generateSKUs = async () => {
    setSkuLoading(true);
    try {
      // Buscar produtos selecionados que não têm SKU
      const { data: products, error: fetchError } = await supabase
        .from("shirt_models")
        .select("id, name, segment_tag, model_tag, sku")
        .in("id", selectedIds);

      if (fetchError) throw fetchError;

      const productsWithoutSku = products?.filter(p => !p.sku) || [];
      
      if (productsWithoutSku.length === 0) {
        toast.info("Todos os produtos selecionados já possuem SKU");
        setSkuLoading(false);
        return;
      }

      // Buscar o maior número sequencial existente para cada combinação segment-model
      const { data: existingSkus } = await supabase
        .from("shirt_models")
        .select("sku")
        .not("sku", "is", null);

      // Extrair números sequenciais existentes
      const skuCounters: Record<string, number> = {};
      existingSkus?.forEach(item => {
        if (item.sku) {
          const match = item.sku.match(/^(.+)-(\d+)$/);
          if (match) {
            const prefix = match[1];
            const num = parseInt(match[2], 10);
            skuCounters[prefix] = Math.max(skuCounters[prefix] || 0, num);
          }
        }
      });

      // Gerar SKUs para cada produto
      const updates: { id: string; sku: string }[] = [];
      
      for (const product of productsWithoutSku) {
        const segment = (product.segment_tag || "GEN").substring(0, 3).toUpperCase();
        const model = (product.model_tag || "MOD").substring(0, 3).toUpperCase();
        const prefix = `${segment}-${model}`;
        
        // Incrementar contador
        skuCounters[prefix] = (skuCounters[prefix] || 0) + 1;
        const seq = skuCounters[prefix].toString().padStart(3, "0");
        
        updates.push({
          id: product.id,
          sku: `${prefix}-${seq}`
        });
      }

      // Atualizar produtos em lote
      for (const update of updates) {
        const { error } = await supabase
          .from("shirt_models")
          .update({ sku: update.sku })
          .eq("id", update.id);
        
        if (error) {
          console.error(`Erro ao atualizar SKU para ${update.id}:`, error);
        }
      }

      toast.success(`✅ SKU gerado para ${updates.length} produtos!`);
      onComplete();
    } catch (error) {
      console.error("Erro ao gerar SKUs:", error);
      toast.error("Erro ao gerar SKUs");
    } finally {
      setSkuLoading(false);
    }
  };

  const sendAllToBling = async () => {
    setBlingLoading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const productId of selectedIds) {
        try {
          const { data, error } = await supabase.functions.invoke('bling-integration', {
            body: {
              action: 'sync_product',
              product_id: productId
            }
          });

          if (error || data?.error) {
            errorCount++;
            console.error(`Erro ao sincronizar produto ${productId}:`, error || data?.error);
          } else {
            successCount++;
          }
        } catch (err) {
          errorCount++;
          console.error(`Erro ao sincronizar produto ${productId}:`, err);
        }
      }

      if (successCount > 0) {
        toast.success(`✅ ${successCount} produto(s) enviado(s) para o Bling!`);
      }
      if (errorCount > 0) {
        toast.error(`❌ ${errorCount} produto(s) falharam ao sincronizar`);
      }

      onComplete();
    } catch (error) {
      console.error("Erro ao enviar produtos para Bling:", error);
      toast.error("Erro ao enviar produtos para o Bling");
    } finally {
      setBlingLoading(false);
    }
  };

  const exportSelected = () => {
    toast.info("Exportação em desenvolvimento");
  };

  if (selectedIds.length === 0) return null;

  return (
    <Card className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 shadow-lg">
      <div className="flex items-center gap-3 p-4 flex-wrap justify-center">
        <span className="text-sm font-medium">
          {selectedIds.length} produto{selectedIds.length > 1 ? "s" : ""} selecionado{selectedIds.length > 1 ? "s" : ""}
        </span>

        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Definir Preço Base */}
        <Dialog open={bulkPriceDialog} onOpenChange={setBulkPriceDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <DollarSign className="mr-2 h-4 w-4" />
              Preço Base
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
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Aplicar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Gerar SKU */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={generateSKUs}
          disabled={skuLoading}
        >
          {skuLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Barcode className="mr-2 h-4 w-4" />
          )}
          Gerar SKU
        </Button>

        {/* Enviar para Bling */}
        {blingEnabled && (
          <Button 
            variant="default" 
            size="sm" 
            onClick={sendAllToBling}
            disabled={blingLoading}
          >
            {blingLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Package className="mr-2 h-4 w-4" />
            )}
            Enviar para Bling
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={exportSelected}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>

        <div className="h-6 w-px bg-border hidden sm:block" />

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
