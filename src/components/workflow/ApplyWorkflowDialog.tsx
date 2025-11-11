import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface WorkflowStep {
  id: string;
  label: string;
  order: number;
  enabled: boolean;
  is_custom?: boolean;
  description?: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  workflow_config: WorkflowStep[];
}

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

  useEffect(() => {
    if (open) {
      loadCampaigns();
      setSelectedCampaignId("");
    }
  }, [open]);

  const loadCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, name, segment_id, segments(name)")
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
    if (!selectedCampaignId || !workflow) return;

    setApplying(true);
    const { error } = await supabase
      .from("campaigns")
      .update({ workflow_template_id: workflow.id })
      .eq("id", selectedCampaignId);

    if (error) {
      toast.error("Erro ao aplicar workflow");
      console.error(error);
    } else {
      toast.success("Workflow aplicado com sucesso!");
      onApply();
      onOpenChange(false);
    }
    setApplying(false);
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={!selectedCampaignId || applying}>
            {applying ? "Aplicando..." : "Aplicar Workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
