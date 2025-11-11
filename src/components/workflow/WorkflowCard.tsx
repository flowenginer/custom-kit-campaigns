import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Copy, CheckCircle, Trash2 } from "lucide-react";
import { WorkflowPreview } from "./WorkflowPreview";
import { WorkflowTemplate } from "@/types/workflow";

interface WorkflowCardProps {
  workflow: WorkflowTemplate;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onApplyToCampaign: (id: string) => void;
}

export const WorkflowCard = ({
  workflow,
  onEdit,
  onDuplicate,
  onDelete,
  onApplyToCampaign,
}: WorkflowCardProps) => {
  const activeSteps = workflow.workflow_config.filter((step) => step.enabled).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{workflow.name}</CardTitle>
        <CardDescription>
          {workflow.description || "Sem descrição"} • {activeSteps} etapas ativas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border rounded-lg p-4 bg-muted/30">
          <WorkflowPreview steps={workflow.workflow_config} compact />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="default" size="sm" onClick={() => onEdit(workflow.id)}>
            <Edit className="w-4 h-4" />
            Editar
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDuplicate(workflow.id)}>
            <Copy className="w-4 h-4" />
            Duplicar
          </Button>
          <Button variant="outline" size="sm" onClick={() => onApplyToCampaign(workflow.id)}>
            <CheckCircle className="w-4 h-4" />
            Aplicar em Campanha
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(workflow.id)}>
            <Trash2 className="w-4 h-4" />
            Deletar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
