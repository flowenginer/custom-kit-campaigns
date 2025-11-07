import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toast } from "sonner";
import { Plus, ExternalLink, Copy, Trash2 } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  unique_link: string;
  segment_id: string;
  segments: { name: string; id: string } | null;
  created_at: string;
  model_count?: number;
}

interface Segment {
  id: string;
  name: string;
}

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    segment_id: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: campaignsData } = await supabase
      .from("campaigns")
      .select("*, segments(name, id)")
      .order("created_at", { ascending: false });
    
    const { data: segmentsData } = await supabase
      .from("segments")
      .select("*")
      .order("name");

    // Count models for each campaign
    if (campaignsData) {
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
    
    if (segmentsData) setSegments(segmentsData);
  };

  const generateUniqueLink = () => {
    return `c-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.segment_id) {
      toast.error("Selecione um segmento!");
      return;
    }

    try {
      const uniqueLink = generateUniqueLink();
      
      const { error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          name: formData.name,
          segment_id: formData.segment_id,
          unique_link: uniqueLink,
        });

      if (campaignError) throw campaignError;

      toast.success("Campanha criada com sucesso!");
      setIsDialogOpen(false);
      setFormData({ name: "", segment_id: "" });
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
                Todos os modelos do segmento selecionado estarão disponíveis na campanha
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
                <Label htmlFor="segment">Segmento*</Label>
                <Select
                  value={formData.segment_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, segment_id: value })
                  }
                  required
                >
                  <SelectTrigger>
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
                <p className="text-sm text-muted-foreground mt-2">
                  Os modelos cadastrados neste segmento aparecerão automaticamente na campanha
                </p>
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
                      Segmento: {campaign.segments.name} • {campaign.model_count || 0} modelos disponíveis
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
