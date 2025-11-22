import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus, Paintbrush } from "lucide-react";
import { AddStepDialog } from "./AddStepDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { WorkflowStep } from "@/types/workflow";

interface WorkflowEditorDialogProps {
  workflowId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

const SortableItem = ({ 
  step, 
  onToggle, 
  onRemove, 
  onEditLayout,
  workflowId 
}: { 
  step: WorkflowStep; 
  onToggle: () => void; 
  onRemove: () => void;
  onEditLayout: () => void;
  workflowId: string | null;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-card border rounded-lg">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </button>
      
      <div className="flex-1">
        <p className="font-medium">{step.label}</p>
        {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
        {step.is_custom && <span className="text-xs text-primary">Personalizada</span>}
        {step.page_layout && <span className="text-xs text-green-600 ml-2">✓ Layout personalizado</span>}
      </div>

      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onEditLayout}
        disabled={!workflowId}
        title="Editar Layout da Página"
      >
        <Paintbrush className="w-4 h-4 text-primary" />
      </Button>

      <Switch checked={step.enabled} onCheckedChange={onToggle} />
      
      {step.is_custom && (
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      )}
    </div>
  );
};

export const WorkflowEditorDialog = ({ workflowId, open, onOpenChange, onSave }: WorkflowEditorDialogProps) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddStep, setShowAddStep] = useState(false);
  const [stepToDelete, setStepToDelete] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (open && workflowId) {
      loadWorkflow();
    } else if (open && !workflowId) {
      // Novo workflow com etapas padrão
      setName("");
      setDescription("");
      setSteps([
        { id: "select_type", label: "Tipo de Uniforme", order: 0, enabled: true, is_custom: false },
        { id: "enter_name", label: "Informar Nome", order: 1, enabled: true, is_custom: false },
        { id: "enter_phone", label: "Informar WhatsApp", order: 2, enabled: true, is_custom: false },
        { id: "select_quantity", label: "Selecionar Quantidade", order: 3, enabled: true, is_custom: false },
        { id: "choose_model", label: "Escolher Modelo", order: 4, enabled: true, is_custom: false },
        { id: "customize_front", label: "Personalizar Frente", order: 5, enabled: true, is_custom: false },
        { id: "customize_back", label: "Personalizar Costas", order: 6, enabled: true, is_custom: false },
        { id: "customize_sleeves_left", label: "Personalizar Manga Esquerda", order: 7, enabled: true, is_custom: false },
        { id: "customize_sleeves_right", label: "Personalizar Manga Direita", order: 8, enabled: true, is_custom: false },
        { id: "upload_logos", label: "Carregar Logotipos", order: 9, enabled: true, is_custom: false },
        { id: "review", label: "Revisão e Envio", order: 10, enabled: true, is_custom: false },
      ]);
    }
  }, [open, workflowId]);

  const loadWorkflow = async () => {
    if (!workflowId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("workflow_templates")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (error) {
      toast.error("Erro ao carregar workflow");
      console.error(error);
    } else if (data) {
      setName(data.name);
      setDescription(data.description || "");
      setSteps(data.workflow_config as unknown as WorkflowStep[]);
    }
    setLoading(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, order: index }));
      });
    }
  };

  const handleToggleStep = (stepId: string) => {
    setSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, enabled: !step.enabled } : step)));
  };

  const handleRemoveStep = (stepId: string) => {
    setStepToDelete(stepId);
  };

  const confirmRemoveStep = () => {
    if (stepToDelete) {
      setSteps((prev) => prev.filter((step) => step.id !== stepToDelete).map((step, index) => ({ ...step, order: index })));
      setStepToDelete(null);
    }
  };

  const handleAddStep = (newStep: Omit<WorkflowStep, "order">, position: number) => {
    const stepWithOrder = { ...newStep, order: position };
    setSteps((prev) => {
      const updated = [...prev];
      updated.splice(position, 0, stepWithOrder);
      return updated.map((step, index) => ({ ...step, order: index }));
    });
    setShowAddStep(false);
  };

  const handleEditLayout = (stepId: string) => {
    if (!workflowId) {
      toast.error("Salve o workflow primeiro antes de editar o layout");
      return;
    }
    navigate(`/admin/workflows/${workflowId}/step/${stepId}/builder`);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome do workflow é obrigatório");
      return;
    }

    setLoading(true);

    const workflowData = {
      name: name.trim(),
      description: description.trim() || null,
      workflow_config: steps as any,
    };

    let error;
    if (workflowId) {
      ({ error } = await supabase.from("workflow_templates").update(workflowData).eq("id", workflowId));
    } else {
      ({ error } = await supabase.from("workflow_templates").insert([workflowData]));
    }

    if (error) {
      toast.error("Erro ao salvar workflow");
      console.error(error);
    } else {
      toast.success(workflowId ? "Workflow atualizado!" : "Workflow criado!");
      onSave();
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{workflowId ? "Editar Workflow" : "Novo Workflow"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome*</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Workflow Completo" />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do workflow..." rows={2} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Etapas do Workflow</Label>
                <Button variant="outline" size="sm" onClick={() => setShowAddStep(true)}>
                  <Plus className="w-4 h-4" />
                  Adicionar Etapa
                </Button>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {steps.map((step) => (
                      <SortableItem 
                        key={step.id} 
                        step={step} 
                        onToggle={() => handleToggleStep(step.id)} 
                        onRemove={() => handleRemoveStep(step.id)} 
                        onEditLayout={() => handleEditLayout(step.id)}
                        workflowId={workflowId}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Salvando..." : "Salvar Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddStepDialog open={showAddStep} onOpenChange={setShowAddStep} onAdd={handleAddStep} currentStepsCount={steps.length} />

      <AlertDialog open={!!stepToDelete} onOpenChange={() => setStepToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja remover esta etapa?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveStep}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
