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
import { Plus, X, GripVertical } from "lucide-react";
import { toast } from "sonner";

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
  stock_quantity: number;
  is_active: boolean;
}

interface VariationBuilderProps {
  modelId: string;
  modelName: string;
}

export function VariationBuilder({ modelId, modelName }: VariationBuilderProps) {
  const [attributes, setAttributes] = useState<VariationAttribute[]>([]);
  const [variations, setVariations] = useState<ShirtModelVariation[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState<string>("");
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAttributes();
    loadVariations();
  }, [modelId]);

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

  const loadVariations = async () => {
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
      setNewOptions([...newOptions, currentInput.trim()]);
      setCurrentInput("");
    }
  };

  const handleRemoveOption = (index: number) => {
    setNewOptions(newOptions.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      handleAddOption();
    }
  };

  const generateVariations = async () => {
    if (!selectedAttribute || newOptions.length === 0) {
      toast.error("Selecione um atributo e adicione opções");
      return;
    }

    setLoading(true);

    try {
      const attribute = attributes.find(a => a.id === selectedAttribute);
      if (!attribute) return;

      const newVariations = newOptions.map((option, index) => ({
        model_id: modelId,
        size: attribute.name === "TAMANHO" ? option : "M",
        gender: attribute.name === "GÊNERO" ? option : "unissex",
        sku_suffix: option.toUpperCase().replace(/\s+/g, "_"),
        price_adjustment: 0,
        stock_quantity: 0,
        is_active: true,
      }));

      const { error } = await supabase
        .from("shirt_model_variations")
        .insert(newVariations);

      if (error) throw error;

      toast.success(`${newVariations.length} variações criadas com sucesso!`);
      loadVariations();
      setNewOptions([]);
      setSelectedAttribute("");
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Criar Variações - {modelName}</CardTitle>
          <CardDescription>
            Adicione variações de tamanho, gênero ou outros atributos ao produto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Container 1 - Tipo de Atributo */}
            <div className="space-y-4">
              <div>
                <Label>Tipo de Atributo</Label>
                <Select value={selectedAttribute} onValueChange={setSelectedAttribute}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o atributo" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributes.map((attr) => (
                      <SelectItem key={attr.id} value={attr.id}>
                        {attr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Container 2 - Opções */}
            <div className="space-y-4">
              <div>
                <Label>Opções (separar com Enter ou Tab)</Label>
                <Input
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite e pressione Enter..."
                  disabled={!selectedAttribute}
                />
              </div>
              <div className="flex flex-wrap gap-2 min-h-[100px] p-3 border rounded-md bg-muted/20">
                {newOptions.map((option, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {option}
                    <button
                      onClick={() => handleRemoveOption(index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Button
            onClick={generateVariations}
            disabled={loading || !selectedAttribute || newOptions.length === 0}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Variações
          </Button>
        </CardContent>
      </Card>

      {/* Tabela de Variações */}
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
                <TableHead>Ajuste Preço</TableHead>
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
                variations.map((variation) => (
                  <TableRow key={variation.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    </TableCell>
                    <TableCell className="font-medium">{variation.size}</TableCell>
                    <TableCell>{variation.gender}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{variation.sku_suffix || "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      {variation.price_adjustment > 0 ? "+" : ""}
                      {variation.price_adjustment.toFixed(2)}
                    </TableCell>
                    <TableCell>{variation.stock_quantity}</TableCell>
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
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
