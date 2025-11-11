import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { WorkflowStep } from "@/types/workflow";

interface WorkflowPreviewProps {
  steps: WorkflowStep[];
  compact?: boolean;
}

export function WorkflowPreview({ steps, compact = false }: WorkflowPreviewProps) {
  const activeSteps = steps.filter(step => step.enabled).sort((a, b) => a.order - b.order);

  if (compact) {
    return (
      <div>
        <p className="text-sm text-muted-foreground mb-2">
          {activeSteps.length} etapas ativas
        </p>
        <div className="flex flex-wrap gap-2">
          {activeSteps.map((step, i) => (
            <Badge key={step.id} variant="outline">
              {i + 1}. {step.label}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <CardTitle>Preview do Fluxo</CardTitle>
          </div>
          <Badge variant="secondary">
            {activeSteps.length} etapas ativas
          </Badge>
        </div>
        <CardDescription>
          Visualização do fluxo de trabalho configurado
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeSteps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma etapa ativa para exibir</p>
          </div>
        ) : (
          <div className="space-y-0">
            {activeSteps.map((step, i) => (
              <div key={step.id} className="relative">
                <div className="flex items-center gap-3 p-3 bg-background border rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{step.label}</p>
                    {step.description && (
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    )}
                  </div>
                  {step.is_custom && (
                    <Badge variant="secondary" className="flex-shrink-0">Custom</Badge>
                  )}
                </div>
                {i < activeSteps.length - 1 && (
                  <div className="h-6 w-0.5 bg-border ml-7 my-1" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}