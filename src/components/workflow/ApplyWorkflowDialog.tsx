import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { WorkflowTemplate } from "@/types/workflow";

interface Campaign {
  id: string;
  name: string;
  segment_id: string | null;
  segments?: {
    name: string;
  };
}

interface ApplyWorkflowDialogProps {
  workflow: WorkflowTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: () => void;
}

export const ApplyWorkflowDialog = ({ workflow, open, onOpenChange, onApply }: ApplyWorkflowDialogProps) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);

  useEffect(() => {
    if (open) {
      loadCampaigns();
      setSelectedCampaignId("");
      setApplyToAll(false);
    }
  }, [open]);

  const loadCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, name, segment_id, segments(name)")
      .is('deleted_at', null)
      .order("name");

    if (error) {
      toast.error("Erro ao carregar campanhas");
      console.error(error);
    } else {
      setCampaigns(data || []);
    }
    setLoading(false);
  };

  const handleApply = async () => {
    if (!workflow) return;
    if (!applyToAll && !selectedCampaignId) return;

    setApplying(true);

    try {
      if (applyToAll) {
        const campaignIds = campaigns.map(c => c.id);
        const { error } = await supabase
          .from("campaigns")
          .update({ 
            workflow_template_id: workflow.id,
            workflow_config: workflow.workflow_config as any
          })
          .in("id", campaignIds);

        if (error) throw error;
        toast.success(`Workflow aplicado a ${campaigns.length} campanha(s)!`);
      } else {
        const { error } = await supabase
          .from("campaigns")
          .update({ 
            workflow_template_id: workflow.id,
            workflow_config: workflow.workflow_config as any
          })
          .eq("id", selectedCampaignId);

        if (error) throw error;
        
        const campaign = campaigns.find(c => c.id === selectedCampaignId);
        toast.success(`Workflow aplicado a "${campaign?.name}"!`);
      }

      onApply();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao aplicar workflow");
      console.error(error);
    } finally {
      setApplying(false);
    }
  };

  if (!workflow) return null;

  const activeSteps = workflow.workflow_config.filter((s) => s.enabled).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aplicar Workflow em Campanha</DialogTitle>
          <DialogDescription>
            Aplicar "{workflow.name}" ({activeSteps} etapas ativas) em uma campanha
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma campanha disponível</p>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="flex-1">
                  <Label className="text-sm font-semibold">Aplicar a todas as campanhas</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aplicar este workflow em {campaigns.length} campanha(s) de uma vez
                  </p>
                </div>
                <Switch
                  checked={applyToAll}
                  onCheckedChange={setApplyToAll}
                />
              </div>

              {!applyToAll && (
                <div>
                  <Label htmlFor="campaign">Selecionar Campanha*</Label>
                  <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                    <SelectTrigger id="campaign">
                      <SelectValue placeholder="Escolha uma campanha" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                          {campaign.segments && ` (${campaign.segments.name})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancelar
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={(!applyToAll && !selectedCampaignId) || applying || campaigns.length === 0}
          >
            {applying ? "Aplicando..." : applyToAll ? "Aplicar a Todas" : "Aplicar Workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
