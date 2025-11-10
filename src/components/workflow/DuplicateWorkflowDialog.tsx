import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WorkflowStep {
  id: string;
  label: string;
  order: number;
  enabled: boolean;
  is_custom: boolean;
  description?: string;
}

interface Campaign {
  id: string;
  name: string;
  workflow_config: WorkflowStep[];
}

interface DuplicateWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCampaignId: string;
  onDuplicate: (workflow: WorkflowStep[]) => void;
}

export function DuplicateWorkflowDialog({
  open,
  onOpenChange,
  currentCampaignId,
  onDuplicate,
}: DuplicateWorkflowDialogProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadCampaigns();
    }
  }, [open, currentCampaignId]);

  useEffect(() => {
    if (selectedCampaignId) {
      const campaign = campaigns.find(c => c.id === selectedCampaignId);
      if (campaign) {
        setSelectedWorkflow(campaign.workflow_config);
      }
    } else {
      setSelectedWorkflow([]);
    }
  }, [selectedCampaignId, campaigns]);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, workflow_config")
        .neq("id", currentCampaignId)
        .order("name");

      if (error) throw error;
      setCampaigns((data || []).map(c => ({
        ...c,
        workflow_config: (c.workflow_config as unknown as WorkflowStep[]) || []
      })));
    } catch (error) {
      console.error("Erro ao carregar campanhas:", error);
      toast.error("Erro ao carregar campanhas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = () => {
    if (!selectedWorkflow.length) {
      toast.error("Selecione uma campanha");
      return;
    }

    onDuplicate(selectedWorkflow);
    
    const campaignName = campaigns.find(c => c.id === selectedCampaignId)?.name;
    toast.success(`Workflow duplicado de "${campaignName}"!`);
    
    setSelectedCampaignId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicar Workflow de Outra Campanha
          </DialogTitle>
          <DialogDescription>
            Copie a configuração de workflow de outra campanha
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma outra campanha disponível para duplicar</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="campaign">Selecionar Campanha Origem</Label>
                <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                  <SelectTrigger id="campaign">
                    <SelectValue placeholder="Escolha uma campanha" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedWorkflow.length > 0 && (
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label>Preview do Workflow</Label>
                    <Badge variant="secondary">
                      {selectedWorkflow.length} etapas
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {selectedWorkflow
                      .sort((a, b) => a.order - b.order)
                      .map((step, index) => (
                        <div
                          key={step.id}
                          className="flex items-center gap-3 p-3 bg-background border rounded"
                        >
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{step.label}</span>
                              {step.is_custom && (
                                <Badge variant="outline" className="text-xs">
                                  Customizada
                                </Badge>
                              )}
                              {!step.enabled && (
                                <Badge variant="secondary" className="text-xs">
                                  Desativada
                                </Badge>
                              )}
                            </div>
                            {step.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {step.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleDuplicate}
            disabled={!selectedCampaignId || isLoading}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicar Workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}