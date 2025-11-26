import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { WorkflowStep } from "@/types/workflow";

interface DuplicateWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceWorkflowId?: string;
  onDuplicate: (workflow: WorkflowStep[]) => void;
}

export function DuplicateWorkflowDialog({
  open,
  onOpenChange,
  sourceWorkflowId,
  onDuplicate,
}: DuplicateWorkflowDialogProps) {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowStep[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadWorkflows();
    }
  }, [open]);

  useEffect(() => {
    if (selectedWorkflowId) {
      const workflow = workflows.find((w) => w.id === selectedWorkflowId);
      if (workflow) {
        setSelectedWorkflow(workflow.workflow_config as WorkflowStep[]);
      }
    } else {
      setSelectedWorkflow(null);
    }
  }, [selectedWorkflowId, workflows]);

  const loadWorkflows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("workflow_templates")
      .select("id, name, workflow_config")
      .is('deleted_at', null)
      .order("name");

    if (error) {
      toast.error("Erro ao carregar workflows");
      console.error(error);
    } else {
      // Filtrar o workflow atual se fornecido
      setWorkflows(sourceWorkflowId ? (data || []).filter((w) => w.id !== sourceWorkflowId) : data || []);
    }
    setLoading(false);
  };

  const handleDuplicate = () => {
    if (!selectedWorkflow) {
      toast.error("Selecione um workflow");
      return;
    }

    onDuplicate(selectedWorkflow);
    toast.success("Workflow duplicado!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicar Workflow
          </DialogTitle>
          <DialogDescription>
            Copie a configuração de outro workflow template
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum outro workflow disponível para duplicar</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="workflow">Selecionar Workflow Origem</Label>
                <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
                  <SelectTrigger id="workflow">
                    <SelectValue placeholder="Escolha um workflow" />
                  </SelectTrigger>
                  <SelectContent>
                    {workflows.map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedWorkflow && selectedWorkflow.length > 0 && (
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
            disabled={!selectedWorkflowId || loading}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicar Workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}