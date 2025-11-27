import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VisualOverridePanel } from "@/components/campaign/VisualOverridePanel";
import { VisualOverrides } from "@/hooks/useCampaignVisualOverrides";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye, RefreshCw } from "lucide-react";

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
  const [previewKey, setPreviewKey] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
      setPreviewKey(prev => prev + 1);
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

  const handleRefreshPreview = () => {
    setPreviewKey(prev => prev + 1);
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/admin/campaigns")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editor Visual</h1>
            <p className="text-muted-foreground">{campaign?.name}</p>
          </div>
        </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefreshPreview}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Preview
            </Button>
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Abrir em Nova Aba
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending || !hasUnsavedChanges}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Salvando..." : hasUnsavedChanges ? "Salvar Alterações" : "Salvo"}
            </Button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Seção</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedStep} onValueChange={setSelectedStep}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STEP_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {!isLoading && (
            <div className="mt-6">
              <VisualOverridePanel
                stepId={selectedStep}
                overrides={localOverrides}
                onChange={setLocalOverrides}
              />
            </div>
          )}
        </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Preview em Tempo Real</span>
                  {hasUnsavedChanges && (
                    <span className="text-xs text-muted-foreground font-normal">
                      Alterações não salvas
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative w-full" style={{ height: "calc(100vh - 300px)", minHeight: "600px" }}>
                  {campaign && (
                    <iframe
                      ref={iframeRef}
                      key={previewKey}
                      src={`/c/${campaign.unique_link}`}
                      className="w-full h-full border-0 rounded-b-lg"
                      title="Preview da Campanha"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Como Funciona</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• 🔄 O preview é atualizado automaticamente conforme você edita</p>
                <p>• 💾 Clique em "Salvar" para aplicar as mudanças permanentemente</p>
                <p>• 🌐 A seção "Global" (logo e cores) afeta todas as páginas</p>
                <p>• 🎨 Cada seção permite customizar textos, cores e imagens</p>
                <p>• ↩️ Use "Atualizar Preview" se o iframe não carregar</p>
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
