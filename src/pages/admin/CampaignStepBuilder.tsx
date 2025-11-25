import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Save, ArrowLeft, Eye, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { WorkflowStep } from "@/types/workflow";
import { PageLayout, PageComponent } from "@/types/page-builder";
import { PropertyPanel } from "@/components/page-builder/PropertyPanel";
import { VisualPageRenderer } from "@/components/page-builder/VisualPageRenderer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CampaignStepBuilder = () => {
  const { campaignId, stepId } = useParams<{ campaignId: string; stepId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [campaign, setCampaign] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<WorkflowStep | null>(null);
  const [layout, setLayout] = useState<PageLayout>({
    components: [],
    backgroundColor: "#ffffff",
    containerWidth: "800px",
    padding: "2rem",
  });
  const [selectedComponent, setSelectedComponent] = useState<PageComponent | null>(null);

  useEffect(() => {
    if (campaignId && stepId) {
      fetchCampaignAndStep();
    }
  }, [campaignId, stepId]);

  const fetchCampaignAndStep = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (error) throw error;

      setCampaign(data);
      const workflowConfig = data.workflow_config as unknown as WorkflowStep[];
      const step = workflowConfig.find((s) => s.id === stepId);

      if (step) {
        setCurrentStep(step);
        if (step.page_layout) {
          setLayout(step.page_layout as PageLayout);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar campanha:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!campaign || !currentStep) return;

    setSaving(true);
    try {
      const workflowConfig = campaign.workflow_config as unknown as WorkflowStep[];
      const updatedConfig = workflowConfig.map((step) =>
        step.id === stepId ? { ...step, page_layout: layout as any } : step
      );

      const { error } = await supabase
        .from("campaigns")
        .update({ workflow_config: updatedConfig as any })
        .eq("id", campaignId);

      if (error) throw error;

      toast.success("Layout salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar layout");
    } finally {
      setSaving(false);
    }
  };

  const addComponent = (type: string) => {
    let newComponent: Partial<PageComponent> = {
      id: `${type}-${Date.now()}`,
      type: type as any,
      order: layout.components.length,
    };

    // Configurações padrão por tipo
    switch (type) {
      case 'heading':
        newComponent = {
          ...newComponent,
          type: 'heading',
          content: 'Novo Título',
          level: 2,
          align: 'left',
        };
        break;
      case 'text':
        newComponent = {
          ...newComponent,
          type: 'text',
          content: 'Novo texto',
          align: 'left',
        };
        break;
      case 'image':
        newComponent = {
          ...newComponent,
          type: 'image',
          src: 'https://via.placeholder.com/400x300',
          alt: 'Imagem',
          align: 'center',
        };
        break;
      case 'button':
        newComponent = {
          ...newComponent,
          type: 'button',
          text: 'Botão',
          variant: 'default',
          size: 'default',
          align: 'center',
        };
        break;
      case 'form_field':
        newComponent = {
          ...newComponent,
          type: 'form_field',
          fieldType: 'text',
          label: 'Campo',
          dataKey: 'field',
        };
        break;
      case 'spacer':
        newComponent = {
          ...newComponent,
          type: 'spacer',
          height: '40px',
        };
        break;
      case 'divider':
        newComponent = {
          ...newComponent,
          type: 'divider',
          color: '#e5e7eb',
          thickness: '1px',
        };
        break;
    }

    setLayout({
      ...layout,
      components: [...layout.components, newComponent] as PageComponent[],
    });
    setSelectedComponent(newComponent as any);
  };

  const handleUpdateComponent = (updates: Partial<PageComponent>) => {
    if (!selectedComponent) return;

    const updatedComponents = layout.components.map((c) =>
      c.id === selectedComponent.id ? { ...c, ...updates } : c
    ) as PageComponent[];

    setLayout({ ...layout, components: updatedComponents });
    setSelectedComponent({ ...selectedComponent, ...updates } as any);
  };

  const handleDeleteComponent = () => {
    if (!selectedComponent) return;

    const filtered = layout.components.filter((c) => c.id !== selectedComponent.id);
    setLayout({ ...layout, components: filtered });
    setSelectedComponent(null);
  };

  const handleDuplicateComponent = () => {
    if (!selectedComponent) return;

    const duplicate = {
      ...selectedComponent,
      id: `${selectedComponent.type}-${Date.now()}`,
      order: layout.components.length,
    };

    setLayout({
      ...layout,
      components: [...layout.components, duplicate],
    });
    setSelectedComponent(duplicate);
  };

  const handleMoveUp = () => {
    if (!selectedComponent) return;

    const index = layout.components.findIndex((c) => c.id === selectedComponent.id);
    if (index <= 0) return;

    const newComponents = [...layout.components];
    [newComponents[index - 1], newComponents[index]] = [
      newComponents[index],
      newComponents[index - 1],
    ];

    newComponents.forEach((c, i) => {
      c.order = i;
    });

    setLayout({ ...layout, components: newComponents });
  };

  const handleMoveDown = () => {
    if (!selectedComponent) return;

    const index = layout.components.findIndex((c) => c.id === selectedComponent.id);
    if (index >= layout.components.length - 1) return;

    const newComponents = [...layout.components];
    [newComponents[index], newComponents[index + 1]] = [
      newComponents[index + 1],
      newComponents[index],
    ];

    newComponents.forEach((c, i) => {
      c.order = i;
    });

    setLayout({ ...layout, components: newComponents });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentStep) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-6">
          <p>Etapa não encontrada</p>
          <Button onClick={() => navigate("/admin/campaign-pages")} className="mt-4">
            Voltar
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/campaign-pages")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold">{campaign?.name}</h1>
              <p className="text-sm text-muted-foreground">
                Editando: {currentStep.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreview(!preview)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {preview ? "Editar" : "Visualizar"}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </div>

      {/* Editor */}
      {preview ? (
        <div className="container mx-auto p-6">
          <VisualPageRenderer
            layout={layout}
            selectedComponentId={null}
            onSelectComponent={() => {}}
          />
        </div>
      ) : (
        <div className="flex">
          {/* Sidebar - Adicionar Componentes */}
          <div className="w-64 border-r bg-card overflow-auto p-4 space-y-2">
            <h3 className="font-bold mb-4">Adicionar Componente</h3>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addComponent('heading')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Título
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addComponent('text')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Texto
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addComponent('image')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Imagem
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addComponent('button')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Botão
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addComponent('form_field')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Campo de Formulário
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addComponent('spacer')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Espaçador
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addComponent('divider')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Divisor
            </Button>
          </div>

          {/* Canvas Central */}
          <div className="flex-1 p-6">
            <Card className="p-6">
              <VisualPageRenderer
                layout={layout}
                onSelectComponent={(id) => {
                  const comp = layout.components.find((c) => c.id === id);
                  setSelectedComponent(comp || null);
                }}
                selectedComponentId={selectedComponent?.id || null}
              />
            </Card>
          </div>

          {/* Painel de Propriedades */}
          <div className="w-80 border-l bg-card overflow-auto">
            <PropertyPanel
              component={selectedComponent}
              onUpdate={handleUpdateComponent}
              onDelete={handleDeleteComponent}
              onDuplicate={handleDuplicateComponent}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignStepBuilder;
