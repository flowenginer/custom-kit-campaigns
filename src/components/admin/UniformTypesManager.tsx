import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Loader2, Shirt } from "lucide-react";

interface UniformType {
  tag_value: string;
  id: string;
  created_at: string;
  display_label: string | null;
  icon: string | null;
}

// Emoji options for selection
const EMOJI_OPTIONS = [
  '👕', '🧥', '🎽', '📦', '🩳', 
  '👔', '🥼', '🧤', '👗', '👘',
  '⚽', '🏀', '🏈', '⚾', '🎾'
];

export const UniformTypesManager = () => {
  const [uniformTypes, setUniformTypes] = useState<UniformType[]>([]);
  const [modelCounts, setModelCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<UniformType | null>(null);
  const [formValue, setFormValue] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formIcon, setFormIcon] = useState("👕");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUniformTypes();
  }, []);

  const loadUniformTypes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("tag_value, id, created_at, display_label, icon")
        .eq("tag_type", "model_tag")
        .order("tag_value");

      if (error) throw error;

      if (data) {
        setUniformTypes(data);
        await loadModelCounts(data);
      }
    } catch (error: any) {
      console.error("Erro ao carregar tipos de uniforme:", error);
      toast.error(error.message || "Erro ao carregar tipos de uniforme");
    } finally {
      setLoading(false);
    }
  };

  const loadModelCounts = async (types: UniformType[]) => {
    const counts: Record<string, number> = {};

    for (const type of types) {
      const { count } = await supabase
        .from("shirt_models")
        .select("*", { count: "exact", head: true })
        .eq("model_tag", type.tag_value);

      counts[type.tag_value] = count || 0;
    }

    setModelCounts(counts);
  };

  const handleCreate = async () => {
    if (!formValue.trim() || !formLabel.trim()) {
      toast.error("Por favor, preencha o valor da tag e o nome de exibição");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedTag = formValue
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

      const { error } = await supabase
        .from("tags")
        .insert({ 
          tag_value: formattedTag, 
          tag_type: "model_tag",
          display_label: formLabel.trim(),
          icon: formIcon
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Este tipo já existe!");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Tipo de uniforme criado com sucesso!");
      setIsCreateDialogOpen(false);
      setFormValue("");
      setFormLabel("");
      setFormIcon("👕");
      loadUniformTypes();
    } catch (error: any) {
      console.error("Erro ao criar tipo:", error);
      toast.error(error.message || "Erro ao criar tipo de uniforme");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedType || !formValue.trim() || !formLabel.trim()) {
      toast.error("Por favor, preencha o valor da tag e o nome de exibição");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedTag = formValue
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

      const { error } = await supabase
        .from("tags")
        .update({ 
          tag_value: formattedTag,
          display_label: formLabel.trim(),
          icon: formIcon
        })
        .eq("id", selectedType.id);

      if (error) {
        if (error.code === "23505") {
          toast.error("Já existe um tipo com este nome!");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Tipo de uniforme atualizado!");
      setIsEditDialogOpen(false);
      setSelectedType(null);
      setFormValue("");
      setFormLabel("");
      setFormIcon("👕");
      loadUniformTypes();
    } catch (error: any) {
      console.error("Erro ao editar tipo:", error);
      toast.error(error.message || "Erro ao editar tipo de uniforme");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedType) return;

    const modelCount = modelCounts[selectedType.tag_value] || 0;
    if (modelCount > 0) {
      toast.error(`Não é possível deletar. Existem ${modelCount} modelo(s) associado(s) a este tipo.`);
      setIsDeleteDialogOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", selectedType.id);

      if (error) throw error;

      toast.success("Tipo de uniforme deletado!");
      setIsDeleteDialogOpen(false);
      setSelectedType(null);
      loadUniformTypes();
    } catch (error: any) {
      console.error("Erro ao deletar tipo:", error);
      toast.error(error.message || "Erro ao deletar tipo de uniforme");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (type: UniformType) => {
    setSelectedType(type);
    setFormValue(type.tag_value);
    setFormLabel(type.display_label || type.tag_value);
    setFormIcon(type.icon || "👕");
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (type: UniformType) => {
    setSelectedType(type);
    setIsDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shirt className="w-5 h-5" />
            Tipos de Uniforme
          </CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shirt className="w-5 h-5" />
                Tipos de Uniforme
              </CardTitle>
              <CardDescription>
                Gerencie os tipos de uniforme disponíveis (ex: manga_curta, short, regata)
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Tipo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {uniformTypes.map((type) => (
              <Card key={type.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-3xl">
                      {type.icon || '👕'}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditDialog(type)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openDeleteDialog(type)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium text-sm">
                      {type.display_label || type.tag_value}
                    </div>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {type.tag_value}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {modelCounts[type.tag_value] || 0} modelo{modelCounts[type.tag_value] !== 1 ? 's' : ''}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {uniformTypes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum tipo de uniforme cadastrado. Clique em "Novo Tipo" para adicionar.
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE DIALOG */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Tipo de Uniforme</DialogTitle>
            <DialogDescription>
              Digite o slug, nome de exibição e selecione um emoji para o novo tipo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="type-value">Valor da Tag (slug)</Label>
              <Input
                id="type-value"
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder="ex: manga_curta, regata"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use apenas letras minúsculas, números e underscore (_)
              </p>
            </div>

            <div>
              <Label htmlFor="display-label">Nome de Exibição</Label>
              <Input
                id="display-label"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="ex: Manga Curta, Regata"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label>Emoji/Ícone</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <Button
                    key={emoji}
                    type="button"
                    variant={formIcon === emoji ? "default" : "outline"}
                    className="h-12 text-2xl"
                    onClick={() => setFormIcon(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
              <Input
                value={formIcon}
                onChange={(e) => setFormIcon(e.target.value)}
                placeholder="ou digite um emoji"
                className="mt-2"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Tipo de Uniforme</DialogTitle>
            <DialogDescription>
              Altere o slug, nome de exibição ou emoji do tipo de uniforme.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-type-value">Valor da Tag (slug)</Label>
              <Input
                id="edit-type-value"
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder="ex: manga_curta, regata"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use apenas letras minúsculas, números e underscore (_)
              </p>
            </div>

            <div>
              <Label htmlFor="edit-display-label">Nome de Exibição</Label>
              <Input
                id="edit-display-label"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="ex: Manga Curta, Regata"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label>Emoji/Ícone</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <Button
                    key={emoji}
                    type="button"
                    variant={formIcon === emoji ? "default" : "outline"}
                    className="h-12 text-2xl"
                    onClick={() => setFormIcon(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
              <Input
                value={formIcon}
                onChange={(e) => setFormIcon(e.target.value)}
                placeholder="ou digite um emoji"
                className="mt-2"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Tipo de Uniforme?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o tipo "{selectedType?.display_label || selectedType?.tag_value}"?
              {modelCounts[selectedType?.tag_value || ""] > 0 && (
                <span className="block mt-2 text-destructive font-semibold">
                  ⚠️ Atenção: Este tipo possui {modelCounts[selectedType?.tag_value || ""]} modelo(s) associado(s) e não pode ser deletado.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting || (modelCounts[selectedType?.tag_value || ""] || 0) > 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
