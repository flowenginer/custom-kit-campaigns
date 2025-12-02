import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Settings, Package, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ProductDetailDrawer } from "@/components/products/ProductDetailDrawer";
import { BulkActionsBar } from "@/components/products/BulkActionsBar";

interface ShirtModel {
  id: string;
  name: string;
  sku: string | null;
  model_tag: string | null;
  segment_tag: string | null;
  photo_main: string;
  image_front: string;
  base_price: number | null;
  peso: number | null;
  altura: number | null;
  largura: number | null;
  profundidade: number | null;
}

interface ProductListProps {
  onSelectModel: (id: string, name: string) => void;
  onSwitchToVariations?: () => void;
}

export default function ProductList({ onSelectModel, onSwitchToVariations }: ProductListProps) {
  const [products, setProducts] = useState<ShirtModel[]>([]);
  const [variationCounts, setVariationCounts] = useState<Record<string, number>>({});
  const [stockCounts, setStockCounts] = useState<Record<string, number>>({});
  const [promotionalPrices, setPromotionalPrices] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  
  // Seleção múltipla
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filtros
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSegment, setFilterSegment] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableSegments, setAvailableSegments] = useState<string[]>([]);

  // Bling integration
  const [blingEnabled, setBlingEnabled] = useState(false);
  const [blingLoading, setBlingLoading] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  useEffect(() => {
    loadProducts();
    checkBlingSettings();
  }, []);

  const checkBlingSettings = async () => {
    // Verificar se Bling está habilitado
    const { data: settings } = await supabase
      .from("company_settings")
      .select("bling_enabled")
      .single();
    
    setBlingEnabled(settings?.bling_enabled || false);

    // Contar produtos não sincronizados
    const { count } = await supabase
      .from("shirt_models")
      .select("id", { count: "exact", head: true })
      .is("bling_synced_at", null);
    
    setUnsyncedCount(count || 0);
  };

  const sendAllToBling = async () => {
    setBlingLoading(true);
    
    try {
      // Buscar todos os produtos não sincronizados
      const { data: unsyncedProducts, error } = await supabase
        .from("shirt_models")
        .select("id, name, sku, base_price, peso, altura, largura, profundidade")
        .is("bling_synced_at", null);

      if (error) throw error;

      if (!unsyncedProducts || unsyncedProducts.length === 0) {
        toast.info("Todos os produtos já estão sincronizados!");
        setBlingLoading(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Processar em lotes para não sobrecarregar
      for (const product of unsyncedProducts) {
        try {
          const { error: syncError } = await supabase.functions.invoke("bling-integration", {
            body: {
              action: "sync_product",
              product_id: product.id
            }
          });

          if (syncError) {
            console.error(`Erro ao sincronizar ${product.name}:`, syncError);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Erro ao sincronizar ${product.name}:`, err);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast.success(`✅ ${successCount} produtos enviados para o Bling com sucesso!`);
      } else {
        toast.warning(`${successCount} produtos sincronizados, ${errorCount} com erro`);
      }

      // Atualizar contagem
      checkBlingSettings();
      loadProducts();
    } catch (err) {
      console.error("Erro ao enviar para Bling:", err);
      toast.error("Erro ao enviar produtos para o Bling");
    } finally {
      setBlingLoading(false);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shirt_models")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar produtos");
      setLoading(false);
      return;
    }

    setProducts(data || []);
    
    if (data) {
      const ids = data.map(p => p.id);
      loadVariationCounts(ids);
      loadStockAndPrices(ids);
    }
    setLoading(false);
  };

  const loadVariationCounts = async (modelIds: string[]) => {
    const { data, error } = await supabase
      .from("shirt_model_variations")
      .select("model_id, id")
      .in("model_id", modelIds);

    if (error) {
      console.error("Erro ao carregar variações:", error);
      return;
    }

    const counts: Record<string, number> = {};
    modelIds.forEach(id => counts[id] = 0);
    
    data?.forEach(v => {
      counts[v.model_id] = (counts[v.model_id] || 0) + 1;
    });
    
    setVariationCounts(counts);
  };

  const loadStockAndPrices = async (modelIds: string[]) => {
    const { data, error } = await supabase
      .from("shirt_model_variations")
      .select("model_id, stock_quantity, promotional_price")
      .in("model_id", modelIds);

    if (error) {
      console.error("Erro ao carregar estoque:", error);
      return;
    }

    const stocks: Record<string, number> = {};
    const promoPrice: Record<string, number | null> = {};
    
    modelIds.forEach(id => {
      stocks[id] = 0;
      promoPrice[id] = null;
    });

    data?.forEach(v => {
      stocks[v.model_id] = (stocks[v.model_id] || 0) + v.stock_quantity;
      
      // Pegar o menor preço promocional (se houver)
      if (v.promotional_price && (!promoPrice[v.model_id] || v.promotional_price < promoPrice[v.model_id]!)) {
        promoPrice[v.model_id] = v.promotional_price;
      }
    });

    setStockCounts(stocks);
    setPromotionalPrices(promoPrice);
  };

  // Carregar opções de filtro
  useEffect(() => {
    const types = [...new Set(products.map(p => p.model_tag).filter(Boolean))] as string[];
    const segments = [...new Set(products.map(p => p.segment_tag).filter(Boolean))] as string[];
    setAvailableTypes(types);
    setAvailableSegments(segments);
  }, [products]);

  // Filtrar produtos
  const filteredProducts = products.filter(product => {
    if (filterType !== "all" && product.model_tag !== filterType) return false;
    if (filterSegment !== "all" && product.segment_tag !== filterSegment) return false;
    if (filterStatus === "with_price" && !product.base_price) return false;
    if (filterStatus === "without_price" && product.base_price) return false;
    if (filterStatus === "with_sku" && !product.sku) return false;
    if (filterStatus === "without_sku" && product.sku) return false;
    if (searchText && !product.name.toLowerCase().includes(searchText.toLowerCase()) && !product.sku?.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const openDetailDrawer = (productId: string) => {
    setDetailProductId(productId);
    setDetailDrawerOpen(true);
  };

  const clearFilters = () => {
    setFilterType("all");
    setFilterSegment("all");
    setFilterStatus("all");
    setSearchText("");
  };

  const handleSelectProduct = (product: ShirtModel) => {
    setSelectedProductId(product.id);
    onSelectModel(product.id, product.name);
    toast.success(`✅ ${product.name} selecionado`);
    
    // Automaticamente mudar para a aba de variações
    if (onSwitchToVariations) {
      onSwitchToVariations();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos Cadastrados</CardTitle>
        <CardDescription>
          Selecione um produto para gerenciar suas variações
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Tipo</Label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Todos os Tipos</option>
                {availableTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label>Segmento</Label>
              <select
                value={filterSegment}
                onChange={(e) => setFilterSegment(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Todos os Segmentos</option>
                {availableSegments.map(segment => (
                  <option key={segment} value={segment}>{segment}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Status</Label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Todos</option>
                <option value="with_price">Com Preço</option>
                <option value="without_price">Sem Preço</option>
                <option value="with_sku">Com SKU</option>
                <option value="without_sku">Sem SKU</option>
              </select>
            </div>
            
            <div>
              <Label>Pesquisar</Label>
              <Input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Nome ou SKU..."
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpar Filtros
              </Button>
              
              {/* Botão Enviar TODOS para Bling */}
              {blingEnabled && unsyncedCount > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={sendAllToBling}
                  disabled={blingLoading}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {blingLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Enviar Todos para Bling ({unsyncedCount})
                </Button>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              Mostrando {filteredProducts.length} de {products.length} produtos
            </span>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Imagem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Tipo/Segmento</TableHead>
              <TableHead>Preço Base</TableHead>
              <TableHead>Preço Promocional</TableHead>
              <TableHead>
                <Package className="inline h-4 w-4 mr-1" />
                Estoque
              </TableHead>
              <TableHead>Variações</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const promoPrice = promotionalPrices[product.id];
                const stock = stockCounts[product.id] || 0;
                
                return (
                  <TableRow 
                    key={product.id}
                    className={selectedIds.includes(product.id) ? "bg-primary/5" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(product.id)}
                        onCheckedChange={() => toggleSelectProduct(product.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <img
                        src={product.image_front || product.photo_main}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded cursor-pointer hover:scale-110 transition-transform"
                        onClick={() => openDetailDrawer(product.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {product.name}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {product.sku || "-"}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {product.model_tag && (
                          <Badge variant="outline" className="text-xs">{product.model_tag}</Badge>
                        )}
                        {product.segment_tag && (
                          <Badge variant="secondary" className="text-xs">{product.segment_tag}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.base_price ? (
                        <span className="font-semibold">R$ {product.base_price.toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {promoPrice ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-destructive">
                            R$ {promoPrice.toFixed(2)}
                          </span>
                          <Badge variant="destructive" className="text-xs w-fit">
                            PROMOÇÃO
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={stock > 0 ? "default" : "secondary"}>
                        {stock}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {variationCounts[product.id] || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailDrawer(product.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={selectedProductId === product.id ? "default" : "ghost"}
                          size="sm"
                          onClick={() => handleSelectProduct(product)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      <ProductDetailDrawer
        productId={detailProductId}
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
        onUpdate={loadProducts}
      />

      <BulkActionsBar
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
        onComplete={loadProducts}
      />
    </Card>
  );
}