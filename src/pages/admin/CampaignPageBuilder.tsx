import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileEdit, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkflowStep } from "@/types/workflow";

interface Campaign {
  id: string;
  name: string;
  unique_link: string;
  workflow_config: any;
}

const CampaignPageBuilder = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, unique_link, workflow_config")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCampaigns(data || []);
    } catch (error) {
      console.error("Erro ao buscar campanhas:", error);
      toast.error("Erro ao carregar campanhas");
    } finally {
      setLoading(false);
    }
  };

  const handleEditStep = (stepId: string) => {
    if (!selectedCampaign) return;
    navigate(`/admin/campaigns/${selectedCampaign.id}/step/${stepId}/builder`);
  };

  const handleViewCampaign = () => {
    if (!selectedCampaign) return;
    window.open(`/c/${selectedCampaign.unique_link}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Editor de Páginas de Campanha</h1>
          <p className="text-muted-foreground mt-2">
            Personalize visualmente as páginas de cada etapa do workflow
          </p>
        </div>
        {selectedCampaign && (
          <Button onClick={handleViewCampaign} variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            Visualizar Campanha
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecione uma Campanha</CardTitle>
          <CardDescription>
            Escolha a campanha que deseja editar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedCampaign?.id}
            onValueChange={(value) => {
              const campaign = campaigns.find((c) => c.id === value);
              setSelectedCampaign(campaign || null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma campanha" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCampaign && selectedCampaign.workflow_config && (
        <Card>
          <CardHeader>
            <CardTitle>Etapas do Workflow</CardTitle>
            <CardDescription>
              Clique em uma etapa para editar sua página visualmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(selectedCampaign.workflow_config as WorkflowStep[])
                .filter((step) => step.enabled)
                .sort((a, b) => a.order - b.order)
                .map((step) => (
                  <Card key={step.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm">
                          {step.order}
                        </span>
                        {step.label}
                      </CardTitle>
                      {step.description && (
                        <CardDescription>{step.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => handleEditStep(step.id)}
                        className="w-full"
                        variant="outline"
                      >
                        <FileEdit className="h-4 w-4 mr-2" />
                        Editar Página
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedCampaign && campaigns.length > 0 && (
        <div className="text-center text-muted-foreground py-12">
          Selecione uma campanha acima para começar a editar suas páginas
        </div>
      )}

      {campaigns.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          Nenhuma campanha encontrada. Crie uma campanha primeiro.
        </div>
      )}
    </div>
  );
};

export default CampaignPageBuilder;
