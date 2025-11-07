import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, ExternalLink, Copy, Trash2 } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  unique_link: string;
  segments: { name: string } | null;
  created_at: string;
}

interface Segment {
  id: string;
  name: string;
}

interface ShirtModel {
  id: string;
  name: string;
}

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [models, setModels] = useState<ShirtModel[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    segment_id: "",
    selectedModels: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: campaignsData } = await supabase
      .from("campaigns")
      .select("*, segments(name)")
      .order("created_at", { ascending: false });
    
    const { data: segmentsData } = await supabase
      .from("segments")
      .select("*")
      .order("name");
    
    const { data: modelsData } = await supabase
      .from("shirt_models")
      .select("id, name")
      .order("name");

    if (campaignsData) setCampaigns(campaignsData);
    if (segmentsData) setSegments(segmentsData);
    if (modelsData) setModels(modelsData);
  };

  const generateUniqueLink = () => {
    return `c-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.selectedModels.length === 0) {
      toast.error("Selecione pelo menos um modelo!");
      return;
    }

    try {
      const uniqueLink = generateUniqueLink();
      
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          name: formData.name,
          segment_id: formData.segment_id || null,
          unique_link: uniqueLink,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      const campaignModels = formData.selectedModels.map((modelId) => ({
        campaign_id: campaign.id,
        model_id: modelId,
      }));

      const { error: modelsError } = await supabase
        .from("campaign_models")
        .insert(campaignModels);

      if (modelsError) throw modelsError;

      toast.success("Campanha criada com sucesso!");
      setIsDialogOpen(false);
      setFormData({ name: "", segment_id: "", selectedModels: [] });
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta campanha?")) return;

    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    
    if (error) {
      toast.error("Erro ao excluir campanha");
    } else {
      toast.success("Campanha excluída!");
      loadData();
    }
  };

  const copyLink = (link: string) => {
    const fullLink = `${window.location.origin}/c/${link}`;
    navigator.clipboard.writeText(fullLink);
    toast.success("Link copiado!");
  };

  const toggleModel = (modelId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedModels: prev.selectedModels.includes(modelId)
        ? prev.selectedModels.filter((id) => id !== modelId)
        : [...prev.selectedModels, modelId],
    }));
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Campanhas</h1>
          <p className="text-muted-foreground mt-1">
            Crie e gerencie suas campanhas de vendas
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Campanha</DialogTitle>
              <DialogDescription>
                Configure uma nova campanha e selecione os modelos disponíveis
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Campanha*</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Torneio Futsal 2025"
                  required
                />
              </div>

              <div>
                <Label htmlFor="segment">Segmento</Label>
                <Select
                  value={formData.segment_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, segment_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um segmento (opcional)" />
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
                <Label>Modelos Disponíveis*</Label>
                <div className="space-y-2 mt-2 border rounded-lg p-4 max-h-60 overflow-y-auto">
                  {models.map((model) => (
                    <div key={model.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={model.id}
                        checked={formData.selectedModels.includes(model.id)}
                        onCheckedChange={() => toggleModel(model.id)}
                      />
                      <Label
                        htmlFor={model.id}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {model.name}
                      </Label>
                    </div>
                  ))}
                </div>
                {models.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Cadastre modelos primeiro para criar uma campanha.
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full">
                Criar Campanha
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle>{campaign.name}</CardTitle>
                  {campaign.segments && (
                    <CardDescription>
                      Segmento: {campaign.segments.name}
                    </CardDescription>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(campaign.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <code className="text-sm flex-1 truncate">
                  {window.location.origin}/c/{campaign.unique_link}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyLink(campaign.unique_link)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(`/c/${campaign.unique_link}`, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {campaigns.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Nenhuma campanha criada. Clique em "Nova Campanha" para começar!
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Campaigns;
