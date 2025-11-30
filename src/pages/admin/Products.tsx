import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Package, Pencil, Plus, Save, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ShirtModel {
  id: string;
  name: string;
  sku?: string | null;
  segment_tag: string;
  model_tag: string;
  base_price?: number | null;
  peso?: number | null;
  altura?: number | null;
  largura?: number | null;
  profundidade?: number | null;
  unidade?: string | null;
  volumes?: number | null;
}

interface ProductVariation {
  id: string;
  model_id: string;
  size: string;
  gender: string;
  sku_suffix: string;
  price_adjustment: number;
  stock_quantity: number;
  is_active: boolean;
}

const SIZES = ['P', 'M', 'G', 'GG', 'XG', '2XG', '3XG'];
const GENDERS = ['masculino', 'feminino', 'unissex'];

const Products = () => {
  const [models, setModels] = useState<ShirtModel[]>([]);
  const [variations, setVariations] = useState<Record<string, ProductVariation[]>>({});
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ShirtModel | null>(null);
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    base_price: 0,
    peso: 0,
    altura: 0,
    largura: 0,
    profundidade: 0,
    unidade: "UN",
    volumes: 1,
  });

  // Variations form
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>(['unissex']);
  const [priceAdjustments, setPriceAdjustments] = useState<Record<string, number>>({});

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const { data } = await supabase
      .from("shirt_models")
      .select("*")
      .order("name");
    
    if (data) {
      setModels(data);
      loadAllVariations(data.map(m => m.id));
    }
  };

  const loadAllVariations = async (modelIds: string[]) => {
    const { data } = await supabase
      .from("shirt_model_variations")
      .select("*")
      .in("model_id", modelIds);
    
    if (data) {
      const grouped = data.reduce((acc, v) => {
        if (!acc[v.model_id]) acc[v.model_id] = [];
        acc[v.model_id].push(v);
        return acc;
      }, {} as Record<string, ProductVariation[]>);
      
      setVariations(grouped);
    }
  };

  const openEditDialog = async (model: ShirtModel) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      sku: model.sku || "",
      base_price: model.base_price || 0,
      peso: model.peso || 0,
      altura: model.altura || 0,
      largura: model.largura || 0,
      profundidade: model.profundidade || 0,
      unidade: model.unidade || "UN",
      volumes: model.volumes || 1,
    });

    // Carregar variações existentes
    const { data } = await supabase
      .from("shirt_model_variations")
      .select("*")
      .eq("model_id", model.id);

    if (data && data.length > 0) {
      const sizes = [...new Set(data.map(v => v.size))];
      const genders = [...new Set(data.map(v => v.gender))];
      setSelectedSizes(sizes);
      setSelectedGenders(genders);
      
      const adjustments: Record<string, number> = {};
      data.forEach(v => {
        adjustments[`${v.size}-${v.gender}`] = v.price_adjustment;
      });
      setPriceAdjustments(adjustments);
    } else {
      setSelectedSizes([]);
      setSelectedGenders(['unissex']);
      setPriceAdjustments({});
    }

    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingModel) return;

    setLoading(true);

    try {
      // Atualizar dados básicos do produto
      const { error: updateError } = await supabase
        .from("shirt_models")
        .update({
          name: formData.name,
          sku: formData.sku,
          base_price: formData.base_price,
          peso: formData.peso,
          altura: formData.altura,
          largura: formData.largura,
          profundidade: formData.profundidade,
          unidade: formData.unidade,
          volumes: formData.volumes,
        })
        .eq("id", editingModel.id);

      if (updateError) throw updateError;

      // Remover todas variações antigas
      await supabase
        .from("shirt_model_variations")
        .delete()
        .eq("model_id", editingModel.id);

      // Criar novas variações
      const newVariations = [];
      for (const size of selectedSizes) {
        for (const gender of selectedGenders) {
          const key = `${size}-${gender}`;
          newVariations.push({
            model_id: editingModel.id,
            size,
            gender,
            sku_suffix: `-${size}-${gender.charAt(0).toUpperCase()}`,
            price_adjustment: priceAdjustments[key] || 0,
            stock_quantity: 0,
            is_active: true,
          });
        }
      }

      if (newVariations.length > 0) {
        const { error: varError } = await supabase
          .from("shirt_model_variations")
          .insert(newVariations);

        if (varError) throw varError;
      }

      toast.success("Produto atualizado com sucesso!");
      setIsEditDialogOpen(false);
      loadProducts();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar produto");
    } finally {
      setLoading(false);
    }
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  const toggleGender = (gender: string) => {
    setSelectedGenders(prev =>
      prev.includes(gender)
        ? prev.filter(g => g !== gender)
        : [...prev, gender]
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie produtos, variações de tamanho/gênero e dados para cálculo de frete
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <CardDescription>
            Clique em um produto para editar suas informações e variações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>SKU Base</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Preço Base</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Variações</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Nenhum produto cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell>{model.sku || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{model.segment_tag}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>{model.model_tag}</Badge>
                    </TableCell>
                    <TableCell>
                      {model.base_price
                        ? `R$ ${model.base_price.toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {model.peso ? `${model.peso} kg` : "-"}
                    </TableCell>
                    <TableCell>
                      {variations[model.id]?.length || 0} variações
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(model)}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Produto: {editingModel?.name}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
              <TabsTrigger value="dimensions">Dimensões</TabsTrigger>
              <TabsTrigger value="variations">Variações</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Produto</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>SKU Base</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Ex: CAM-001"
                  />
                </div>
                <div>
                  <Label>Preço Base (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Unidade</Label>
                  <Select
                    value={formData.unidade}
                    onValueChange={(value) => setFormData({ ...formData, unidade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UN">Unidade (UN)</SelectItem>
                      <SelectItem value="CX">Caixa (CX)</SelectItem>
                      <SelectItem value="PC">Pacote (PC)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="dimensions" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Preencha as dimensões e peso para cálculo de frete
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Peso (kg)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={formData.peso}
                    onChange={(e) => setFormData({ ...formData, peso: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Altura (cm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.altura}
                    onChange={(e) => setFormData({ ...formData, altura: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Largura (cm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.largura}
                    onChange={(e) => setFormData({ ...formData, largura: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Profundidade (cm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.profundidade}
                    onChange={(e) => setFormData({ ...formData, profundidade: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Volumes</Label>
                  <Input
                    type="number"
                    value={formData.volumes}
                    onChange={(e) => setFormData({ ...formData, volumes: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="variations" className="space-y-6">
              <div>
                <Label className="text-base font-semibold">Tamanhos</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Selecione os tamanhos disponíveis para este produto
                </p>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map((size) => (
                    <div key={size} className="flex items-center space-x-2">
                      <Checkbox
                        id={`size-${size}`}
                        checked={selectedSizes.includes(size)}
                        onCheckedChange={() => toggleSize(size)}
                      />
                      <label
                        htmlFor={`size-${size}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {size}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold">Gêneros</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Selecione os gêneros disponíveis
                </p>
                <div className="flex flex-wrap gap-2">
                  {GENDERS.map((gender) => (
                    <div key={gender} className="flex items-center space-x-2">
                      <Checkbox
                        id={`gender-${gender}`}
                        checked={selectedGenders.includes(gender)}
                        onCheckedChange={() => toggleGender(gender)}
                      />
                      <label
                        htmlFor={`gender-${gender}`}
                        className="text-sm font-medium cursor-pointer capitalize"
                      >
                        {gender}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {selectedSizes.length > 0 && selectedGenders.length > 0 && (
                <div>
                  <Label className="text-base font-semibold">Ajustes de Preço por Variação</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Configure ajustes de preço para cada combinação (opcional)
                  </p>
                  <div className="space-y-2">
                    {selectedSizes.map((size) =>
                      selectedGenders.map((gender) => {
                        const key = `${size}-${gender}`;
                        return (
                          <div key={key} className="flex items-center gap-4">
                            <Badge variant="outline" className="w-32">
                              {size} - {gender}
                            </Badge>
                            <Label className="text-xs">Ajuste R$</Label>
                            <Input
                              type="number"
                              step="0.01"
                              className="w-32"
                              value={priceAdjustments[key] || 0}
                              onChange={(e) =>
                                setPriceAdjustments({
                                  ...priceAdjustments,
                                  [key]: parseFloat(e.target.value) || 0,
                                })
                              }
                            />
                            <span className="text-xs text-muted-foreground">
                              SKU: {formData.sku}-{size}-{gender.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Salvando..." : "Salvar Produto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
