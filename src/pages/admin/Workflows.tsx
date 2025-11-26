import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, LayoutGrid, Columns2, Square, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { WorkflowCard } from "@/components/workflow/WorkflowCard";
import { WorkflowEditorDialog } from "@/components/workflow/WorkflowEditorDialog";
import { ApplyWorkflowDialog } from "@/components/workflow/ApplyWorkflowDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { WorkflowTemplate, WorkflowStep } from "@/types/workflow";
import { useUserRole } from "@/hooks/useUserRole";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { RefreshIndicator } from "@/components/dashboard/RefreshIndicator";

export default function Workflows() {
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [workflowToApply, setWorkflowToApply] = useState<WorkflowTemplate | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);
  const [viewColumns, setViewColumns] = useState<1 | 2 | 3>(() => {
    const saved = localStorage.getItem('workflows-view-columns');
    return saved ? (Number(saved) as 1 | 2 | 3) : 3;
  });
  const { isSuperAdmin } = useUserRole();

  const refreshData = useCallback(async () => {
    await loadWorkflows();
  }, []);

  const { lastUpdated, isRefreshing, refresh } = useAutoRefresh(
    refreshData,
    { interval: 60000, enabled: true }
  );

  useEffect(() => {
    loadWorkflows();
  }, []);

  useEffect(() => {
    localStorage.setItem('workflows-view-columns', String(viewColumns));
  }, [viewColumns]);

  const loadWorkflows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("workflow_templates")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar workflows");
      console.error(error);
    } else {
      setWorkflows((data || []).map(w => ({
        ...w,
        workflow_config: w.workflow_config as any as WorkflowStep[]
      })));
    }
    setLoading(false);
  };

  const handleNewWorkflow = () => {
    setSelectedWorkflowId(null);
    setShowEditor(true);
  };

  const handleEditWorkflow = (id: string) => {
    setSelectedWorkflowId(id);
    setShowEditor(true);
  };

  const handleDuplicateWorkflow = async (id: string) => {
    const workflow = workflows.find((w) => w.id === id);
    if (!workflow) return;

    const { error } = await supabase.from("workflow_templates").insert([
      {
        name: `${workflow.name} (Cópia)`,
        description: workflow.description,
        workflow_config: workflow.workflow_config as any,
      },
    ]);

    if (error) {
      toast.error("Erro ao duplicar workflow");
      console.error(error);
    } else {
      toast.success("Workflow duplicado!");
      loadWorkflows();
    }
  };

  const handleApplyToCampaign = (id: string) => {
    const workflow = workflows.find((w) => w.id === id);
    if (workflow) {
      setWorkflowToApply(workflow);
      setShowApply(true);
    }
  };

  const handleDeleteWorkflow = (id: string) => {
    setWorkflowToDelete(id);
  };

  const confirmDeleteWorkflow = async () => {
    if (!workflowToDelete) return;

    const { error } = await supabase
      .from("workflow_templates")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", workflowToDelete);

    if (error) {
      toast.error("Erro ao arquivar workflow");
      console.error(error);
    } else {
      toast.success("Workflow arquivado!");
      loadWorkflows();
    }
    setWorkflowToDelete(null);
  };

  const handleSelectAll = () => {
    if (selectedWorkflows.length === workflows.length) {
      setSelectedWorkflows([]);
    } else {
      setSelectedWorkflows(workflows.map(w => w.id));
    }
  };

  const handleSelectWorkflow = (workflowId: string) => {
    setSelectedWorkflows(prev => 
      prev.includes(workflowId) 
        ? prev.filter(id => id !== workflowId)
        : [...prev, workflowId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedWorkflows.length === 0) return;
    
    if (!confirm(`Tem certeza que deseja arquivar ${selectedWorkflows.length} workflow(s) selecionado(s)?`)) {
      return;
    }

    const { error } = await supabase
      .from("workflow_templates")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", selectedWorkflows);

    if (error) {
      toast.error("Erro ao arquivar workflows");
      console.error(error);
    } else {
      toast.success(`${selectedWorkflows.length} workflow(s) arquivado(s)!`);
      setSelectedWorkflows([]);
      loadWorkflows();
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground">Gerencie os workflows das suas campanhas</p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshIndicator 
            lastUpdated={lastUpdated}
            isRefreshing={isRefreshing}
            onRefresh={refresh}
          />
          
          <ToggleGroup 
            type="single" 
            value={String(viewColumns)} 
            onValueChange={(v) => v && setViewColumns(Number(v) as 1 | 2 | 3)}
          >
            <ToggleGroupItem value="1" aria-label="1 coluna">
              <Square className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="2" aria-label="2 colunas">
              <Columns2 className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="3" aria-label="3 colunas">
              <LayoutGrid className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          
          <Button onClick={handleNewWorkflow}>
            <Plus className="w-4 h-4" />
            Novo Workflow
          </Button>
        </div>
      </div>

      {isSuperAdmin && workflows.length > 0 && (
        <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={selectedWorkflows.length === workflows.length}
              onCheckedChange={handleSelectAll}
            />
            <Label htmlFor="select-all" className="cursor-pointer">
              Selecionar todos ({workflows.length})
            </Label>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={selectedWorkflows.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Arquivar Selecionados ({selectedWorkflows.length})
          </Button>
        </div>
      )}

      {loading ? (
        <div className={`grid gap-4 ${
          viewColumns === 1 ? "grid-cols-1" :
          viewColumns === 2 ? "grid-cols-1 md:grid-cols-2" :
          "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        }`}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 flex-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">Nenhum workflow criado ainda</p>
          <Button onClick={handleNewWorkflow}>
            <Plus className="w-4 h-4" />
            Criar Primeiro Workflow
          </Button>
        </div>
      ) : (
        <div className={`grid gap-4 ${
          viewColumns === 1 ? "grid-cols-1" :
          viewColumns === 2 ? "grid-cols-1 md:grid-cols-2" :
          "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        }`}>
          {workflows.map((workflow) => (
            <div key={workflow.id} className="relative">
              {isSuperAdmin && (
                <div className="absolute top-4 left-4 z-10">
                  <Checkbox
                    checked={selectedWorkflows.includes(workflow.id)}
                    onCheckedChange={() => handleSelectWorkflow(workflow.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
              <WorkflowCard
                workflow={workflow}
                onEdit={handleEditWorkflow}
                onDuplicate={handleDuplicateWorkflow}
                onDelete={handleDeleteWorkflow}
                onApplyToCampaign={handleApplyToCampaign}
              />
            </div>
          ))}
        </div>
      )}

      <WorkflowEditorDialog
        workflowId={selectedWorkflowId}
        open={showEditor}
        onOpenChange={setShowEditor}
        onSave={loadWorkflows}
      />

      <ApplyWorkflowDialog
        workflow={workflowToApply}
        open={showApply}
        onOpenChange={setShowApply}
        onApply={loadWorkflows}
      />

      <AlertDialog open={!!workflowToDelete} onOpenChange={() => setWorkflowToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar arquivamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja arquivar este workflow? Ele não aparecerá mais na listagem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteWorkflow}>Arquivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
