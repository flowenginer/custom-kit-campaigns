import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, X, GripVertical, Sparkles, Edit, XCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface VariationAttribute {
  id: string;
  name: string;
  options: string[];
  is_system: boolean;
  display_order: number;
}

interface ShirtModelVariation {
  id: string;
  model_id: string;
  size: string;
  gender: string;
  sku_suffix: string | null;
  price_adjustment: number;
  promotional_price: number | null;
  stock_quantity: number;
  is_active: boolean;
}

interface ShirtModel {
  id: string;
  name: string;
  model_tag: string | null;
  segment_tag: string | null;
}

interface SelectedAttribute {
  id: string;
  name: string;
  options: string[];
}

interface VariationBuilderProps {
  modelId?: string;
  modelName?: string;
  onClearSelection?: () => void;
}

export function VariationBuilder({ modelId, modelName, onClearSelection }: VariationBuilderProps) {
  const [attributes, setAttributes] = useState<VariationAttribute[]>([]);
  const [variations, setVariations] = useState<ShirtModelVariation[]>([]);
  const [models, setModels] = useState<ShirtModel[]>([]);
  const [basePrice, setBasePrice] = useState<number>(0);
  
  // Escopo de aplicação
  const [scope, setScope] = useState<"single" | "all" | "type" | "segment">(modelId ? "single" : "all");
  const [selectedModelId, setSelectedModelId] = useState<string>(modelId || "");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedSegment, setSelectedSegment] = useState<string>("");
  
  // Atributos selecionados para mescla
  const [selectedAttributes, setSelectedAttributes] = useState<SelectedAttribute[]>([]);
  
  // Criação/edição de atributo
  const [newAttributeDialog, setNewAttributeDialog] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<VariationAttribute | null>(null);
  const [newAttributeName, setNewAttributeName] = useState("");
  const [newAttributeOptions, setNewAttributeOptions] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  
  // Exclusão de atributo
  const [deleteAttributeDialog, setDeleteAttributeDialog] = useState(false);
  const [attributeToDelete, setAttributeToDelete] = useState<VariationAttribute | null>(null);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAttributes();
    loadModels();
    if (modelId) {
      loadVariations();
      loadModelBasePrice();
    }
  }, [modelId]);

  const loadModelBasePrice = async () => {
    if (!modelId) return;
    
    const { data, error } = await supabase
      .from("shirt_models")
      .select("base_price")
      .eq("id", modelId)
      .single();

    if (error) {
      console.error("Erro ao carregar preço base:", error);
      return;
    }

    setBasePrice(data?.base_price || 0);
  };

  const loadAttributes = async () => {
    const { data, error } = await supabase
      .from("variation_attributes")
      .select("*")
      .order("display_order");

    if (error) {
      toast.error("Erro ao carregar atributos");
      return;
    }

    setAttributes(data || []);
  };

  const loadModels = async () => {
    const { data, error } = await supabase
      .from("shirt_models")
      .select("id, name, model_tag, segment_tag")
      .order("name");

    if (error) {
      toast.error("Erro ao carregar modelos");
      return;
    }

    setModels(data || []);
  };

  const loadVariations = async () => {
    if (!modelId) return;
    
    const { data, error } = await supabase
      .from("shirt_model_variations")
      .select("*")
      .eq("model_id", modelId);

    if (error) {
      toast.error("Erro ao carregar variações");
      return;
    }

    setVariations(data || []);
  };

  const handleAddOption = () => {
    if (currentInput.trim()) {
      setNewAttributeOptions([...newAttributeOptions, currentInput.trim()]);
      setCurrentInput("");
    }
  };

  const handleRemoveOption = (index: number) => {
    setNewAttributeOptions(newAttributeOptions.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      handleAddOption();
    }
  };

  const openEditAttribute = (attr: VariationAttribute) => {
    setEditingAttribute(attr);
    setNewAttributeName(attr.name);
    setNewAttributeOptions([...attr.options]);
    setNewAttributeDialog(true);
  };

  const confirmDeleteAttribute = (attr: VariationAttribute) => {
    setAttributeToDelete(attr);
    setDeleteAttributeDialog(true);
  };

  const deleteAttribute = async () => {
    if (!attributeToDelete) return;

    const { error } = await supabase
      .from("variation_attributes")
      .delete()
      .eq("id", attributeToDelete.id);

    if (error) {
      toast.error("Erro ao excluir atributo");
      return;
    }

    toast.success("Atributo excluído com sucesso!");
    setDeleteAttributeDialog(false);
    setAttributeToDelete(null);
    loadAttributes();
  };

  const saveNewAttribute = async () => {
    if (!newAttributeName || newAttributeOptions.length === 0) {
      toast.error("Preencha o nome e adicione opções");
      return;
    }

    if (editingAttribute) {
      // Atualizar atributo existente
      const { error } = await supabase
        .from("variation_attributes")
        .update({
          name: newAttributeName.toUpperCase(),
          options: newAttributeOptions,
        })
        .eq("id", editingAttribute.id);

      if (error) {
        toast.error("Erro ao atualizar atributo");
        return;
      }

      toast.success("Atributo atualizado com sucesso!");
    } else {
      // Criar novo atributo
      const { error } = await supabase.from("variation_attributes").insert({
        name: newAttributeName.toUpperCase(),
        options: newAttributeOptions,
        is_system: false,
        display_order: attributes.length + 1,
      });

      if (error) {
        toast.error("Erro ao criar atributo");
        return;
      }

      toast.success("Atributo criado com sucesso!");
    }

    setNewAttributeDialog(false);
    setNewAttributeName("");
    setNewAttributeOptions([]);
    setEditingAttribute(null);
    loadAttributes();
  };

  const toggleAttributeSelection = (attribute: VariationAttribute) => {
    const exists = selectedAttributes.find(a => a.id === attribute.id);
    if (exists) {
      setSelectedAttributes(selectedAttributes.filter(a => a.id !== attribute.id));
    } else {
      setSelectedAttributes([...selectedAttributes, {
        id: attribute.id,
        name: attribute.name,
        options: [],
      }]);
    }
  };

  const updateAttributeOptions = (attributeId: string, options: string[]) => {
    setSelectedAttributes(selectedAttributes.map(attr => 
      attr.id === attributeId ? { ...attr, options } : attr
    ));
  };

  const generateCombinations = (arrays: string[][]): string[][] => {
    if (arrays.length === 0) return [[]];
    const [first, ...rest] = arrays;
    const combinations = generateCombinations(rest);
    return first.flatMap(value => 
      combinations.map(combo => [value, ...combo])
    );
  };

  const getTargetModelIds = async (): Promise<string[]> => {
    switch (scope) {
      case "single":
        return selectedModelId ? [selectedModelId] : [];
      
      case "all":
        const { data: allModels } = await supabase
          .from("shirt_models")
          .select("id");
        return allModels?.map(m => m.id) || [];
      
      case "type":
        const { data: typeModels } = await supabase
          .from("shirt_models")
          .select("id")
          .eq("model_tag", selectedType);
        return typeModels?.map(m => m.id) || [];
      
      case "segment":
        const { data: segmentModels } = await supabase
          .from("shirt_models")
          .select("id")
          .eq("segment_tag", selectedSegment);
        return segmentModels?.map(m => m.id) || [];
      
      default:
        return [];
    }
  };

  const generateVariations = async () => {
    if (selectedAttributes.length === 0 || selectedAttributes.some(a => a.options.length === 0)) {
      toast.error("Selecione atributos e adicione opções");
      return;
    }

    setLoading(true);

    try {
      const targetModelIds = await getTargetModelIds();
      
      if (targetModelIds.length === 0) {
        toast.error("Nenhum modelo selecionado");
        setLoading(false);
        return;
      }

      // Gerar produto cartesiano dos atributos
      const optionsArrays = selectedAttributes.map(attr => attr.options);
      const combinations = generateCombinations(optionsArrays);

      // Criar variações para cada modelo
      const allVariations = targetModelIds.flatMap(mId => 
        combinations.map(combo => {
          // Mapear cada combinação para size, gender, etc
          const variation: any = {
            model_id: mId,
            size: "M", // Default
            gender: "unissex", // Default
            sku_suffix: combo.join("_").toUpperCase().replace(/\s+/g, "_"),
            price_adjustment: 0,
            stock_quantity: 0,
            is_active: true,
          };

          // Preencher campos baseado nos atributos
          selectedAttributes.forEach((attr, idx) => {
            if (attr.name === "TAMANHO") {
              variation.size = combo[idx];
            } else if (attr.name === "GÊNERO") {
              variation.gender = combo[idx];
            }
          });

          return variation;
        })
      );

      const { error } = await supabase
        .from("shirt_model_variations")
        .insert(allVariations);

      if (error) throw error;

      toast.success(`✨ ${allVariations.length} variações criadas com sucesso!`);
      loadVariations();
      setSelectedAttributes([]);
    } catch (error: any) {
      toast.error(`Erro ao criar variações: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleVariationStatus = async (variationId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("shirt_model_variations")
      .update({ is_active: !currentStatus })
      .eq("id", variationId);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

    loadVariations();
    toast.success("Status atualizado");
  };

  const deleteVariation = async (variationId: string) => {
    const { error } = await supabase
      .from("shirt_model_variations")
      .delete()
      .eq("id", variationId);

    if (error) {
      toast.error("Erro ao excluir variação");
      return;
    }

    loadVariations();
    toast.success("Variação excluída");
  };

  const totalCombinations = selectedAttributes.reduce((acc, attr) => 
    acc * (attr.options.length || 1), 1
  );

  const targetModelsCount = scope === "single" ? 1 : 
    scope === "all" ? models.length : 
    scope === "type" ? models.filter(m => m.model_tag === selectedType).length :
    models.filter(m => m.segment_tag === selectedSegment).length;

  const previewCount = totalCombinations * targetModelsCount;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Criar Variações {modelName && `- ${modelName}`}</CardTitle>
          <CardDescription>
            Configure o escopo de aplicação e combine atributos para gerar variações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Escopo de Aplicação */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Escopo de Aplicação</Label>
              {modelId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedModelId("");
                    setScope("all");
                    onClearSelection?.();
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Limpar Seleção
                </Button>
              )}
            </div>

            {modelId && (
              <Badge variant="secondary" className="mb-2">
                {modelName}
              </Badge>
            )}

            <RadioGroup value={scope} onValueChange={(v: any) => setScope(v)} className="space-y-3">
              {modelId && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="cursor-pointer">
                    Produto específico: <span className="font-semibold">{modelName}</span>
                  </Label>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="cursor-pointer">
                  Todos os produtos ({models.length})
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 gap-4">
                <RadioGroupItem value="type" id="type" />
                <Label htmlFor="type" className="cursor-pointer">Por tipo:</Label>
                <Select value={selectedType} onValueChange={setSelectedType} disabled={scope !== "type"}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set(models.map(m => m.model_tag).filter(Boolean))).map((tag) => (
                      <SelectItem key={tag} value={tag!}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2 gap-4">
                <RadioGroupItem value="segment" id="segment" />
                <Label htmlFor="segment" className="cursor-pointer">Por segmento:</Label>
                <Select value={selectedSegment} onValueChange={setSelectedSegment} disabled={scope !== "segment"}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecione o segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set(models.map(m => m.segment_tag).filter(Boolean))).map((tag) => (
                      <SelectItem key={tag} value={tag!}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </RadioGroup>
          </div>

          {/* Atributos */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Atributos (selecione múltiplos para mesclar)</Label>
              <Dialog open={newAttributeDialog} onOpenChange={setNewAttributeDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Atributo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingAttribute ? "Editar Atributo" : "Criar Novo Atributo"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingAttribute 
                        ? "Modifique o nome e as opções do atributo" 
                        : "Adicione um novo tipo de atributo personalizado"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome do Atributo</Label>
                      <Input
                        value={newAttributeName}
                        onChange={(e) => setNewAttributeName(e.target.value)}
                        placeholder="Ex: COR, ESTAMPA, ACABAMENTO"
                      />
                    </div>
                    <div>
                      <Label>Opções (pressione Enter)</Label>
                      <Input
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Digite e pressione Enter..."
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[80px] p-3 border rounded-md">
                      {newAttributeOptions.map((option, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {option}
                          <button onClick={() => handleRemoveOption(index)} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setNewAttributeDialog(false);
                      setEditingAttribute(null);
                      setNewAttributeName("");
                      setNewAttributeOptions([]);
                    }}>
                      Cancelar
                    </Button>
                    <Button onClick={saveNewAttribute}>
                      {editingAttribute ? "Atualizar" : "Salvar"} Atributo
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {attributes.map((attr) => {
                const isSelected = selectedAttributes.find(a => a.id === attr.id);
                return (
                  <div key={attr.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={!!isSelected}
                          onCheckedChange={() => toggleAttributeSelection(attr)}
                        />
                        <Label className="cursor-pointer font-medium">{attr.name}</Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditAttribute(attr)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!attr.is_system && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmDeleteAttribute(attr)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="ml-6 space-y-2">
                        <Label className="text-sm text-muted-foreground">Opções disponíveis:</Label>
                        <div className="flex flex-wrap gap-2">
                          {attr.options.map((option) => {
                            const isOptionSelected = isSelected.options.includes(option);
                            return (
                              <Badge
                                key={option}
                                variant={isOptionSelected ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => {
                                  const newOptions = isOptionSelected
                                    ? isSelected.options.filter(o => o !== option)
                                    : [...isSelected.options, option];
                                  updateAttributeOptions(attr.id, newOptions);
                                }}
                              >
                                {option}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          {selectedAttributes.length > 0 && (
            <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                <span className="font-semibold">
                  PRÉVIA: {previewCount} variações serão criadas
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {totalCombinations} combinações × {targetModelsCount} produtos
              </p>
            </div>
          )}

          <Button
            onClick={generateVariations}
            disabled={loading || selectedAttributes.length === 0 || previewCount === 0}
            className="w-full"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Gerar {previewCount} Variações
          </Button>
        </CardContent>
      </Card>

      {/* Tabela de Variações - apenas se tiver modelId */}
      {modelId && (
        <Card>
          <CardHeader>
            <CardTitle>Variações Cadastradas ({variations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Gênero</TableHead>
                  <TableHead>SKU Suffix</TableHead>
                  <TableHead>Preço Base</TableHead>
                  <TableHead>Ajuste</TableHead>
                  <TableHead>Preço Promo</TableHead>
                  <TableHead>Preço Final</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Nenhuma variação cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  variations.map((variation) => {
                    const finalPrice = variation.promotional_price || (basePrice + variation.price_adjustment);
                    
                    return (
                      <TableRow key={variation.id}>
                        <TableCell>
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                        </TableCell>
                        <TableCell className="font-medium">{variation.size}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{variation.gender}</Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {variation.sku_suffix || "-"}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            R$ {basePrice.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={variation.price_adjustment >= 0 ? "text-green-600" : "text-red-600"}>
                            {variation.price_adjustment > 0 ? "+" : ""}
                            {variation.price_adjustment.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {variation.promotional_price ? (
                            <span className="font-semibold text-destructive">
                              R$ {variation.promotional_price.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-primary">
                            R$ {finalPrice.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={variation.stock_quantity > 0 ? "default" : "secondary"}>
                            {variation.stock_quantity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={variation.is_active}
                            onCheckedChange={() => toggleVariationStatus(variation.id, variation.is_active)}
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteAttributeDialog} onOpenChange={setDeleteAttributeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o atributo <strong>{attributeToDelete?.name}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteAttributeDialog(false);
              setAttributeToDelete(null);
            }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteAttribute}>
              Excluir Atributo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}