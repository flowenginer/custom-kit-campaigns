import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WorkflowCard } from "@/components/workflow/WorkflowCard";
import { WorkflowEditorDialog } from "@/components/workflow/WorkflowEditorDialog";
import { ApplyWorkflowDialog } from "@/components/workflow/ApplyWorkflowDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  created_at: string;
  updated_at: string;
}

export default function Workflows() {
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [workflowToApply, setWorkflowToApply] = useState<WorkflowTemplate | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("workflow_templates")
      .select("*")
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

    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id")
      .eq("workflow_template_id", workflowToDelete);

    if (campaigns && campaigns.length > 0) {
      toast.error(`Este workflow está sendo usado por ${campaigns.length} campanha(s)`);
      setWorkflowToDelete(null);
      return;
    }

    const { error } = await supabase
      .from("workflow_templates")
      .delete()
      .eq("id", workflowToDelete);

    if (error) {
      toast.error("Erro ao deletar workflow");
      console.error(error);
    } else {
      toast.success("Workflow deletado!");
      loadWorkflows();
    }
    setWorkflowToDelete(null);
  };

  return (
    <>
      <AdminLayout />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Workflows</h1>
            <p className="text-muted-foreground">Gerencie os workflows das suas campanhas</p>
          </div>
          <Button onClick={handleNewWorkflow}>
            <Plus className="w-4 h-4" />
            Novo Workflow
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
          <div className="grid gap-4">
            {workflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onEdit={handleEditWorkflow}
                onDuplicate={handleDuplicateWorkflow}
                onDelete={handleDeleteWorkflow}
                onApplyToCampaign={handleApplyToCampaign}
              />
            ))}
          </div>
        )}
      </div>

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
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este workflow? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteWorkflow}>Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
