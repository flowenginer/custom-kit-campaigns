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
import { Plus, Trash2, Star, Edit } from "lucide-react";
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
  }, []);

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

  return (
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
  );
}