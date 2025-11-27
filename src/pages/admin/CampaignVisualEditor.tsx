import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VisualOverrides } from "@/hooks/useCampaignVisualOverrides";
import { CampaignPreviewInteractive } from "@/components/campaign/CampaignPreviewInteractive";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye } from "lucide-react";

const STEP_OPTIONS = [
  { value: "global", label: "🌐 Global (Logo, Cores)" },
  { value: "select_type", label: "👕 Escolher Tipo" },
  { value: "enter_name", label: "✏️ Digitar Nome" },
  { value: "enter_phone", label: "📱 Digitar Telefone" },
  { value: "select_quantity", label: "🔢 Escolher Quantidade" },
  { value: "choose_model", label: "🎨 Escolher Modelo" },
  { value: "review", label: "✅ Revisar Pedido" },
];

export default function CampaignVisualEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedStep, setSelectedStep] = useState("global");
  const [localOverrides, setLocalOverrides] = useState<VisualOverrides>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { data: campaign } = useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: overrides, isLoading } = useQuery({
    queryKey: ["campaign-visual-overrides", id, selectedStep],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_visual_overrides")
        .select("overrides")
        .eq("campaign_id", id!)
        .eq("step_id", selectedStep)
        .maybeSingle();

      if (error) throw error;
      const result = (data?.overrides as VisualOverrides) || {};
      setLocalOverrides(result);
      setHasUnsavedChanges(false);
      return result;
    },
  });

  // Auto-save draft to localStorage for preview
  useEffect(() => {
    if (campaign && Object.keys(localOverrides).length > 0) {
      const draftKey = `visual_draft_${id}_${selectedStep}`;
      localStorage.setItem(draftKey, JSON.stringify(localOverrides));
      setHasUnsavedChanges(true);
    }
  }, [localOverrides, id, selectedStep, campaign]);

  const saveMutation = useMutation({
    mutationFn: async (overrides: VisualOverrides) => {
      const { error } = await supabase
        .from("campaign_visual_overrides")
        .upsert({
          campaign_id: id!,
          step_id: selectedStep,
          overrides: overrides as any,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      // Clear draft from localStorage
      const draftKey = `visual_draft_${id}_${selectedStep}`;
      localStorage.removeItem(draftKey);
      
      queryClient.invalidateQueries({ queryKey: ["campaign-visual-overrides"] });
      setHasUnsavedChanges(false);
      toast.success("Alterações salvas com sucesso!");
    },
    onError: (error) => {
      console.error("Error saving overrides:", error);
      toast.error("Erro ao salvar alterações");
    },
  });

  const handleSave = () => {
    saveMutation.mutate(localOverrides);
  };

  const handlePreview = () => {
    if (campaign) {
      window.open(`/campaign/${campaign.unique_link}`, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin/campaigns")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Editor Visual</h1>
                <p className="text-sm text-muted-foreground">
                  {campaign?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
              >
                <Eye className="h-4 w-4 mr-2" />
                Abrir em Nova Aba
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !hasUnsavedChanges}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6">
          {/* Section Selector */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium whitespace-nowrap">Seção:</label>
                <Select value={selectedStep} onValueChange={setSelectedStep}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STEP_OPTIONS.map((step) => (
                      <SelectItem key={step.value} value={step.value}>
                        {step.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Preview */}
          {!isLoading && campaign && (
            <CampaignPreviewInteractive
              stepId={selectedStep}
              overrides={localOverrides}
              onChange={setLocalOverrides}
              campaign={campaign}
            />
          )}

          {/* Instructions */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Como Usar o Editor</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Selecione uma seção no dropdown acima</li>
                <li>Clique em qualquer elemento com borda pontilhada para editá-lo</li>
                <li>Para textos: digite o novo conteúdo e clique em "Aplicar"</li>
                <li>Para imagens: cole uma URL ou faça upload de um arquivo</li>
                <li>Para cores: use o color picker ou digite o código hexadecimal</li>
                <li>Clique em "Salvar" no topo para persistir as alterações</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
