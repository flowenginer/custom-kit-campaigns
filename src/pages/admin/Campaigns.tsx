import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Copy, Plus, Trash2, Settings, FlaskConical, Palette, Edit } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateABTestDialog } from "@/components/abtest/CreateABTestDialog";
import { ThemeCustomizer } from "@/components/theme/ThemeCustomizer";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { ABTest } from "@/types/ab-test";
import { generateUniqueSlug } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";

interface Campaign {
  id: string;
  name: string;
  unique_link: string;
  segment_id: string | null;
  segment_tag: string | null;
  model_tag: string | null;
  workflow_template_id: string;
  segments?: {
    id: string;
    name: string;
    segment_tag: string;
  };
  workflow_templates?: {
    id: string;
    name: string;
  };
  created_at: string;
  model_count?: number;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
}

interface Segment {
  id: string;
  name: string;
  segment_tag: string;
}

export default function Campaigns() {
  const { isSuperAdmin } = useUserRole();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [segmentTags, setSegmentTags] = useState<string[]>([]);
  const [modelTags, setModelTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showABTestDialog, setShowABTestDialog] = useState(false);
  const [showChangeWorkflow, setShowChangeWorkflow] = useState(false);
  const [showThemeDialog, setShowThemeDialog] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isCreatingSegmentTag, setIsCreatingSegmentTag] = useState(false);
  const [isCreatingModelTag, setIsCreatingModelTag] = useState(false);
  const [newSegmentTag, setNewSegmentTag] = useState("");
  const [newModelTag, setNewModelTag] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    segment_tag: "",
    model_tag: "",
    workflow_template_id: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    // Carregar campanhas (apenas não deletadas)
    const { data: campaignsData, error: campaignsError } = await supabase
      .from("campaigns")
      .select(`
        *,
        segments (
          id,
          name,
          segment_tag
        ),
        workflow_templates (
          id,
          name
        )
      `)
      .is('deleted_at', null)
      .order("created_at", { ascending: false });

    if (campaignsError) {
      toast.error("Erro ao carregar campanhas");
      console.error(campaignsError);
    } else if (campaignsData) {
      // Count models for each campaign
      const campaignsWithCounts = await Promise.all(
        campaignsData.map(async (campaign) => {
          if (campaign.segment_tag) {
            const { count } = await supabase
              .from("shirt_models")
              .select("*", { count: "exact", head: true })
              .eq("segment_tag", campaign.segment_tag);
            return { ...campaign, model_count: count || 0 };
          }
          return { ...campaign, model_count: 0 };
        })
      );
      setCampaigns(campaignsWithCounts);
    }

    // Carregar segmentos
    const { data: segmentsData, error: segmentsError } = await supabase
      .from("segments")
      .select("*")
      .order("name");

    if (segmentsError) {
      toast.error("Erro ao carregar segmentos");
      console.error(segmentsError);
    } else {
      setSegments(segmentsData || []);
    }

    // Carregar workflows
    const { data: workflowsData, error: workflowsError } = await supabase
      .from("workflow_templates")
      .select("id, name, description")
      .order("name");

    if (workflowsError) {
      toast.error("Erro ao carregar workflows");
      console.error(workflowsError);
    } else {
      setWorkflows(workflowsData || []);
    }

    // Carregar tags de segmento
    const { data: segmentTagsData } = await supabase
      .from("tags")
      .select("tag_value")
      .eq("tag_type", "segment_tag")
      .order("tag_value");
    
    if (segmentTagsData) {
      setSegmentTags(segmentTagsData.map(t => t.tag_value));
    }

    // Carregar tags de modelo
    const { data: modelTagsData } = await supabase
      .from("tags")
      .select("tag_value")
      .eq("tag_type", "model_tag")
      .order("tag_value");
    
    if (modelTagsData) {
      setModelTags(modelTagsData.map(t => t.tag_value));
    }

    // Carregar testes A/B ativos
    const { data: abTestsData, error: abTestsError } = await supabase
      .from("ab_tests")
      .select("*")
      .in("status", ["active", "paused"]);

    if (abTestsError) {
      console.error("Erro ao carregar testes A/B:", abTestsError);
    } else {
      setAbTests((abTestsData || []) as ABTest[]);
    }
    
    setIsLoading(false);
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
    loadData();
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
    loadData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.segment_tag || !formData.model_tag || !formData.workflow_template_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Buscar workflow_config do template selecionado
    const { data: template } = await supabase
      .from("workflow_templates")
      .select("workflow_config")
      .eq("id", formData.workflow_template_id)
      .single();

    // Gerar slug amigável baseado no nome da campanha
    const uniqueLink = await generateUniqueSlug(formData.name);

    const campaignData = {
      name: formData.name,
      segment_tag: formData.segment_tag,
      model_tag: formData.model_tag,
      workflow_template_id: formData.workflow_template_id,
      workflow_config: template?.workflow_config as any,
      unique_link: uniqueLink,
    };

    const { error } = await supabase.from("campaigns").insert([campaignData]);

    if (error) {
      toast.error("Erro ao criar campanha");
      console.error(error);
    } else {
      toast.success("Campanha criada com sucesso!");
      setShowDialog(false);
      setFormData({ name: "", segment_tag: "", model_tag: "", workflow_template_id: "" });
      setIsCreatingSegmentTag(false);
      setIsCreatingModelTag(false);
      setNewSegmentTag("");
      setNewModelTag("");
      loadData();
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCampaign || !formData.name || !formData.segment_tag || !formData.model_tag || !formData.workflow_template_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Buscar workflow_config do template selecionado
    const { data: template } = await supabase
      .from("workflow_templates")
      .select("workflow_config")
      .eq("id", formData.workflow_template_id)
      .single();

    const updateData = {
      name: formData.name,
      segment_tag: formData.segment_tag,
      model_tag: formData.model_tag,
      workflow_template_id: formData.workflow_template_id,
      workflow_config: template?.workflow_config as any,
    };

    const { error } = await supabase
      .from("campaigns")
      .update(updateData)
      .eq("id", editingCampaign.id);

    if (error) {
      toast.error("Erro ao editar campanha");
      console.error(error);
    } else {
      toast.success("Campanha editada com sucesso!");
      setShowEditDialog(false);
      setEditingCampaign(null);
      setFormData({ name: "", segment_tag: "", model_tag: "", workflow_template_id: "" });
      setIsCreatingSegmentTag(false);
      setIsCreatingModelTag(false);
      setNewSegmentTag("");
      setNewModelTag("");
      loadData();
    }
  };

  const handleChangeWorkflow = async (workflowId: string) => {
    if (!selectedCampaignId) return;

    // Buscar workflow_config do template selecionado
    const { data: template } = await supabase
      .from("workflow_templates")
      .select("workflow_config")
      .eq("id", workflowId)
      .single();

    const { error } = await supabase
      .from("campaigns")
      .update({ 
        workflow_template_id: workflowId,
        workflow_config: template?.workflow_config as any
      })
      .eq("id", selectedCampaignId);

    if (error) {
      toast.error("Erro ao alterar workflow");
      console.error(error);
    } else {
      toast.success("Workflow alterado com sucesso!");
      setShowChangeWorkflow(false);
      setSelectedCampaignId("");
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja arquivar esta campanha?")) return;

    const { error } = await supabase
      .from("campaigns")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao arquivar campanha");
      console.error(error);
    } else {
      toast.success("Campanha arquivada!");
      loadData();
    }
  };

  const handleSelectAll = () => {
    if (selectedCampaigns.length === campaigns.length) {
      setSelectedCampaigns([]);
    } else {
      setSelectedCampaigns(campaigns.map(c => c.id));
    }
  };

  const handleSelectCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedCampaigns.length === 0) {
      toast.error("Nenhuma campanha selecionada");
      return;
    }

    const confirmed = window.confirm(
      `Tem certeza que deseja arquivar ${selectedCampaigns.length} campanha(s)?`
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("campaigns")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", selectedCampaigns);

    if (error) {
      toast.error("Erro ao arquivar campanhas");
      console.error(error);
    } else {
      toast.success(`${selectedCampaigns.length} campanha(s) arquivada(s)!`);
      setSelectedCampaigns([]);
      loadData();
    }
  };

  const copyLink = (link: string) => {
    const fullLink = `${window.location.origin}/c/${link}`;
    navigator.clipboard.writeText(fullLink);
    toast.success("Link copiado!");
  };

  const getCampaignTestInfo = (campaignId: string) => {
    return abTests.find((test) => {
      const campaigns = test.campaigns as Array<{ campaign_id: string; percentage: number }>;
      return campaigns.some((c) => c.campaign_id === campaignId);
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 flex-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Campanhas</h1>
            <p className="text-muted-foreground">Gerencie suas campanhas de vendas</p>
          </div>
          <div className="flex gap-2">
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setFormData({ name: "", segment_tag: "", model_tag: "", workflow_template_id: "" });
                  setIsCreatingSegmentTag(false);
                  setIsCreatingModelTag(false);
                  setNewSegmentTag("");
                  setNewModelTag("");
                }}>
                  <Plus className="w-4 h-4" />
                  Nova Campanha
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Campanha</DialogTitle>
                  <DialogDescription>
                    Crie uma nova campanha associando um segmento e workflow
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Campanha*</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Campanha Verão 2025"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="segment_tag">Tag do Segmento*</Label>
                  {!isCreatingSegmentTag ? (
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
                      <SelectTrigger id="segment_tag">
                        <SelectValue placeholder="Selecione uma tag de segmento" />
                      </SelectTrigger>
                      <SelectContent>
                        {segmentTags.map(tag => (
                          <SelectItem key={tag} value={tag}>
                            📁 {tag}
                          </SelectItem>
                        ))}
                        <SelectItem value="__create_new__" className="text-primary font-semibold">
                          ➕ Criar nova tag de segmento
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                      <SelectTrigger id="model_tag">
                        <SelectValue placeholder="Selecione uma tag de modelo" />
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
                  <Label htmlFor="workflow">Workflow*</Label>
                  <Select
                    value={formData.workflow_template_id}
                    onValueChange={(value) => setFormData({ ...formData, workflow_template_id: value })}
                    required
                  >
                    <SelectTrigger id="workflow">
                      <SelectValue placeholder="Selecione um workflow" />
                    </SelectTrigger>
                    <SelectContent>
                      {workflows.map((workflow) => (
                        <SelectItem key={workflow.id} value={workflow.id}>
                          {workflow.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Define as etapas do funil para esta campanha
                  </p>
                </div>

                <Button type="submit" className="w-full">
                  Criar Campanha
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={() => setShowABTestDialog(true)}>
            <FlaskConical className="w-4 h-4" />
            Criar Teste A/B
          </Button>
        </div>
      </div>

        {campaigns.length > 0 && isSuperAdmin && (
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={selectedCampaigns.length === campaigns.length}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="cursor-pointer font-medium">
                Selecionar todas {selectedCampaigns.length > 0 && `(${selectedCampaigns.length} selecionadas)`}
              </Label>
            </div>
            {selectedCampaigns.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Arquivar Selecionadas ({selectedCampaigns.length})
              </Button>
            )}
          </div>
        )}

        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhuma campanha criada ainda</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="relative">
                {isSuperAdmin && (
                  <div className="absolute top-4 right-4 z-10">
                    <Checkbox
                      checked={selectedCampaigns.includes(campaign.id)}
                      onCheckedChange={() => handleSelectCampaign(campaign.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {campaign.name}
                        {getCampaignTestInfo(campaign.id) && (
                          <Badge variant="secondary" className="gap-1">
                            <FlaskConical className="w-3 h-3" />
                            Em Teste A/B
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {campaign.segments?.name || "Sem segmento"} • {campaign.model_count || 0} modelos
                        {campaign.workflow_templates && ` • Workflow: ${campaign.workflow_templates.name}`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <code className="text-xs flex-1 truncate">
                      {window.location.origin}/c/{campaign.unique_link}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => copyLink(campaign.unique_link)}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => window.open(`/c/${campaign.unique_link}`, "_blank")}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setEditingCampaign(campaign);
                        setFormData({
                          name: campaign.name,
                          segment_tag: campaign.segment_tag || "",
                          model_tag: campaign.model_tag || "",
                          workflow_template_id: campaign.workflow_template_id,
                        });
                        setShowEditDialog(true);
                      }}
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setSelectedCampaignId(campaign.id);
                        setShowThemeDialog(true);
                      }}
                    >
                      <Palette className="w-3.5 h-3.5" />
                      Tema
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setSelectedCampaignId(campaign.id);
                        setShowChangeWorkflow(true);
                      }}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Workflow
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleDelete(campaign.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Deletar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Campanha</DialogTitle>
              <DialogDescription>
                Atualize as informações da campanha
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nome da Campanha*</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Campanha Verão 2025"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-segment-tag">Tag do Segmento*</Label>
                <Select
                  value={formData.segment_tag}
                  onValueChange={(value) => setFormData({ ...formData, segment_tag: value })}
                  required
                >
                  <SelectTrigger id="edit-segment-tag">
                    <SelectValue placeholder="Selecione uma tag de segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    {segmentTags.map(tag => (
                      <SelectItem key={tag} value={tag}>
                        📁 {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-model-tag">Tag do Modelo*</Label>
                <Select
                  value={formData.model_tag}
                  onValueChange={(value) => setFormData({ ...formData, model_tag: value })}
                  required
                >
                  <SelectTrigger id="edit-model-tag">
                    <SelectValue placeholder="Selecione uma tag de modelo" />
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
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-workflow">Workflow*</Label>
                <Select
                  value={formData.workflow_template_id}
                  onValueChange={(value) => setFormData({ ...formData, workflow_template_id: value })}
                  required
                >
                  <SelectTrigger id="edit-workflow">
                    <SelectValue placeholder="Selecione um workflow" />
                  </SelectTrigger>
                  <SelectContent>
                    {workflows.map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setShowEditDialog(false);
                  setEditingCampaign(null);
                  setFormData({ name: "", segment_tag: "", model_tag: "", workflow_template_id: "" });
                }}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showChangeWorkflow} onOpenChange={setShowChangeWorkflow}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Workflow da Campanha</DialogTitle>
              <DialogDescription>
                Selecione o novo workflow para esta campanha
              </DialogDescription>
            </DialogHeader>

            <div>
              <Label htmlFor="new-workflow">Novo Workflow</Label>
              <Select onValueChange={handleChangeWorkflow}>
                <SelectTrigger id="new-workflow">
                  <SelectValue placeholder="Selecione um workflow" />
                </SelectTrigger>
                <SelectContent>
                  {workflows.map((workflow) => (
                    <SelectItem key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowChangeWorkflow(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showThemeDialog} onOpenChange={setShowThemeDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Personalizar Tema da Campanha</DialogTitle>
              <DialogDescription>
                Configure as cores, fontes e estilos da interface da campanha
              </DialogDescription>
            </DialogHeader>
            
            {selectedCampaignId && (
              <ThemeCustomizer campaignId={selectedCampaignId} />
            )}
          </DialogContent>
        </Dialog>

        <CreateABTestDialog
          open={showABTestDialog}
          onOpenChange={setShowABTestDialog}
          onSuccess={() => {
            setShowABTestDialog(false);
            loadData();
          }}
        />
    </div>
  );
}
