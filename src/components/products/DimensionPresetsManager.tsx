import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, Star, Edit, Package } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface DimensionPreset {
  id: string;
  model_tag: string;
  name: string;
  peso: number;
  altura: number;
  largura: number;
  profundidade: number;
  volumes: number;
  is_default: boolean;
}

const MODEL_TAGS = [
  { value: "manga_curta", label: "Manga Curta" },
  { value: "manga_longa", label: "Manga Longa" },
  { value: "regata", label: "Regata" },
  { value: "ziper", label: "Zíper" },
];

export function DimensionPresetsManager() {
  const [presets, setPresets] = useState<DimensionPreset[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingPreset, setEditingPreset] = useState<DimensionPreset | null>(null);
  
  // Estado para aplicação em massa
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [applyScope, setApplyScope] = useState<"all" | "type" | "segment" | "combination">("all");
  const [applyType, setApplyType] = useState<string>("");
  const [applySegment, setApplySegment] = useState<string>("");
  const [models, setModels] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    model_tag: "",
    name: "",
    peso: 0,
    altura: 0,
    largura: 0,
    profundidade: 0,
    volumes: 1,
    is_default: false,
  });

  useEffect(() => {
    loadPresets();
    loadModels();
  }, []);

  const loadModels = async () => {
    const { data } = await supabase
      .from("shirt_models")
      .select("id, name, model_tag, segment_tag");
    setModels(data || []);
  };

  const loadPresets = async () => {
    const { data, error } = await supabase
      .from("dimension_presets")
      .select("*")
      .order("model_tag");

    if (error) {
      toast.error("Erro ao carregar presets");
      return;
    }

    setPresets(data || []);
  };

  const openEditDialog = (preset: DimensionPreset) => {
    setEditingPreset(preset);
    setFormData({
      model_tag: preset.model_tag,
      name: preset.name,
      peso: preset.peso,
      altura: preset.altura,
      largura: preset.largura,
      profundidade: preset.profundidade,
      volumes: preset.volumes,
      is_default: preset.is_default,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.model_tag || !formData.name) {
      toast.error("Preencha tipo e nome");
      return;
    }

    setLoading(true);

    try {
      // Se está marcando como padrão, desmarcar outros do mesmo tipo
      if (formData.is_default) {
        await supabase
          .from("dimension_presets")
          .update({ is_default: false })
          .eq("model_tag", formData.model_tag);
      }

      if (editingPreset) {
        // Atualizar preset existente
        const { error } = await supabase
          .from("dimension_presets")
          .update(formData)
          .eq("id", editingPreset.id);

        if (error) throw error;
        toast.success("Preset atualizado com sucesso!");
      } else {
        // Criar novo preset
        const { error } = await supabase.from("dimension_presets").insert(formData);
        if (error) throw error;
        toast.success("Preset criado com sucesso!");
      }

      setDialogOpen(false);
      loadPresets();
      resetForm();
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      model_tag: "",
      name: "",
      peso: 0,
      altura: 0,
      largura: 0,
      profundidade: 0,
      volumes: 1,
      is_default: false,
    });
    setEditingPreset(null);
  };

  const setAsDefault = async (presetId: string, modelTag: string) => {
    // Desmarcar todos do mesmo tipo
    await supabase
      .from("dimension_presets")
      .update({ is_default: false })
      .eq("model_tag", modelTag);

    // Marcar o selecionado
    const { error } = await supabase
      .from("dimension_presets")
      .update({ is_default: true })
      .eq("id", presetId);

    if (error) {
      toast.error("Erro ao definir padrão");
      return;
    }

    loadPresets();
    toast.success("Preset padrão atualizado");
  };

  const deletePreset = async (presetId: string) => {
    const { error } = await supabase
      .from("dimension_presets")
      .delete()
      .eq("id", presetId);

    if (error) {
      toast.error("Erro ao excluir preset");
      return;
    }

    loadPresets();
    toast.success("Preset excluído");
  };

  const getModelTagLabel = (tag: string) => {
    return MODEL_TAGS.find(t => t.value === tag)?.label || tag;
  };

  const applyDimensions = async () => {
    if (!selectedPresetId) {
      toast.error("Selecione um preset");
      return;
    }

    setLoading(true);

    try {
      const selectedPreset = presets.find(p => p.id === selectedPresetId);
      if (!selectedPreset) throw new Error("Preset não encontrado");

      // Buscar modelos conforme filtro
      let query = supabase.from("shirt_models").select("id");

      if (applyScope === "type") {
        query = query.eq("model_tag", applyType);
      } else if (applyScope === "segment") {
        query = query.eq("segment_tag", applySegment);
      } else if (applyScope === "combination") {
        query = query.eq("model_tag", applyType).eq("segment_tag", applySegment);
      }

      const { data: targetModels, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (!targetModels || targetModels.length === 0) {
        toast.error("Nenhum produto encontrado com os filtros selecionados");
        setLoading(false);
        return;
      }

      // Atualizar dimensões
      const { error: updateError } = await supabase
        .from("shirt_models")
        .update({
          peso: selectedPreset.peso,
          altura: selectedPreset.altura,
          largura: selectedPreset.largura,
          profundidade: selectedPreset.profundidade,
          volumes: selectedPreset.volumes,
        })
        .in("id", targetModels.map(m => m.id));

      if (updateError) throw updateError;

      toast.success(`✅ Dimensões aplicadas em ${targetModels.length} produtos!`);
      setApplyDialogOpen(false);
      setSelectedPresetId("");
    } catch (error: any) {
      toast.error(`Erro ao aplicar dimensões: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getPreviewCount = () => {
    if (applyScope === "all") return models.length;
    if (applyScope === "type") return models.filter(m => m.model_tag === applyType).length;
    if (applyScope === "segment") return models.filter(m => m.segment_tag === applySegment).length;
    if (applyScope === "combination") {
      return models.filter(m => m.model_tag === applyType && m.segment_tag === applySegment).length;
    }
    return 0;
  };

  return (
    <div className="space-y-6">
      {/* Seção de Aplicar Dimensões */}
      <Card>
        <CardHeader>
          <CardTitle>Aplicar Dimensões em Massa</CardTitle>
          <CardDescription>
            Aplique um preset de dimensões a múltiplos produtos de uma vez
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Preset de Dimensões</Label>
              <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um preset" />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name} ({getModelTagLabel(preset.model_tag)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <Label className="text-base font-semibold">Aplicar em:</Label>
            <RadioGroup value={applyScope} onValueChange={(v: any) => setApplyScope(v)} className="space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="apply-all" />
                <Label htmlFor="apply-all" className="cursor-pointer">
                  Todos os produtos ({models.length})
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 gap-4">
                <RadioGroupItem value="type" id="apply-type" />
                <Label htmlFor="apply-type" className="cursor-pointer">Por tipo:</Label>
                <Select value={applyType} onValueChange={setApplyType} disabled={applyScope !== "type" && applyScope !== "combination"}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_TAGS.map((tag) => (
                      <SelectItem key={tag.value} value={tag.value}>
                        {tag.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2 gap-4">
                <RadioGroupItem value="segment" id="apply-segment" />
                <Label htmlFor="apply-segment" className="cursor-pointer">Por segmento:</Label>
                <Select value={applySegment} onValueChange={setApplySegment} disabled={applyScope !== "segment" && applyScope !== "combination"}>
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

              <div className="flex items-center space-x-2 gap-4">
                <RadioGroupItem value="combination" id="apply-combination" />
                <Label htmlFor="apply-combination" className="cursor-pointer">
                  Combinação (Tipo + Segmento)
                </Label>
              </div>
            </RadioGroup>

            {getPreviewCount() > 0 && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm font-medium">
                  Preview: <span className="text-primary">{getPreviewCount()} produtos</span> serão atualizados
                </p>
              </div>
            )}
          </div>

          <Button 
            onClick={applyDimensions} 
            disabled={loading || !selectedPresetId || getPreviewCount() === 0}
            className="w-full"
          >
            <Package className="mr-2 h-4 w-4" />
            Aplicar Dimensões
          </Button>
        </CardContent>
      </Card>

      {/* Seção de Gerenciamento de Presets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pré-cadastro de Dimensões</CardTitle>
            <CardDescription>
              Configure e edite dimensões padrão por tipo de produto
            </CardDescription>
          </div>
        <Dialog 
          open={dialogOpen} 
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Preset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPreset ? "Editar Preset" : "Criar Preset de Dimensões"}
              </DialogTitle>
              <DialogDescription>
                Configure as dimensões padrão para um tipo de produto
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4">
              <div>
                <Label>Tipo de Produto</Label>
                <Select
                  value={formData.model_tag}
                  onValueChange={(value) => setFormData({ ...formData, model_tag: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_TAGS.map((tag) => (
                      <SelectItem key={tag.value} value={tag.value}>
                        {tag.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Nome do Preset</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Padrão Manga Curta"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Peso (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.peso}
                    onChange={(e) => setFormData({ ...formData, peso: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Altura (cm)</Label>
                  <Input
                    type="number"
                    value={formData.altura}
                    onChange={(e) => setFormData({ ...formData, altura: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Largura (cm)</Label>
                  <Input
                    type="number"
                    value={formData.largura}
                    onChange={(e) => setFormData({ ...formData, largura: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Profundidade (cm)</Label>
                  <Input
                    type="number"
                    value={formData.profundidade}
                    onChange={(e) => setFormData({ ...formData, profundidade: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label>Volumes</Label>
                <Input
                  type="number"
                  value={formData.volumes}
                  onChange={(e) => setFormData({ ...formData, volumes: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <Label>Definir como padrão para este tipo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {editingPreset ? "Atualizar" : "Salvar"} Preset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Dimensões (cm)</TableHead>
              <TableHead>Peso (kg)</TableHead>
              <TableHead>Volumes</TableHead>
              <TableHead>Padrão</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {presets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhum preset cadastrado
                </TableCell>
              </TableRow>
            ) : (
              presets.map((preset) => (
                <TableRow key={preset.id}>
                  <TableCell>
                    <Badge variant="outline">{getModelTagLabel(preset.model_tag)}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{preset.name}</TableCell>
                  <TableCell>
                    {preset.altura} x {preset.largura} x {preset.profundidade}
                  </TableCell>
                  <TableCell>{preset.peso}</TableCell>
                  <TableCell>{preset.volumes}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAsDefault(preset.id, preset.model_tag)}
                    >
                      <Star 
                        className={`h-4 w-4 ${preset.is_default ? "fill-yellow-400 text-yellow-400" : ""}`}
                      />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(preset)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePreset(preset.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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