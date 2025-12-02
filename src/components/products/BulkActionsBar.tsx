import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, X, Download, Barcode, Package, Loader2, CheckCircle2, AlertTriangle, XCircle, Trash2, Tag, Shirt, Baby } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onComplete: () => void;
  totalProducts?: number;
}

interface SelectedProduct {
  id: string;
  name: string;
  sku: string | null;
  base_price: number | null;
  variationCount: number;
}

interface PriceTierData {
  standard: { price: number | null; promoPrice: number | null; count: number };
  plus: { price: number | null; promoPrice: number | null; count: number };
  kids: { price: number | null; promoPrice: number | null; count: number };
}

interface BlingResult {
  id: string;
  name: string;
  sku: string;
  status: 'success' | 'duplicate' | 'error';
  message?: string;
}

// Size tier definitions
const STANDARD_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG'];
const PLUS_SIZES = ['G1', 'G2', 'G3', 'G4', 'G5'];
const KIDS_SIZES = ['1 ANO', '2 ANOS', '4 ANOS', '6 ANOS', '8 ANOS', '10 ANOS', '12 ANOS', '14 ANOS'];

export function BulkActionsBar({ selectedIds, onClearSelection, onComplete, totalProducts }: BulkActionsBarProps) {
  const [bulkPriceDialog, setBulkPriceDialog] = useState(false);
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
  
  // Estado para preço promocional
  const [promoPriceDialog, setPromoPriceDialog] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  
  // Estado para lista de produtos selecionados
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Estado para preços por tier
  const [priceTiers, setPriceTiers] = useState({
    standard: '',
    plus: '',
    kids: ''
  });
  const [promoPriceTiers, setPromoPriceTiers] = useState({
    standard: '',
    plus: '',
    kids: ''
  });
  const [currentTierPrices, setCurrentTierPrices] = useState<PriceTierData>({
    standard: { price: null, promoPrice: null, count: 0 },
    plus: { price: null, promoPrice: null, count: 0 },
    kids: { price: null, promoPrice: null, count: 0 }
  });

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

  // Buscar dados dos produtos selecionados e preços por tier
  const fetchSelectedProductsWithTiers = async () => {
    setLoadingProducts(true);
    
    // Buscar produtos
    const { data: products } = await supabase
      .from("shirt_models")
      .select("id, name, sku, base_price")
      .in("id", selectedIds);
    
    // Buscar variações para obter preços por tier
    const { data: variations } = await supabase
      .from("shirt_model_variations")
      .select("model_id, size, price_adjustment, promotional_price")
      .in("model_id", selectedIds);
    
    // Calcular contagem de variações por produto
    const variationCountMap: Record<string, number> = {};
    variations?.forEach(v => {
      variationCountMap[v.model_id] = (variationCountMap[v.model_id] || 0) + 1;
    });
    
    const productsWithCount = (products || []).map(p => ({
      ...p,
      variationCount: variationCountMap[p.id] || 0
    }));
    
    setSelectedProducts(productsWithCount);
    
    // Calcular preços médios por tier
    const tierData: PriceTierData = {
      standard: { price: null, promoPrice: null, count: 0 },
      plus: { price: null, promoPrice: null, count: 0 },
      kids: { price: null, promoPrice: null, count: 0 }
    };
    
    const standardPrices: number[] = [];
    const standardPromos: number[] = [];
    const plusPrices: number[] = [];
    const plusPromos: number[] = [];
    const kidsPrices: number[] = [];
    const kidsPromos: number[] = [];
    
    variations?.forEach(v => {
      const product = products?.find(p => p.id === v.model_id);
      const basePrice = (product?.base_price || 0) + (v.price_adjustment || 0);
      
      if (STANDARD_SIZES.includes(v.size)) {
        tierData.standard.count++;
        standardPrices.push(basePrice);
        if (v.promotional_price) standardPromos.push(v.promotional_price);
      } else if (PLUS_SIZES.includes(v.size)) {
        tierData.plus.count++;
        plusPrices.push(basePrice);
        if (v.promotional_price) plusPromos.push(v.promotional_price);
      } else if (KIDS_SIZES.includes(v.size)) {
        tierData.kids.count++;
        kidsPrices.push(basePrice);
        if (v.promotional_price) kidsPromos.push(v.promotional_price);
      }
    });
    
    // Calcular moda (preço mais comum) ou média
    const getMostCommonPrice = (prices: number[]) => {
      if (prices.length === 0) return null;
      const counts: Record<number, number> = {};
      prices.forEach(p => { counts[p] = (counts[p] || 0) + 1; });
      return parseFloat(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
    };
    
    tierData.standard.price = getMostCommonPrice(standardPrices);
    tierData.standard.promoPrice = getMostCommonPrice(standardPromos);
    tierData.plus.price = getMostCommonPrice(plusPrices);
    tierData.plus.promoPrice = getMostCommonPrice(plusPromos);
    tierData.kids.price = getMostCommonPrice(kidsPrices);
    tierData.kids.promoPrice = getMostCommonPrice(kidsPromos);
    
    setCurrentTierPrices(tierData);
    setLoadingProducts(false);
  };

  // Abrir modal de preço base
  const openBasePriceDialog = async () => {
    await fetchSelectedProductsWithTiers();
    setPriceTiers({ standard: '', plus: '', kids: '' });
    setBulkPriceDialog(true);
  };

  // Abrir modal de preço promocional
  const openPromoPriceDialog = async () => {
    await fetchSelectedProductsWithTiers();
    setPromoPriceTiers({ standard: '', plus: '', kids: '' });
    setPromoPriceDialog(true);
  };

  // Formatar input de preço
  const formatPriceInput = (value: string) => {
    let cleaned = value.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts[1]?.length > 2) {
      cleaned = parts[0] + '.' + parts[1].substring(0, 2);
    }
    return cleaned;
  };

  // Formatar preço para exibição
  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "-";
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
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

  // Aplicar preço base por tier
  const applyBulkPriceByTier = async () => {
    const standardPrice = priceTiers.standard ? parseFloat(priceTiers.standard) : null;
    const plusPrice = priceTiers.plus ? parseFloat(priceTiers.plus) : null;
    const kidsPrice = priceTiers.kids ? parseFloat(priceTiers.kids) : null;

    // Validar se pelo menos um tier tem preço
    if (standardPrice === null && plusPrice === null && kidsPrice === null) {
      toast.error("Por favor, insira pelo menos um preço");
      return;
    }

    // Validar valores
    const validatePrice = (price: number | null, label: string) => {
      if (price !== null && (isNaN(price) || price < 0.01 || price > 9999.99)) {
        toast.error(`Preço ${label} inválido. Use valores entre 0.01 e 9999.99`);
        return false;
      }
      return true;
    };

    if (!validatePrice(standardPrice, 'padrão') || 
        !validatePrice(plusPrice, 'plus') || 
        !validatePrice(kidsPrice, 'infantil')) {
      return;
    }

    setLoading(true);
    let totalUpdated = 0;

    try {
      // Update standard sizes
      if (standardPrice !== null) {
        await supabase
          .from("shirt_model_variations")
          .update({ price_adjustment: 0 })
          .in("model_id", selectedIds)
          .in("size", STANDARD_SIZES);
        
        // Also update base_price on shirt_models for reference
        await supabase
          .from("shirt_models")
          .update({ base_price: standardPrice })
          .in("id", selectedIds);
        
        totalUpdated += currentTierPrices.standard.count;
      }

      // Update plus sizes (using price_adjustment to add the difference)
      if (plusPrice !== null) {
        // Get current base prices
        const { data: models } = await supabase
          .from("shirt_models")
          .select("id, base_price")
          .in("id", selectedIds);
        
        for (const model of models || []) {
          const basePrice = standardPrice || model.base_price || 0;
          const adjustment = plusPrice - basePrice;
          
          await supabase
            .from("shirt_model_variations")
            .update({ price_adjustment: adjustment })
            .eq("model_id", model.id)
            .in("size", PLUS_SIZES);
        }
        
        totalUpdated += currentTierPrices.plus.count;
      }

      // Update kids sizes
      if (kidsPrice !== null) {
        const { data: models } = await supabase
          .from("shirt_models")
          .select("id, base_price")
          .in("id", selectedIds);
        
        for (const model of models || []) {
          const basePrice = standardPrice || model.base_price || 0;
          const adjustment = kidsPrice - basePrice;
          
          await supabase
            .from("shirt_model_variations")
            .update({ price_adjustment: adjustment })
            .eq("model_id", model.id)
            .in("size", KIDS_SIZES);
        }
        
        totalUpdated += currentTierPrices.kids.count;
      }

      const tiersUpdated = [
        standardPrice !== null ? 'padrão' : null,
        plusPrice !== null ? 'plus' : null,
        kidsPrice !== null ? 'infantil' : null
      ].filter(Boolean).join(', ');

      toast.success(`✅ Preços atualizados! ${selectedIds.length} produto(s), tamanhos: ${tiersUpdated}`);
      setBulkPriceDialog(false);
      setPriceTiers({ standard: '', plus: '', kids: '' });
      onClearSelection();
      onComplete();
    } catch (error: any) {
      toast.error("Erro ao atualizar preços: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Aplicar preço promocional por tier
  const applyPromoPriceByTier = async () => {
    const standardPromo = promoPriceTiers.standard ? parseFloat(promoPriceTiers.standard) : null;
    const plusPromo = promoPriceTiers.plus ? parseFloat(promoPriceTiers.plus) : null;
    const kidsPromo = promoPriceTiers.kids ? parseFloat(promoPriceTiers.kids) : null;

    // Validar valores
    const validatePrice = (price: number | null, label: string) => {
      if (price !== null && (isNaN(price) || price < 0.01 || price > 9999.99)) {
        toast.error(`Preço ${label} inválido. Use valores entre 0.01 e 9999.99`);
        return false;
      }
      return true;
    };

    if (!validatePrice(standardPromo, 'padrão') || 
        !validatePrice(plusPromo, 'plus') || 
        !validatePrice(kidsPromo, 'infantil')) {
      return;
    }

    // Validar se promo é menor que base
    if (standardPromo !== null && currentTierPrices.standard.price !== null && 
        standardPromo >= currentTierPrices.standard.price) {
      toast.error(`Preço promo padrão deve ser menor que ${formatPrice(currentTierPrices.standard.price)}`);
      return;
    }
    if (plusPromo !== null && currentTierPrices.plus.price !== null && 
        plusPromo >= currentTierPrices.plus.price) {
      toast.error(`Preço promo plus deve ser menor que ${formatPrice(currentTierPrices.plus.price)}`);
      return;
    }
    if (kidsPromo !== null && currentTierPrices.kids.price !== null && 
        kidsPromo >= currentTierPrices.kids.price) {
      toast.error(`Preço promo infantil deve ser menor que ${formatPrice(currentTierPrices.kids.price)}`);
      return;
    }

    setPromoLoading(true);
    let totalUpdated = 0;

    try {
      // Update standard sizes promo
      if (promoPriceTiers.standard !== '') {
        await supabase
          .from("shirt_model_variations")
          .update({ promotional_price: standardPromo })
          .in("model_id", selectedIds)
          .in("size", STANDARD_SIZES);
        
        totalUpdated += currentTierPrices.standard.count;
      }

      // Update plus sizes promo
      if (promoPriceTiers.plus !== '') {
        await supabase
          .from("shirt_model_variations")
          .update({ promotional_price: plusPromo })
          .in("model_id", selectedIds)
          .in("size", PLUS_SIZES);
        
        totalUpdated += currentTierPrices.plus.count;
      }

      // Update kids sizes promo
      if (promoPriceTiers.kids !== '') {
        await supabase
          .from("shirt_model_variations")
          .update({ promotional_price: kidsPromo })
          .in("model_id", selectedIds)
          .in("size", KIDS_SIZES);
        
        totalUpdated += currentTierPrices.kids.count;
      }

      const hasUpdates = promoPriceTiers.standard !== '' || promoPriceTiers.plus !== '' || promoPriceTiers.kids !== '';
      
      if (hasUpdates) {
        toast.success(`✅ Preços promocionais atualizados em ${selectedIds.length} produto(s)!`);
      } else {
        toast.info("Nenhuma alteração realizada");
      }
      
      setPromoPriceDialog(false);
      setPromoPriceTiers({ standard: '', plus: '', kids: '' });
      onClearSelection();
      onComplete();
    } catch (error: any) {
      toast.error("Erro ao atualizar preços promocionais: " + error.message);
    } finally {
      setPromoLoading(false);
    }
  };

  const generateSKUs = async () => {
    setSkuLoading(true);
    try {
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

      const { data: existingSkus } = await supabase
        .from("shirt_models")
        .select("sku")
        .not("sku", "is", null);

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

      const updates: { id: string; sku: string }[] = [];
      
      for (const product of productsWithoutSku) {
        const segment = (product.segment_tag || "GEN").substring(0, 3).toUpperCase();
        const model = (product.model_tag || "MOD").substring(0, 3).toUpperCase();
        const prefix = `${segment}-${model}`;
        
        skuCounters[prefix] = (skuCounters[prefix] || 0) + 1;
        const seq = skuCounters[prefix].toString().padStart(3, "0");
        
        updates.push({
          id: product.id,
          sku: `${prefix}-${seq}`
        });
      }

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

      const successCount = results.filter(r => r.status === 'success').length;
      const duplicateCount = results.filter(r => r.status === 'duplicate').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      setBlingResults(results);
      setBlingResultsDialog(true);

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

          {/* Excluir em Lote */}
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={openDeleteDialog}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </Button>

          {/* Definir Preço Base */}
          <Button variant="outline" size="sm" onClick={openBasePriceDialog}>
            <DollarSign className="mr-2 h-4 w-4" />
            Preço Base
          </Button>

          {/* Definir Preço Promocional */}
          <Button variant="secondary" size="sm" onClick={openPromoPriceDialog}>
            <Tag className="mr-2 h-4 w-4" />
            Preço Promo
          </Button>

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

          <ScrollArea className="h-[300px] border rounded-lg">
            <div className="p-4 space-y-2">
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

      {/* Modal de Preço Base com 3 Tiers */}
      <Dialog open={bulkPriceDialog} onOpenChange={setBulkPriceDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Editar Preço Base
            </DialogTitle>
            <DialogDescription>
              Você está editando o preço base de {selectedIds.length} produto(s) selecionado(s).
            </DialogDescription>
          </DialogHeader>

          {loadingProducts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">Produtos Selecionados:</Label>
                <ScrollArea className="max-h-[100px] border rounded-lg p-2 bg-muted/30 mt-1">
                  <ul className="space-y-1">
                    {selectedProducts.map((product) => (
                      <li key={product.id} className="flex items-center justify-between text-sm py-1">
                        <span className="truncate max-w-[200px]">{product.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {product.variationCount} var.
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>

              <div className="space-y-4">
                {/* Tamanhos Padrão */}
                <div className="space-y-2 p-3 border rounded-lg bg-blue-500/5">
                  <div className="flex items-center gap-2">
                    <Shirt className="h-4 w-4 text-blue-500" />
                    <Label className="font-medium">Tamanhos Padrão (PP, P, M, G, GG, XG)</Label>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={priceTiers.standard}
                      onChange={(e) => setPriceTiers(prev => ({ ...prev, standard: formatPriceInput(e.target.value) }))}
                      placeholder={currentTierPrices.standard.price?.toFixed(2) || "0.00"}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Preço atual: {formatPrice(currentTierPrices.standard.price)} ({currentTierPrices.standard.count} variações)
                  </p>
                </div>

                {/* Tamanhos Plus */}
                <div className="space-y-2 p-3 border rounded-lg bg-purple-500/5">
                  <div className="flex items-center gap-2">
                    <Shirt className="h-4 w-4 text-purple-500" />
                    <Label className="font-medium">Tamanhos Plus (G1, G2, G3, G4, G5)</Label>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={priceTiers.plus}
                      onChange={(e) => setPriceTiers(prev => ({ ...prev, plus: formatPriceInput(e.target.value) }))}
                      placeholder={currentTierPrices.plus.price?.toFixed(2) || "0.00"}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Preço atual: {formatPrice(currentTierPrices.plus.price)} ({currentTierPrices.plus.count} variações)
                  </p>
                </div>

                {/* Tamanhos Infantis */}
                <div className="space-y-2 p-3 border rounded-lg bg-green-500/5">
                  <div className="flex items-center gap-2">
                    <Baby className="h-4 w-4 text-green-500" />
                    <Label className="font-medium">Tamanhos Infantis (1-14 ANOS)</Label>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={priceTiers.kids}
                      onChange={(e) => setPriceTiers(prev => ({ ...prev, kids: formatPriceInput(e.target.value) }))}
                      placeholder={currentTierPrices.kids.price?.toFixed(2) || "0.00"}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Preço atual: {formatPrice(currentTierPrices.kids.price)} ({currentTierPrices.kids.count} variações)
                  </p>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Deixe campos vazios para manter o preço atual.
                </p>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkPriceDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={applyBulkPriceByTier} 
              disabled={loading || loadingProducts || (!priceTiers.standard && !priceTiers.plus && !priceTiers.kids)}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atualizar Preços
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Preço Promocional com 3 Tiers */}
      <Dialog open={promoPriceDialog} onOpenChange={setPromoPriceDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-secondary" />
              Editar Preço Promocional
            </DialogTitle>
            <DialogDescription>
              Você está editando o preço promocional de {selectedIds.length} produto(s) selecionado(s).
            </DialogDescription>
          </DialogHeader>

          {loadingProducts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">Produtos Selecionados:</Label>
                <ScrollArea className="max-h-[100px] border rounded-lg p-2 bg-muted/30 mt-1">
                  <ul className="space-y-1">
                    {selectedProducts.map((product) => (
                      <li key={product.id} className="text-sm py-1">
                        <div className="flex items-center justify-between">
                          <span className="truncate max-w-[180px]">{product.name}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {product.variationCount} var.
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>

              <div className="space-y-4">
                {/* Tamanhos Padrão */}
                <div className="space-y-2 p-3 border rounded-lg bg-blue-500/5">
                  <div className="flex items-center gap-2">
                    <Shirt className="h-4 w-4 text-blue-500" />
                    <Label className="font-medium">Tamanhos Padrão (PP, P, M, G, GG, XG)</Label>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={promoPriceTiers.standard}
                      onChange={(e) => setPromoPriceTiers(prev => ({ ...prev, standard: formatPriceInput(e.target.value) }))}
                      placeholder="Deixe vazio para remover"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Base: {formatPrice(currentTierPrices.standard.price)} | Promo atual: {formatPrice(currentTierPrices.standard.promoPrice)}
                  </p>
                </div>

                {/* Tamanhos Plus */}
                <div className="space-y-2 p-3 border rounded-lg bg-purple-500/5">
                  <div className="flex items-center gap-2">
                    <Shirt className="h-4 w-4 text-purple-500" />
                    <Label className="font-medium">Tamanhos Plus (G1, G2, G3, G4, G5)</Label>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={promoPriceTiers.plus}
                      onChange={(e) => setPromoPriceTiers(prev => ({ ...prev, plus: formatPriceInput(e.target.value) }))}
                      placeholder="Deixe vazio para remover"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Base: {formatPrice(currentTierPrices.plus.price)} | Promo atual: {formatPrice(currentTierPrices.plus.promoPrice)}
                  </p>
                </div>

                {/* Tamanhos Infantis */}
                <div className="space-y-2 p-3 border rounded-lg bg-green-500/5">
                  <div className="flex items-center gap-2">
                    <Baby className="h-4 w-4 text-green-500" />
                    <Label className="font-medium">Tamanhos Infantis (1-14 ANOS)</Label>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={promoPriceTiers.kids}
                      onChange={(e) => setPromoPriceTiers(prev => ({ ...prev, kids: formatPriceInput(e.target.value) }))}
                      placeholder="Deixe vazio para remover"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Base: {formatPrice(currentTierPrices.kids.price)} | Promo atual: {formatPrice(currentTierPrices.kids.promoPrice)}
                  </p>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  O preço promocional deve ser menor que o preço base de cada grupo.
                </p>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoPriceDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={applyPromoPriceByTier} disabled={promoLoading || loadingProducts}>
              {promoLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atualizar Promoções
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
