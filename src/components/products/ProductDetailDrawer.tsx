import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  stock_quantity: number;
  is_active: boolean;
}

export function ProductDetailDrawer({ productId, open, onOpenChange, onUpdate }: ProductDetailDrawerProps) {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  
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
    const basePrice = product?.base_price || 0;
    return basePrice + variation.price_adjustment;
  };

  const totalStock = variations.reduce((acc, v) => acc + v.stock_quantity, 0);
  const activeVariations = variations.filter(v => v.is_active).length;

  if (!product) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] overflow-y-auto">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>{product.name}</DrawerTitle>
              <DrawerDescription>SKU: {product.sku || "Não definido"}</DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6 pb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">
              <Package className="mr-2 h-4 w-4" />
              Dados Gerais
            </TabsTrigger>
            <TabsTrigger value="dimensions">
              <Ruler className="mr-2 h-4 w-4" />
              Dimensões
            </TabsTrigger>
            <TabsTrigger value="variations">
              <ListTree className="mr-2 h-4 w-4" />
              Variações ({variations.length})
            </TabsTrigger>
            <TabsTrigger value="bling">
              <Link2 className="mr-2 h-4 w-4" />
              Integração Bling
            </TabsTrigger>
          </TabsList>

          {/* Aba: Dados Gerais */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <Badge variant="outline">{product.model_tag || "N/A"}</Badge>
                  </div>

                  <div>
                    <Label>Segmento</Label>
                    <Badge variant="secondary">{product.segment_tag || "N/A"}</Badge>
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

                <div className="grid grid-cols-3 gap-4">
                  <img src={product.photo_main} alt="Principal" className="w-full h-32 object-cover rounded" />
                  <img src={product.image_front} alt="Frente" className="w-full h-32 object-cover rounded" />
                  <img src={product.image_back} alt="Costas" className="w-full h-32 object-cover rounded" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba: Dimensões */}
          <TabsContent value="dimensions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dimensões e Peso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
          </TabsContent>

          {/* Aba: Variações */}
          <TabsContent value="variations" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Variações do Produto</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline">{activeVariations} ativas</Badge>
                    <Badge variant="secondary">Estoque Total: {totalStock}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Gênero</TableHead>
                      <TableHead>SKU Sufixo</TableHead>
                      <TableHead>Ajuste Preço</TableHead>
                      <TableHead>Preço Final</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variations.map((variation) => (
                      <TableRow key={variation.id}>
                        <TableCell>{variation.size}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{variation.gender}</Badge>
                        </TableCell>
                        <TableCell>
                          {editingVariationId === variation.id ? (
                            <Input
                              defaultValue={variation.sku_suffix || ""}
                              onBlur={(e) => updateVariation(variation.id, "sku_suffix", e.target.value)}
                              className="w-32"
                              autoFocus
                            />
                          ) : (
                            <span className="cursor-pointer" onClick={() => setEditingVariationId(variation.id)}>
                              {variation.sku_suffix || "-"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingVariationId === variation.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              defaultValue={variation.price_adjustment}
                              onBlur={(e) =>
                                updateVariation(variation.id, "price_adjustment", parseFloat(e.target.value))
                              }
                              className="w-24"
                            />
                          ) : (
                            <span className="cursor-pointer" onClick={() => setEditingVariationId(variation.id)}>
                              {variation.price_adjustment >= 0 ? "+" : ""}
                              {variation.price_adjustment.toFixed(2)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          R$ {calculateFinalPrice(variation).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {editingVariationId === variation.id ? (
                            <Input
                              type="number"
                              defaultValue={variation.stock_quantity}
                              onBlur={(e) =>
                                updateVariation(variation.id, "stock_quantity", parseInt(e.target.value))
                              }
                              className="w-20"
                            />
                          ) : (
                            <span className="cursor-pointer" onClick={() => setEditingVariationId(variation.id)}>
                              {variation.stock_quantity}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={variation.is_active}
                            onCheckedChange={(checked) => updateVariation(variation.id, "is_active", checked)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteVariation(variation.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba: Integração Bling */}
          <TabsContent value="bling" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Integração com Bling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status de Sincronização</Label>
                    <Badge variant={product.bling_product_id ? "default" : "secondary"}>
                      {product.bling_product_id ? "Sincronizado" : "Não Sincronizado"}
                    </Badge>
                  </div>

                  <div>
                    <Label>ID no Bling</Label>
                    <Input value={product.bling_product_id || "N/A"} readOnly />
                  </div>

                  <div>
                    <Label>Última Sincronização</Label>
                    <Input
                      value={
                        product.bling_synced_at
                          ? new Date(product.bling_synced_at).toLocaleString("pt-BR")
                          : "Nunca"
                      }
                      readOnly
                    />
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  <Link2 className="mr-2 h-4 w-4" />
                  Sincronizar Agora
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
}
