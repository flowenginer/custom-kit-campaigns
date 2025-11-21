import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";

interface Segment {
  id: string;
  name: string;
  description: string | null;
  segment_tag: string | null;
  model_tag: string | null;
  created_at: string;
}

const Segments = () => {
  const navigate = useNavigate();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [modelCounts, setModelCounts] = useState<Record<string, number>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", segment_tag: "", model_tag: "" });
  const [segmentTags, setSegmentTags] = useState<string[]>([]);
  const [modelTags, setModelTags] = useState<string[]>([]);
  const [isCreatingSegmentTag, setIsCreatingSegmentTag] = useState(false);
  const [isCreatingModelTag, setIsCreatingModelTag] = useState(false);
  const [newSegmentTag, setNewSegmentTag] = useState("");
  const [newModelTag, setNewModelTag] = useState("");

  useEffect(() => {
    loadSegments();
    loadTags();
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

  const loadTags = async () => {
    const { data: segmentTagsData } = await supabase
      .from("tags")
      .select("tag_value")
      .eq("tag_type", "segment_tag")
      .order("tag_value");
    
    if (segmentTagsData) {
      setSegmentTags(segmentTagsData.map(t => t.tag_value));
    }

    const { data: modelTagsData } = await supabase
      .from("tags")
      .select("tag_value")
      .eq("tag_type", "model_tag")
      .order("tag_value");
    
    if (modelTagsData) {
      setModelTags(modelTagsData.map(t => t.tag_value));
    }
  };

  const handleCreateSegmentTag = async () => {
    if (!newSegmentTag.trim()) {
      toast.error("Digite o nome da tag");
      return;
    }

    const formattedTag = newSegmentTag
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');

    const { error } = await supabase
      .from("tags")
      .insert({ tag_value: formattedTag, tag_type: "segment_tag" });

    if (error) {
      if (error.code === '23505') {
        toast.error("Esta tag já existe!");
      } else {
        toast.error("Erro ao criar tag");
      }
      return;
    }

    toast.success("Tag criada com sucesso!");
    setNewSegmentTag("");
    setIsCreatingSegmentTag(false);
    setFormData({ ...formData, segment_tag: formattedTag });
    loadTags();
  };

  const handleCreateModelTag = async () => {
    if (!newModelTag.trim()) {
      toast.error("Digite o nome da tag");
      return;
    }

    const formattedTag = newModelTag
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');

    const { error } = await supabase
      .from("tags")
      .insert({ tag_value: formattedTag, tag_type: "model_tag" });

    if (error) {
      if (error.code === '23505') {
        toast.error("Esta tag já existe!");
      } else {
        toast.error("Erro ao criar tag");
      }
      return;
    }

    toast.success("Tag criada com sucesso!");
    setNewModelTag("");
    setIsCreatingModelTag(false);
    setFormData({ ...formData, model_tag: formattedTag });
    loadTags();
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
      setFormData({ name: "", description: "", segment_tag: "", model_tag: "" });
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
    setFormData({ 
      name: segment.name, 
      description: segment.description || "", 
      segment_tag: segment.segment_tag || "",
      model_tag: segment.model_tag || ""
    });
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
            <Button onClick={() => { 
              setEditingSegment(null); 
              setFormData({ name: "", description: "", segment_tag: "", model_tag: "" });
              setIsCreatingSegmentTag(false);
              setIsCreatingModelTag(false);
              setNewSegmentTag("");
              setNewModelTag("");
            }}>
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
                  placeholder="Ex: Energia Solar, Agro, Futevôlei"
                  required
                />
              </div>

              <div>
                <Label htmlFor="segment_tag">Tag do Segmento*</Label>
                {!isCreatingSegmentTag ? (
                  <div className="flex gap-2">
                    <Select
                      value={formData.segment_tag}
                      onValueChange={(value) => {
                        if (value === "__create_new__") {
                          setIsCreatingSegmentTag(true);
                        } else {
                          setFormData({ ...formData, segment_tag: value });
                        }
                      }}
                      required
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione ou crie uma tag" />
                      </SelectTrigger>
                      <SelectContent>
                        {segmentTags.map(tag => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                        <SelectItem value="__create_new__" className="text-primary font-semibold">
                          ➕ Criar nova tag de segmento
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={newSegmentTag}
                      onChange={(e) => setNewSegmentTag(e.target.value)}
                      placeholder="Digite a nova tag (ex: construcao_civil)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateSegmentTag();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleCreateSegmentTag} size="sm">
                      Criar
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setIsCreatingSegmentTag(false);
                        setNewSegmentTag("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: energia_solar, agro, futevoelei
                </p>
              </div>

              <div>
                <Label htmlFor="model_tag">Tag do Modelo*</Label>
                {!isCreatingModelTag ? (
                  <div className="flex gap-2">
                    <Select
                      value={formData.model_tag}
                      onValueChange={(value) => {
                        if (value === "__create_new__") {
                          setIsCreatingModelTag(true);
                        } else {
                          setFormData({ ...formData, model_tag: value });
                        }
                      }}
                      required
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione ou crie uma tag" />
                      </SelectTrigger>
                      <SelectContent>
                        {modelTags.map(tag => (
                          <SelectItem key={tag} value={tag}>
                            {tag === 'ziper' && '🧥 '}
                            {tag === 'manga_longa' && '👕 '}
                            {tag === 'manga_curta' && '👔 '}
                            {tag === 'regata' && '🎽 '}
                            {tag}
                          </SelectItem>
                        ))}
                        <SelectItem value="__create_new__" className="text-primary font-semibold">
                          ➕ Criar nova tag de modelo
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={newModelTag}
                      onChange={(e) => setNewModelTag(e.target.value)}
                      placeholder="Digite a nova tag (ex: jaqueta)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateModelTag();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleCreateModelTag} size="sm">
                      Criar
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setIsCreatingModelTag(false);
                        setNewModelTag("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: ziper, manga_longa, manga_curta, regata
                </p>
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
                <div className="flex flex-col gap-2">
                  <span className="line-clamp-1">{segment.name}</span>
                  <div className="flex gap-2 flex-wrap">
                    {segment.segment_tag && (
                      <Badge variant="outline" className="text-xs w-fit">
                        📁 {segment.segment_tag}
                      </Badge>
                    )}
                    {segment.model_tag && (
                      <Badge variant="secondary" className="text-xs w-fit">
                        {segment.model_tag === 'ziper' && '🧥 '}
                        {segment.model_tag === 'manga_longa' && '👕 '}
                        {segment.model_tag === 'manga_curta' && '👔 '}
                        {segment.model_tag === 'regata' && '🎽 '}
                        {segment.model_tag}
                      </Badge>
                    )}
                  </div>
                </div>
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
