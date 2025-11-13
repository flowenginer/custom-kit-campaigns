import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";

interface Segment {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

const Segments = () => {
  const navigate = useNavigate();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [modelCounts, setModelCounts] = useState<Record<string, number>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    const { data } = await supabase
      .from("segments")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) {
      setSegments(data);
      loadModelsCount(data);
    }
  };

  const loadModelsCount = async (segmentsList: Segment[]) => {
    const counts: Record<string, number> = {};
    
    for (const segment of segmentsList) {
      const { count } = await supabase
        .from("shirt_models")
        .select("*", { count: "exact", head: true })
        .eq("segment_id", segment.id);
      
      counts[segment.id] = count || 0;
    }
    
    setModelCounts(counts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingSegment) {
        const { error } = await supabase
          .from("segments")
          .update(formData)
          .eq("id", editingSegment.id);
        
        if (error) throw error;
        toast.success("Segmento atualizado!");
      } else {
        const { error } = await supabase
          .from("segments")
          .insert(formData);
        
        if (error) throw error;
        toast.success("Segmento criado!");
      }

      setIsDialogOpen(false);
      setFormData({ name: "", description: "" });
      setEditingSegment(null);
      loadSegments();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    // Verificar se há modelos associados
    const { count: modelCount } = await supabase
      .from('shirt_models')
      .select('*', { count: 'exact', head: true })
      .eq('segment_id', id);

    if (modelCount && modelCount > 0) {
      toast.error(`Não é possível deletar. Este segmento possui ${modelCount} modelo(s) associado(s).`);
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este segmento?")) return;

    const { error } = await supabase.from("segments").delete().eq("id", id);
    
    if (error) {
      toast.error("Erro ao excluir segmento");
    } else {
      toast.success("Segmento excluído!");
      loadSegments();
    }
  };

  const openEditDialog = (segment: Segment) => {
    setEditingSegment(segment);
    setFormData({ name: segment.name, description: segment.description || "" });
    setIsDialogOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Segmentos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os segmentos de suas campanhas
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingSegment(null); setFormData({ name: "", description: "" }); }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Segmento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSegment ? "Editar" : "Novo"} Segmento</DialogTitle>
              <DialogDescription>
                {editingSegment ? "Atualize" : "Crie"} um segmento para organizar suas campanhas
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Segmento*</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Futevôlei, Telecom, Futsal"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva este segmento..."
                />
              </div>
              <Button type="submit" className="w-full">
                {editingSegment ? "Atualizar" : "Criar"} Segmento
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map((segment) => (
          <Card key={segment.id}>
            <CardHeader>
              <CardTitle className="flex items-start justify-between">
                <span className="line-clamp-1">{segment.name}</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(segment)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(segment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              {segment.description && (
                <CardDescription className="line-clamp-2">
                  {segment.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {modelCounts[segment.id] || 0} {modelCounts[segment.id] === 1 ? "modelo" : "modelos"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/models?segment=${segment.id}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Modelos
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {segments.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Nenhum segmento cadastrado. Clique em "Novo Segmento" para começar!
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Segments;
