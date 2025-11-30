import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { X, Save, Package, Ruler, ListTree, Link2, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ProductDetailDrawerProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

interface ProductData {
  id: string;
  name: string;
  sku: string | null;
  model_tag: string | null;
  segment_tag: string | null;
  base_price: number | null;
  peso: number | null;
  altura: number | null;
  largura: number | null;
  profundidade: number | null;
  volumes: number | null;
  unidade: string | null;
  photo_main: string;
  image_front: string;
  image_back: string;
  image_left: string;
  image_right: string;
  features: string[];
  bling_product_id: number | null;
  bling_synced_at: string | null;
}

interface Variation {
  id: string;
  size: string;
  gender: string;
  sku_suffix: string | null;
  price_adjustment: number;
  promotional_price: number | null;
  stock_quantity: number;
  is_active: boolean;
}

export function ProductDetailDrawer({ productId, open, onOpenChange, onUpdate }: ProductDetailDrawerProps) {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Edição inline
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingVariationId, setEditingVariationId] = useState<string | null>(null);

  useEffect(() => {
    if (productId && open) {
      loadProductData();
      loadVariations();
    }
  }, [productId, open]);

  const loadProductData = async () => {
    if (!productId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("shirt_models")
      .select("*")
      .eq("id", productId)
      .single();

    if (error) {
      toast.error("Erro ao carregar produto");
      setLoading(false);
      return;
    }

    setProduct(data);
    setLoading(false);
  };

  const loadVariations = async () => {
    if (!productId) return;

    const { data, error } = await supabase
      .from("shirt_model_variations")
      .select("*")
      .eq("model_id", productId)
      .order("size");

    if (error) {
      toast.error("Erro ao carregar variações");
      return;
    }

    setVariations(data || []);
  };

  const updateProduct = async (field: string, value: any) => {
    if (!productId) return;

    const { error } = await supabase
      .from("shirt_models")
      .update({ [field]: value })
      .eq("id", productId);

    if (error) {
      toast.error(`Erro ao atualizar ${field}`);
      return;
    }

    toast.success("Atualizado com sucesso!");
    loadProductData();
    onUpdate?.();
    setEditingField(null);
  };

  const updateVariation = async (variationId: string, field: string, value: any) => {
    const { error } = await supabase
      .from("shirt_model_variations")
      .update({ [field]: value })
      .eq("id", variationId);

    if (error) {
      toast.error("Erro ao atualizar variação");
      return;
    }

    toast.success("Variação atualizada!");
    loadVariations();
    setEditingVariationId(null);
  };

  const deleteVariation = async (variationId: string) => {
    if (!confirm("Deseja realmente excluir esta variação?")) return;

    const { error } = await supabase
      .from("shirt_model_variations")
      .delete()
      .eq("id", variationId);

    if (error) {
      toast.error("Erro ao excluir variação");
      return;
    }

    toast.success("Variação excluída!");
    loadVariations();
  };

  const calculateFinalPrice = (variation: Variation) => {
    if (variation.promotional_price) return variation.promotional_price;
    const basePrice = product?.base_price || 0;
    return basePrice + variation.price_adjustment;
  };

  const totalStock = variations.reduce((acc, v) => acc + v.stock_quantity, 0);
  const activeVariations = variations.filter(v => v.is_active).length;

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[95vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-6 w-6" />
                {product.name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">SKU: {product.sku || "Não definido"}</p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-full">
          <div className="px-6 py-6 space-y-8">
            {/* Dados Gerais */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold">Informações Básicas</h3>
              </div>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nome do Produto</Label>
                      {editingField === "name" ? (
                        <div className="flex gap-2">
                          <Input
                            defaultValue={product.name}
                            onBlur={(e) => updateProduct("name", e.target.value)}
                            autoFocus
                          />
                          <Button size="sm" onClick={() => setEditingField(null)}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input value={product.name} readOnly />
                          <Button variant="ghost" size="sm" onClick={() => setEditingField("name")}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>SKU</Label>
                      {editingField === "sku" ? (
                        <div className="flex gap-2">
                          <Input
                            defaultValue={product.sku || ""}
                            onBlur={(e) => updateProduct("sku", e.target.value)}
                            autoFocus
                          />
                          <Button size="sm" onClick={() => setEditingField(null)}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input value={product.sku || "Não definido"} readOnly />
                          <Button variant="ghost" size="sm" onClick={() => setEditingField("sku")}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Tipo</Label>
                      <div className="mt-2">
                        <Badge variant="outline">{product.model_tag || "N/A"}</Badge>
                      </div>
                    </div>

                    <div>
                      <Label>Segmento</Label>
                      <div className="mt-2">
                        <Badge variant="secondary">{product.segment_tag || "N/A"}</Badge>
                      </div>
                    </div>

                    <div>
                      <Label>Preço Base (R$)</Label>
                      {editingField === "base_price" ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            defaultValue={product.base_price || 0}
                            onBlur={(e) => updateProduct("base_price", parseFloat(e.target.value))}
                            autoFocus
                          />
                          <Button size="sm" onClick={() => setEditingField(null)}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            value={product.base_price ? `R$ ${product.base_price.toFixed(2)}` : "Não definido"}
                            readOnly
                          />
                          <Button variant="ghost" size="sm" onClick={() => setEditingField("base_price")}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Imagens do Produto</Label>
                    <div className="grid grid-cols-5 gap-4">
                      <div className="space-y-1">
                        <img src={product.photo_main} alt="Principal" className="w-full h-32 object-cover rounded-lg border" />
                        <p className="text-xs text-center text-muted-foreground">Principal</p>
                      </div>
                      <div className="space-y-1">
                        <img src={product.image_front} alt="Frente" className="w-full h-32 object-cover rounded-lg border" />
                        <p className="text-xs text-center text-muted-foreground">Frente</p>
                      </div>
                      <div className="space-y-1">
                        <img src={product.image_back} alt="Costas" className="w-full h-32 object-cover rounded-lg border" />
                        <p className="text-xs text-center text-muted-foreground">Costas</p>
                      </div>
                      <div className="space-y-1">
                        <img src={product.image_left} alt="Esquerda" className="w-full h-32 object-cover rounded-lg border" />
                        <p className="text-xs text-center text-muted-foreground">Esquerda</p>
                      </div>
                      <div className="space-y-1">
                        <img src={product.image_right} alt="Direita" className="w-full h-32 object-cover rounded-lg border" />
                        <p className="text-xs text-center text-muted-foreground">Direita</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <Separator />

            {/* Dimensões */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Ruler className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold">Dimensões e Peso</h3>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Peso (kg)</Label>
                      {editingField === "peso" ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            defaultValue={product.peso || 0}
                            onBlur={(e) => updateProduct("peso", parseFloat(e.target.value))}
                            autoFocus
                          />
                          <Button size="sm" onClick={() => setEditingField(null)}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input value={product.peso || "0"} readOnly />
                          <Button variant="ghost" size="sm" onClick={() => setEditingField("peso")}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Altura (cm)</Label>
                      {editingField === "altura" ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            defaultValue={product.altura || 0}
                            onBlur={(e) => updateProduct("altura", parseFloat(e.target.value))}
                            autoFocus
                          />
                          <Button size="sm" onClick={() => setEditingField(null)}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input value={product.altura || "0"} readOnly />
                          <Button variant="ghost" size="sm" onClick={() => setEditingField("altura")}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Largura (cm)</Label>
                      {editingField === "largura" ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            defaultValue={product.largura || 0}
                            onBlur={(e) => updateProduct("largura", parseFloat(e.target.value))}
                            autoFocus
                          />
                          <Button size="sm" onClick={() => setEditingField(null)}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input value={product.largura || "0"} readOnly />
                          <Button variant="ghost" size="sm" onClick={() => setEditingField("largura")}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Profundidade (cm)</Label>
                      {editingField === "profundidade" ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            defaultValue={product.profundidade || 0}
                            onBlur={(e) => updateProduct("profundidade", parseFloat(e.target.value))}
                            autoFocus
                          />
                          <Button size="sm" onClick={() => setEditingField(null)}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input value={product.profundidade || "0"} readOnly />
                          <Button variant="ghost" size="sm" onClick={() => setEditingField("profundidade")}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Volumes</Label>
                      {editingField === "volumes" ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            defaultValue={product.volumes || 1}
                            onBlur={(e) => updateProduct("volumes", parseInt(e.target.value))}
                            autoFocus
                          />
                          <Button size="sm" onClick={() => setEditingField(null)}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input value={product.volumes || "1"} readOnly />
                          <Button variant="ghost" size="sm" onClick={() => setEditingField("volumes")}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Unidade</Label>
                      <Input value={product.unidade || "UN"} readOnly />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <Separator />

            {/* Variações */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ListTree className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Variações do Produto</h3>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{activeVariations} ativas</Badge>
                  <Badge variant="secondary">Estoque Total: {totalStock}</Badge>
                </div>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tamanho</TableHead>
                        <TableHead>Gênero</TableHead>
                        <TableHead>SKU Sufixo</TableHead>
                        <TableHead>Preço Base</TableHead>
                        <TableHead>Ajuste</TableHead>
                        <TableHead>Preço Promo</TableHead>
                        <TableHead>Preço Final</TableHead>
                        <TableHead>Estoque</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variations.map((variation) => {
                        const finalPrice = calculateFinalPrice(variation);
                        return (
                          <TableRow key={variation.id}>
                            <TableCell className="font-medium">{variation.size}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{variation.gender}</Badge>
                            </TableCell>
                            <TableCell>
                              {editingVariationId === variation.id + "-sku" ? (
                                <Input
                                  defaultValue={variation.sku_suffix || ""}
                                  onBlur={(e) => updateVariation(variation.id, "sku_suffix", e.target.value)}
                                  autoFocus
                                  className="w-20"
                                />
                              ) : (
                                <span 
                                  className="cursor-pointer hover:text-primary"
                                  onClick={() => setEditingVariationId(variation.id + "-sku")}
                                >
                                  {variation.sku_suffix || "-"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>R$ {product.base_price?.toFixed(2) || "0.00"}</TableCell>
                            <TableCell>
                              {editingVariationId === variation.id + "-adjustment" ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  defaultValue={variation.price_adjustment}
                                  onBlur={(e) => updateVariation(variation.id, "price_adjustment", parseFloat(e.target.value))}
                                  autoFocus
                                  className="w-24"
                                />
                              ) : (
                                <span 
                                  className="cursor-pointer hover:text-primary"
                                  onClick={() => setEditingVariationId(variation.id + "-adjustment")}
                                >
                                  {variation.price_adjustment >= 0 ? "+" : ""}{variation.price_adjustment.toFixed(2)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingVariationId === variation.id + "-promo" ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  defaultValue={variation.promotional_price || ""}
                                  onBlur={(e) => updateVariation(variation.id, "promotional_price", e.target.value ? parseFloat(e.target.value) : null)}
                                  autoFocus
                                  className="w-24"
                                />
                              ) : (
                                <span 
                                  className="cursor-pointer hover:text-primary"
                                  onClick={() => setEditingVariationId(variation.id + "-promo")}
                                >
                                  {variation.promotional_price ? `R$ ${variation.promotional_price.toFixed(2)}` : "-"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">
                              R$ {finalPrice.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {editingVariationId === variation.id + "-stock" ? (
                                <Input
                                  type="number"
                                  defaultValue={variation.stock_quantity}
                                  onBlur={(e) => updateVariation(variation.id, "stock_quantity", parseInt(e.target.value))}
                                  autoFocus
                                  className="w-20"
                                />
                              ) : (
                                <Badge 
                                  variant={variation.stock_quantity > 0 ? "default" : "secondary"}
                                  className="cursor-pointer"
                                  onClick={() => setEditingVariationId(variation.id + "-stock")}
                                >
                                  {variation.stock_quantity}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={variation.is_active}
                                onCheckedChange={(checked) => updateVariation(variation.id, "is_active", checked)}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteVariation(variation.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </section>

            <Separator />

            {/* Integração Bling */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold">Integração Bling</h3>
              </div>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Status de Sincronização</Label>
                      <div className="mt-2">
                        <Badge variant={product.bling_product_id ? "default" : "secondary"}>
                          {product.bling_product_id ? "Sincronizado" : "Não Sincronizado"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label>ID no Bling</Label>
                      <Input value={product.bling_product_id || "N/A"} readOnly />
                    </div>
                    <div>
                      <Label>Última Sincronização</Label>
                      <Input
                        value={product.bling_synced_at ? new Date(product.bling_synced_at).toLocaleString() : "Nunca"}
                        readOnly
                      />
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    Sincronizar Agora
                  </Button>
                </CardContent>
              </Card>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
