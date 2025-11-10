import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, GripVertical, Save } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Database } from "@/integrations/supabase/types";

interface WorkflowStep {
  id: string;
  label: string;
  order: number;
}

interface Campaign {
  id: string;
  name: string;
  workflow_config: Database['public']['Tables']['campaigns']['Row']['workflow_config'];
}

// Componente para item sortable
function SortableItem({ step, index }: { step: WorkflowStep; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-card border rounded-lg ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold">
          {index + 1}
        </div>
        <span className="font-medium">{step.label}</span>
      </div>
    </div>
  );
}

const Workflows = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaignId) {
      loadWorkflowForCampaign(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, workflow_config")
        .order("name");

      if (error) throw error;
      setCampaigns(data || []);
      
      if (data && data.length > 0) {
        setSelectedCampaignId(data[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar campanhas:", error);
      toast.error("Erro ao carregar campanhas");
    } finally {
      setIsLoading(false);
    }
  };

  const loadWorkflowForCampaign = (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (campaign && campaign.workflow_config) {
      // Parse workflow_config como array de WorkflowStep
      const config = campaign.workflow_config as unknown as WorkflowStep[];
      // Ordenar por order
      const sortedSteps = [...config].sort((a, b) => a.order - b.order);
      setWorkflowSteps(sortedSteps);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setWorkflowSteps((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      
      // Atualizar orders
      return newItems.map((item, index) => ({
        ...item,
        order: index
      }));
    });
  };

  const handleSaveWorkflow = async () => {
    if (!selectedCampaignId) {
      toast.error("Selecione uma campanha");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ workflow_config: workflowSteps as any })
        .eq("id", selectedCampaignId);

      if (error) throw error;

      toast.success("Workflow atualizado com sucesso!");
      
      // Atualizar lista de campanhas
      await loadCampaigns();
    } catch (error) {
      console.error("Erro ao salvar workflow:", error);
      toast.error("Erro ao salvar workflow");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuração de Workflow</h1>
        <p className="text-muted-foreground mt-1">
          Configure a ordem das etapas do funil para cada campanha
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Campanha</CardTitle>
          <CardDescription>
            Escolha a campanha para configurar o fluxo de etapas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Campanha</Label>
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
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
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedCampaignId && workflowSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ordem das Etapas</CardTitle>
            <CardDescription>
              Arraste e solte para reordenar as etapas do funil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={workflowSteps.map((step) => step.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {workflowSteps.map((step, index) => (
                    <SortableItem key={step.id} step={step} index={index} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveWorkflow} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Workflow
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {campaigns.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="text-5xl">📋</div>
              <p className="font-semibold text-lg">Nenhuma campanha encontrada</p>
              <p className="text-sm max-w-md text-center">
                Crie uma campanha primeiro para poder configurar o workflow.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/admin/campaigns'}
                className="mt-2"
              >
                Ir para Campanhas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Workflows;
