import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, X, Download, Barcode, Package, Loader2, CheckCircle2, AlertTriangle, XCircle, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onComplete: () => void;
  totalProducts?: number;
}

interface BlingResult {
  id: string;
  name: string;
  sku: string;
  status: 'success' | 'duplicate' | 'error';
  message?: string;
}

export function BulkActionsBar({ selectedIds, onClearSelection, onComplete, totalProducts }: BulkActionsBarProps) {
  const [bulkPriceDialog, setBulkPriceDialog] = useState(false);
  const [bulkPrice, setBulkPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [skuLoading, setSkuLoading] = useState(false);
  const [blingLoading, setBlingLoading] = useState(false);
  const [blingEnabled, setBlingEnabled] = useState(false);
  
  // Estado para relatório de envio ao Bling
  const [blingResultsDialog, setBlingResultsDialog] = useState(false);
  const [blingResults, setBlingResults] = useState<BlingResult[]>([]);
  
  // Estado para exclusão em lote
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [productsToDelete, setProductsToDelete] = useState<{ id: string; name: string; sku: string | null }[]>([]);

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

  // Abrir modal de exclusão e carregar nomes dos produtos
  const openDeleteDialog = async () => {
    const { data: products } = await supabase
      .from("shirt_models")
      .select("id, name, sku")
      .in("id", selectedIds);
    
    setProductsToDelete(products || []);
    setDeleteDialogOpen(true);
  };

  // Executar exclusão em lote
  const handleBulkDelete = async () => {
    setDeleteLoading(true);
    
    try {
      // 1. Excluir variações dos produtos
      const { error: varError } = await supabase
        .from("shirt_model_variations")
        .delete()
        .in("model_id", selectedIds);
      
      if (varError) {
        console.error("Erro ao excluir variações:", varError);
      }
      
      // 2. Excluir imagens do storage para cada produto
      for (const product of productsToDelete) {
        const imageFields = ["photo_main", "image_front", "image_back", "image_right", "image_left"];
        // Buscar segment_id do produto
        const { data: modelData } = await supabase
          .from("shirt_models")
          .select("segment_id")
          .eq("id", product.id)
          .single();
        
        if (modelData?.segment_id) {
          const filesToDelete = imageFields.map(field => 
            `${modelData.segment_id}/${product.id}/${field}.jpg`
          );
          
          await supabase.storage
            .from("shirt-models-images")
            .remove(filesToDelete);
        }
      }
      
      // 3. Excluir produtos
      const { error: deleteError } = await supabase
        .from("shirt_models")
        .delete()
        .in("id", selectedIds);
      
      if (deleteError) throw deleteError;
      
      toast.success(`✅ ${selectedIds.length} produto(s) excluído(s) com sucesso!`);
      setDeleteDialogOpen(false);
      onClearSelection();
      onComplete();
      
    } catch (error: any) {
      console.error("Erro ao excluir produtos:", error);
      toast.error("Erro ao excluir produtos: " + error.message);
    } finally {
      setDeleteLoading(false);
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
    const results: BlingResult[] = [];

    // Buscar nomes dos produtos para o relatório
    const { data: products } = await supabase
      .from("shirt_models")
      .select("id, name, sku, model_tag")
      .in("id", selectedIds);

    const productMap = new Map(products?.map(p => [p.id, p]) || []);

    try {
      for (const productId of selectedIds) {
        const product = productMap.get(productId);
        const productName = product?.name || 'Produto desconhecido';
        const productSku = product?.sku || product?.model_tag || 'Sem SKU';

        try {
          const { data, error } = await supabase.functions.invoke('bling-integration', {
            body: {
              action: 'sync_product',
              product_id: productId
            }
          });

          if (error) {
            results.push({
              id: productId,
              name: productName,
              sku: productSku,
              status: 'error',
              message: error.message || 'Erro desconhecido'
            });
          } else if (data?.already_exists) {
            // Produto já existe no Bling
            results.push({
              id: productId,
              name: data.product_name || productName,
              sku: data.sku || productSku,
              status: 'duplicate',
              message: data.message || 'Produto já existe no Bling'
            });
          } else if (data?.error) {
            results.push({
              id: productId,
              name: productName,
              sku: productSku,
              status: 'error',
              message: data.error
            });
          } else if (data?.success) {
            results.push({
              id: productId,
              name: data.product_name || productName,
              sku: data.sku || productSku,
              status: 'success',
              message: `ID Bling: ${data.bling_product_id}`
            });
          } else {
            results.push({
              id: productId,
              name: productName,
              sku: productSku,
              status: 'error',
              message: 'Resposta inesperada do servidor'
            });
          }
        } catch (err: any) {
          results.push({
            id: productId,
            name: productName,
            sku: productSku,
            status: 'error',
            message: err.message || 'Erro de conexão'
          });
        }
      }

      // Calcular estatísticas
      const successCount = results.filter(r => r.status === 'success').length;
      const duplicateCount = results.filter(r => r.status === 'duplicate').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      // Salvar resultados e mostrar dialog
      setBlingResults(results);
      setBlingResultsDialog(true);

      // Toast resumido
      if (successCount > 0 && duplicateCount === 0 && errorCount === 0) {
        toast.success(`✅ ${successCount} produto(s) enviado(s) com sucesso!`);
      } else if (successCount === 0 && duplicateCount > 0 && errorCount === 0) {
        toast.warning(`⚠️ ${duplicateCount} produto(s) já existiam no Bling`);
      } else {
        toast.info(`Veja o relatório completo de envio`);
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

  // Calcular estatísticas dos resultados
  const successResults = blingResults.filter(r => r.status === 'success');
  const duplicateResults = blingResults.filter(r => r.status === 'duplicate');
  const errorResults = blingResults.filter(r => r.status === 'error');

  if (selectedIds.length === 0) return null;

  return (
    <>
      <Card className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 shadow-lg">
        <div className="flex items-center gap-3 p-4 flex-wrap justify-center">
          <span className="text-sm font-medium">
            {selectedIds.length}{totalProducts ? ` de ${totalProducts}` : ""} produto{selectedIds.length > 1 ? "s" : ""} selecionado{selectedIds.length > 1 ? "s" : ""}
          </span>

          <div className="h-6 w-px bg-border hidden sm:block" />

          {/* Excluir em Lote - PRIMEIRO BOTÃO */}
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={openDeleteDialog}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </Button>

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

      {/* Dialog de Resultados do Bling */}
      <Dialog open={blingResultsDialog} onOpenChange={setBlingResultsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Relatório de Envio ao Bling</DialogTitle>
            <DialogDescription>
              Resumo do envio de {blingResults.length} produto(s) para o Bling
            </DialogDescription>
          </DialogHeader>

          {/* Resumo em Cards */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-500">{successResults.length}</p>
                <p className="text-xs text-muted-foreground">Enviados</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-yellow-500">{duplicateResults.length}</p>
                <p className="text-xs text-muted-foreground">Já existiam</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-500">{errorResults.length}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
            </div>
          </div>

          {/* Lista Detalhada */}
          <ScrollArea className="h-[300px] border rounded-lg">
            <div className="p-4 space-y-2">
              {/* Sucesso */}
              {successResults.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-green-500 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Enviados com Sucesso ({successResults.length})
                  </h4>
                  {successResults.map(r => (
                    <div key={r.id} className="flex items-center justify-between py-2 px-3 bg-green-500/5 rounded text-sm">
                      <div>
                        <span className="font-medium">{r.name}</span>
                        <span className="text-muted-foreground ml-2">({r.sku})</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{r.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Duplicados */}
              {duplicateResults.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-yellow-500 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Já Existiam no Bling ({duplicateResults.length})
                  </h4>
                  {duplicateResults.map(r => (
                    <div key={r.id} className="flex items-center justify-between py-2 px-3 bg-yellow-500/5 rounded text-sm">
                      <div>
                        <span className="font-medium">{r.name}</span>
                        <span className="text-muted-foreground ml-2">({r.sku})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Erros */}
              {errorResults.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-500 mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Erros ({errorResults.length})
                  </h4>
                  {errorResults.map(r => (
                    <div key={r.id} className="py-2 px-3 bg-red-500/5 rounded text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{r.name}</span>
                          <span className="text-muted-foreground ml-2">({r.sku})</span>
                        </div>
                      </div>
                      <p className="text-xs text-red-500 mt-1">{r.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button onClick={() => setBlingResultsDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Você está prestes a excluir {productsToDelete.length} produto(s):
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[200px] border rounded-lg p-3 bg-muted/50">
            <ul className="space-y-2">
              {productsToDelete.map((product) => (
                <li key={product.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate max-w-[250px]">{product.name}</span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">
                    {product.sku || "Sem SKU"}
                  </code>
                </li>
              ))}
            </ul>
          </ScrollArea>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-2">
            <p className="text-sm text-destructive font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Esta ação não pode ser desfeita!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Todos os dados, variações e imagens serão permanentemente removidos.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Excluir {productsToDelete.length} Produto(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
