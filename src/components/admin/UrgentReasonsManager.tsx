import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, GripVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UrgentReason {
  id: string;
  label: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

export const UrgentReasonsManager = () => {
  const [reasons, setReasons] = useState<UrgentReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<UrgentReason | null>(null);
  const [formData, setFormData] = useState({
    label: "",
    description: "",
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    loadReasons();
  }, []);

  const loadReasons = async () => {
    try {
      const { data, error } = await supabase
        .from("urgent_reasons")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setReasons(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar motivos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (reason?: UrgentReason) => {
    if (reason) {
      setEditingReason(reason);
      setFormData({
        label: reason.label,
        description: reason.description || "",
        is_active: reason.is_active,
        display_order: reason.display_order,
      });
    } else {
      setEditingReason(null);
      const maxOrder = Math.max(...reasons.map(r => r.display_order), 0);
      setFormData({
        label: "",
        description: "",
        is_active: true,
        display_order: maxOrder + 1,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.label.trim()) {
      toast.error("Por favor, preencha o motivo");
      return;
    }

    try {
      if (editingReason) {
        const { error } = await supabase
          .from("urgent_reasons")
          .update(formData)
          .eq("id", editingReason.id);

        if (error) throw error;
        toast.success("Motivo atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("urgent_reasons")
          .insert([formData]);

        if (error) throw error;
        toast.success("Motivo criado com sucesso!");
      }

      setDialogOpen(false);
      loadReasons();
    } catch (error: any) {
      toast.error("Erro ao salvar motivo: " + error.message);
    }
  };

  const handleToggleActive = async (reason: UrgentReason) => {
    try {
      const { error } = await supabase
        .from("urgent_reasons")
        .update({ is_active: !reason.is_active })
        .eq("id", reason.id);

      if (error) throw error;
      toast.success(reason.is_active ? "Motivo desativado" : "Motivo ativado");
      loadReasons();
    } catch (error: any) {
      toast.error("Erro ao atualizar motivo: " + error.message);
    }
  };

  const moveReason = async (reason: UrgentReason, direction: "up" | "down") => {
    const currentIndex = reasons.findIndex(r => r.id === reason.id);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= reasons.length) return;

    const newReasons = [...reasons];
    [newReasons[currentIndex], newReasons[newIndex]] = [newReasons[newIndex], newReasons[currentIndex]];

    // Update display_order for both items
    try {
      const updates = newReasons.map((r, index) => ({
        id: r.id,
        display_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("urgent_reasons")
          .update({ display_order: update.display_order })
          .eq("id", update.id);

        if (error) throw error;
      }

      loadReasons();
    } catch (error: any) {
      toast.error("Erro ao reordenar motivos: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Motivos de Urgência</CardTitle>
            <CardDescription>
              Configure os motivos que os vendedores podem selecionar ao solicitar prioridade urgente
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Motivo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {reasons.map((reason, index) => (
            <div
              key={reason.id}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveReason(reason, "up")}
                  disabled={index === 0}
                >
                  <GripVertical className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveReason(reason, "down")}
                  disabled={index === reasons.length - 1}
                >
                  <GripVertical className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={reason.is_active ? "text-green-500" : "text-red-500"}>
                    {reason.is_active ? "🟢" : "🔴"}
                  </span>
                  <span className="font-medium">{reason.label}</span>
                </div>
                {reason.description && (
                  <p className="text-sm text-muted-foreground mt-1">{reason.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenDialog(reason)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Switch
                  checked={reason.is_active}
                  onCheckedChange={() => handleToggleActive(reason)}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingReason ? "Editar Motivo" : "Novo Motivo"}
            </DialogTitle>
            <DialogDescription>
              Configure o motivo que aparecerá para os vendedores
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="label">Motivo *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Ex: Evento em menos de 3 dias"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Explicação do motivo para ajudar o vendedor"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Motivo ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingReason ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
