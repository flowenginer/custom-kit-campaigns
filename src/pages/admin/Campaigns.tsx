import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Copy, Plus, Trash2, Settings, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateABTestDialog } from "@/components/abtest/CreateABTestDialog";
import { Badge } from "@/components/ui/badge";
import type { ABTest } from "@/types/ab-test";
import { generateUniqueSlug } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string;
  unique_link: string;
  segment_id: string | null;
  workflow_template_id: string;
  segments?: {
    id: string;
    name: string;
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
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showABTestDialog, setShowABTestDialog] = useState(false);
  const [showChangeWorkflow, setShowChangeWorkflow] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    segment_id: "",
    workflow_template_id: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    // Carregar campanhas
    const { data: campaignsData, error: campaignsError } = await supabase
      .from("campaigns")
      .select(`
        *,
        segments (
          id,
          name
        ),
        workflow_templates (
          id,
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (campaignsError) {
      toast.error("Erro ao carregar campanhas");
      console.error(campaignsError);
    } else if (campaignsData) {
      // Count models for each campaign
      const campaignsWithCounts = await Promise.all(
        campaignsData.map(async (campaign) => {
          if (campaign.segment_id) {
            const { count } = await supabase
              .from("shirt_models")
              .select("*", { count: "exact", head: true })
              .eq("segment_id", campaign.segment_id);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.segment_id || !formData.workflow_template_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Bug #4: Gerar slug amigável baseado no nome da campanha
    const uniqueLink = await generateUniqueSlug(formData.name);

    const campaignData = {
      name: formData.name,
      segment_id: formData.segment_id,
      workflow_template_id: formData.workflow_template_id,
      unique_link: uniqueLink,
    };

    const { error } = await supabase.from("campaigns").insert([campaignData]);

    if (error) {
      toast.error("Erro ao criar campanha");
      console.error(error);
    } else {
      toast.success("Campanha criada com sucesso!");
      setShowDialog(false);
      setFormData({ name: "", segment_id: "", workflow_template_id: "" });
      loadData();
    }
  };

  const handleChangeWorkflow = async (workflowId: string) => {
    if (!selectedCampaignId) return;

    const { error } = await supabase
      .from("campaigns")
      .update({ workflow_template_id: workflowId })
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
    // Verificar se há leads associados
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id);
    
    if (count && count > 0) {
      toast.error(`Não é possível deletar. Esta campanha possui ${count} lead(s) associado(s).`);
      return;
    }

    if (!confirm("Tem certeza que deseja deletar esta campanha?")) return;

    const { error } = await supabase.from("campaigns").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao deletar campanha");
      console.error(error);
    } else {
      toast.success("Campanha deletada!");
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
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                <Button>
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
                  <Label htmlFor="segment">Segmento*</Label>
                  <Select
                    value={formData.segment_id}
                    onValueChange={(value) => setFormData({ ...formData, segment_id: value })}
                    required
                  >
                    <SelectTrigger id="segment">
                      <SelectValue placeholder="Selecione um segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      {segments.map((segment) => (
                        <SelectItem key={segment.id} value={segment.id}>
                          {segment.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhuma campanha criada ainda</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {campaign.name}
                        {getCampaignTestInfo(campaign.id) && (
                          <Badge variant="secondary" className="gap-1">
                            <FlaskConical className="w-3 h-3" />
                            Em Teste A/B
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {campaign.segments?.name || "Sem segmento"} • {campaign.model_count || 0} modelos
                        {campaign.workflow_templates && ` • Workflow: ${campaign.workflow_templates.name}`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <code className="text-sm flex-1 truncate">
                      {window.location.origin}/c/{campaign.unique_link}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyLink(campaign.unique_link)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`/c/${campaign.unique_link}`, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCampaignId(campaign.id);
                        setShowChangeWorkflow(true);
                      }}
                    >
                      <Settings className="w-4 h-4" />
                      Alterar Workflow
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(campaign.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Deletar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

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
