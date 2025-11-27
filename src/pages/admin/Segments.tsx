import { useEffect, useState, useMemo, useCallback } from "react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, LayoutGrid, LayoutList, Grid3x3, Grid2x2, Folder, FolderOpen, ChevronDown, ChevronRight } from "lucide-react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { RefreshIndicator } from "@/components/dashboard/RefreshIndicator";

interface Segment {
  id: string;
  name: string;
  description: string | null;
  segment_tag: string | null;
  model_tag: string | null;
  created_at: string;
}

type ViewMode = 'list' | 'small' | 'medium' | 'large';

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
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('segments-view-mode');
    return (saved as ViewMode) || 'medium';
  });
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);

  const refreshData = useCallback(async () => {
    await loadSegments();
  }, []);

  const { lastUpdated, isRefreshing, refresh } = useAutoRefresh(
    refreshData,
    { interval: 60000, enabled: true }
  );

  useEffect(() => {
    loadSegments();
    loadTags();
  }, []);

  const setAndSaveViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('segments-view-mode', mode);
  };

  const groupedSegments = useMemo(() => {
    const groups: Record<string, Segment[]> = {};
    
    segments.forEach(segment => {
      const folder = segment.segment_tag || 'sem_categoria';
      if (!groups[folder]) {
        groups[folder] = [];
      }
      groups[folder].push(segment);
    });
    
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [segments]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => 
      prev.includes(folderId) 
        ? prev.filter(f => f !== folderId)
        : [...prev, folderId]
    );
  };

  const expandAllFolders = () => {
    setExpandedFolders(groupedSegments.map(([folder]) => folder));
  };

  const collapseAllFolders = () => {
    setExpandedFolders([]);
  };

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

  const renderListView = (segmentsList: Segment[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Tipo de Modelo</TableHead>
          <TableHead>Modelos</TableHead>
          <TableHead className="w-[200px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {segmentsList.map(segment => (
          <TableRow key={segment.id}>
            <TableCell className="font-medium">{segment.name}</TableCell>
            <TableCell>
              {segment.model_tag && (
                <Badge variant="secondary" className="text-xs">
                  {segment.model_tag === 'ziper' && '🧥 '}
                  {segment.model_tag === 'manga_longa' && '👕 '}
                  {segment.model_tag === 'manga_curta' && '👔 '}
                  {segment.model_tag === 'regata' && '🎽 '}
                  {segment.model_tag === 'short' && '🩳 '}
                  {segment.model_tag}
                </Badge>
              )}
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground">
                {modelCounts[segment.id] || 0} {modelCounts[segment.id] === 1 ? "modelo" : "modelos"}
              </span>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(segment)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(segment.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/models?segment=${segment.id}`)}>
                  <Eye className="mr-1 h-3 w-3" />
                  Ver
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderSmallView = (segmentsList: Segment[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
      {segmentsList.map(segment => (
        <Card key={segment.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/admin/models?segment=${segment.id}`)}>
          <CardContent className="p-3">
            <div className="text-sm font-medium line-clamp-2 mb-2">{segment.name}</div>
            <div className="flex flex-col gap-1">
              {segment.model_tag && (
                <Badge variant="secondary" className="text-xs w-fit">
                  {segment.model_tag === 'ziper' && '🧥'}
                  {segment.model_tag === 'manga_longa' && '👕'}
                  {segment.model_tag === 'manga_curta' && '👔'}
                  {segment.model_tag === 'regata' && '🎽'}
                  {segment.model_tag === 'short' && '🩳'}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {modelCounts[segment.id] || 0} modelo{modelCounts[segment.id] !== 1 ? 's' : ''}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderMediumView = (segmentsList: Segment[]) => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {segmentsList.map(segment => (
        <Card key={segment.id}>
          <CardHeader>
            <CardTitle className="flex items-start justify-between">
              <div className="flex flex-col gap-2">
                <span className="line-clamp-1">{segment.name}</span>
                {segment.model_tag && (
                  <Badge variant="secondary" className="text-xs w-fit">
                    {segment.model_tag === 'ziper' && '🧥 '}
                    {segment.model_tag === 'manga_longa' && '👕 '}
                    {segment.model_tag === 'manga_curta' && '👔 '}
                    {segment.model_tag === 'regata' && '🎽 '}
                    {segment.model_tag === 'short' && '🩳 '}
                    {segment.model_tag}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(segment)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(segment.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
            {segment.description && (
              <CardDescription className="line-clamp-2">{segment.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {modelCounts[segment.id] || 0} {modelCounts[segment.id] === 1 ? "modelo" : "modelos"}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigate(`/admin/models?segment=${segment.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Modelos
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderLargeView = (segmentsList: Segment[]) => (
    <div className="grid md:grid-cols-2 gap-6">
      {segmentsList.map(segment => (
        <Card key={segment.id}>
          <CardHeader>
            <CardTitle className="flex items-start justify-between text-xl">
              <div className="flex flex-col gap-3">
                <span>{segment.name}</span>
                {segment.model_tag && (
                  <Badge variant="secondary" className="text-sm w-fit">
                    {segment.model_tag === 'ziper' && '🧥 '}
                    {segment.model_tag === 'manga_longa' && '👕 '}
                    {segment.model_tag === 'manga_curta' && '👔 '}
                    {segment.model_tag === 'regata' && '🎽 '}
                    {segment.model_tag === 'short' && '🩳 '}
                    {segment.model_tag}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(segment)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(segment.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
            {segment.description && (
              <CardDescription className="text-base">{segment.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-base text-muted-foreground">
                {modelCounts[segment.id] || 0} {modelCounts[segment.id] === 1 ? "modelo" : "modelos"}
              </span>
              <Button variant="outline" onClick={() => navigate(`/admin/models?segment=${segment.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Modelos
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Segmentos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os segmentos de suas campanhas
          </p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <RefreshIndicator 
            lastUpdated={lastUpdated}
            isRefreshing={isRefreshing}
            onRefresh={refresh}
          />
          
          {/* Botões de Expandir/Colapsar */}
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={expandAllFolders}>
              Expandir Tudo
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAllFolders}>
              Fechar Tudo
            </Button>
          </div>

          {/* Modo de Visualização */}
          <div className="flex gap-1 bg-muted/30 p-1.5 rounded-lg border">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAndSaveViewMode('list')}
              className="h-8"
            >
              <LayoutList className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Lista</span>
            </Button>
            <Button
              variant={viewMode === 'small' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAndSaveViewMode('small')}
              className="h-8"
            >
              <Grid3x3 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Pequeno</span>
            </Button>
            <Button
              variant={viewMode === 'medium' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAndSaveViewMode('medium')}
              className="h-8"
            >
              <Grid2x2 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Médio</span>
            </Button>
            <Button
              variant={viewMode === 'large' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAndSaveViewMode('large')}
              className="h-8"
            >
              <LayoutGrid className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Grande</span>
            </Button>
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
      </div>

      {/* Visualização em Pastas */}
      <div className="space-y-3">
        {groupedSegments.map(([folderName, folderSegments]) => (
          <Collapsible
            key={folderName}
            open={expandedFolders.includes(folderName)}
            onOpenChange={() => toggleFolder(folderName)}
          >
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                {expandedFolders.includes(folderName) ? (
                  <>
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <ChevronDown className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <Folder className="h-5 w-5 text-muted-foreground" />
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
                <span className="font-medium capitalize">
                  {folderName.replace(/_/g, ' ')}
                </span>
                <Badge variant="secondary" className="ml-auto">
                  {folderSegments.length} {folderSegments.length === 1 ? 'segmento' : 'segmentos'}
                </Badge>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-3 ml-4">
              {viewMode === 'list' && renderListView(folderSegments)}
              {viewMode === 'small' && renderSmallView(folderSegments)}
              {viewMode === 'medium' && renderMediumView(folderSegments)}
              {viewMode === 'large' && renderLargeView(folderSegments)}
            </CollapsibleContent>
          </Collapsible>
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
