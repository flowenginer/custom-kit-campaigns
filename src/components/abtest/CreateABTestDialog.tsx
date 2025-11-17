import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CampaignOption } from "@/types/ab-test";
import { Loader2 } from "lucide-react";

interface CreateABTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateABTestDialog = ({ open, onOpenChange, onSuccess }: CreateABTestDialogProps) => {
  const [name, setName] = useState("");
  const [uniqueLink, setUniqueLink] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [useDays, setUseDays] = useState(false);
  const [days, setDays] = useState(30);
  const [useLeads, setUseLeads] = useState(false);
  const [leads, setLeads] = useState(100);
  const [criteriaMode, setCriteriaMode] = useState<'first' | 'both'>('first');
  const [loading, setLoading] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCampaigns();
    }
  }, [open]);

  useEffect(() => {
    // Auto-gerar link único baseado no nome
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setUniqueLink(slug);
  }, [name]);

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, unique_link, segment_id, segments(name)')
      .order('name');

    if (error) {
      toast({
        title: "Erro ao carregar campanhas",
        description: error.message,
        variant: "destructive"
      });
    } else if (data) {
      setCampaigns(data.map(c => ({
        id: c.id,
        name: c.name,
        unique_link: c.unique_link,
        segment_name: c.segments?.name
      })));
    }
    setLoadingCampaigns(false);
  };

  const toggleCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev => {
      if (prev.includes(campaignId)) {
        const newSelected = prev.filter(id => id !== campaignId);
        const newDist = { ...distribution };
        delete newDist[campaignId];
        setDistribution(newDist);
        return newSelected;
      } else {
        return [...prev, campaignId];
      }
    });
  };

  const distributeEqually = () => {
    if (selectedCampaigns.length === 0) return;
    const percentage = Math.floor(100 / selectedCampaigns.length);
    const newDist: Record<string, number> = {};
    selectedCampaigns.forEach((id, index) => {
      if (index === selectedCampaigns.length - 1) {
        // Última campanha recebe o resto para somar 100%
        newDist[id] = 100 - (percentage * (selectedCampaigns.length - 1));
      } else {
        newDist[id] = percentage;
      }
    });
    setDistribution(newDist);
  };

  const updateDistribution = (campaignId: string, value: number) => {
    setDistribution(prev => ({ ...prev, [campaignId]: value }));
  };

  const getTotalPercentage = () => {
    return Object.values(distribution).reduce((sum, val) => sum + val, 0);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para o teste A/B",
        variant: "destructive"
      });
      return;
    }

    if (selectedCampaigns.length < 2) {
      toast({
        title: "Selecione pelo menos 2 campanhas",
        description: "Um teste A/B precisa de no mínimo 2 campanhas",
        variant: "destructive"
      });
      return;
    }

    const total = getTotalPercentage();
    if (Math.abs(total - 100) > 0.1) {
      toast({
        title: "Distribuição inválida",
        description: `A soma das porcentagens deve ser 100% (atual: ${total.toFixed(1)}%)`,
        variant: "destructive"
      });
      return;
    }

    if (!useDays && !useLeads) {
      toast({
        title: "Critério de conclusão obrigatório",
        description: "Selecione pelo menos um critério (dias ou leads)",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const campaignsData = selectedCampaigns.map(id => ({
      campaign_id: id,
      percentage: distribution[id] || 0
    }));

    const completionCriteria: any = { mode: criteriaMode };
    if (useDays) completionCriteria.days = days;
    if (useLeads) completionCriteria.leads = leads;

    const { error } = await supabase
      .from('ab_tests')
      .insert({
        name,
        unique_link: uniqueLink,
        campaigns: campaignsData,
        completion_criteria: completionCriteria,
        created_by: user?.id
      });

    setLoading(false);

    if (error) {
      toast({
        title: "Erro ao criar teste",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Teste A/B criado!",
        description: `Link: /t/${uniqueLink}`
      });
      onSuccess();
      onOpenChange(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setName("");
    setUniqueLink("");
    setSelectedCampaigns([]);
    setDistribution({});
    setUseDays(false);
    setDays(30);
    setUseLeads(false);
    setLeads(100);
    setCriteriaMode('first');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Teste A/B</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Teste</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Teste Futebol vs Basquete"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link">Link Único</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/t/</span>
              <Input
                id="link"
                value={uniqueLink}
                onChange={(e) => setUniqueLink(e.target.value)}
                placeholder="teste-futebol-vs-basquete"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Selecionar Campanhas (mínimo 2)</Label>
              {loadingCampaigns && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
              {campaigns.map(campaign => (
                <div key={campaign.id} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedCampaigns.includes(campaign.id)}
                    onCheckedChange={() => toggleCampaign(campaign.id)}
                  />
                  <span className="text-sm">
                    {campaign.name}
                    {campaign.segment_name && (
                      <span className="text-muted-foreground"> • {campaign.segment_name}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {selectedCampaigns.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Distribuição de Tráfego</Label>
                <Button variant="outline" size="sm" onClick={distributeEqually}>
                  Distribuir Igualmente
                </Button>
              </div>
              <div className="space-y-4">
                {selectedCampaigns.map(id => {
                  const campaign = campaigns.find(c => c.id === id);
                  return (
                    <div key={id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{campaign?.name}</span>
                        <span className="font-medium">{distribution[id] || 0}%</span>
                      </div>
                      <Slider
                        value={[distribution[id] || 0]}
                        onValueChange={([value]) => updateDistribution(id, value)}
                        max={100}
                        step={1}
                      />
                    </div>
                  );
                })}
                <div className="text-sm text-muted-foreground text-right">
                  Total: {getTotalPercentage().toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label>Critérios de Conclusão</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox checked={useDays} onCheckedChange={(checked) => setUseDays(checked === true)} />
                <Label className="font-normal">Finalizar após</Label>
                <Input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value) || 30)}
                  disabled={!useDays}
                  className="w-20"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">dias</span>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox checked={useLeads} onCheckedChange={(checked) => setUseLeads(checked === true)} />
                <Label className="font-normal">Finalizar após</Label>
                <Input
                  type="number"
                  value={leads}
                  onChange={(e) => setLeads(parseInt(e.target.value) || 100)}
                  disabled={!useLeads}
                  className="w-20"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">leads</span>
              </div>

              {(useDays || useLeads) && (useDays && useLeads) && (
                <RadioGroup value={criteriaMode} onValueChange={(value: 'first' | 'both') => setCriteriaMode(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="first" id="first" />
                    <Label htmlFor="first" className="font-normal">Primeiro critério atingido</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both" className="font-normal">Ambos critérios devem ser atingidos</Label>
                  </div>
                </RadioGroup>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Teste A/B
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
