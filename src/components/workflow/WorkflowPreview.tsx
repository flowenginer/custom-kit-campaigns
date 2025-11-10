import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";

interface WorkflowStep {
  id: string;
  label: string;
  order: number;
  enabled: boolean;
  is_custom: boolean;
  description?: string;
}

interface WorkflowPreviewProps {
  steps: WorkflowStep[];
}

export function WorkflowPreview({ steps }: WorkflowPreviewProps) {
  const activeSteps = steps.filter(step => step.enabled).sort((a, b) => a.order - b.order);
  
  // Gerar diagrama Mermaid
  const generateMermaidDiagram = () => {
    if (activeSteps.length === 0) return "";
    
    let diagram = "graph LR\n";
    activeSteps.forEach((step, index) => {
      const nodeId = `S${index}`;
      const label = `${index + 1}. ${step.label}`;
      diagram += `    ${nodeId}["${label}"]\n`;
      
      if (index < activeSteps.length - 1) {
        const nextNodeId = `S${index + 1}`;
        diagram += `    ${nodeId} --> ${nextNodeId}\n`;
      }
    });
    
    return diagram;
  };

  const mermaidCode = generateMermaidDiagram();

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
          <div className="bg-muted/30 p-6 rounded-lg">
            <div dangerouslySetInnerHTML={{ 
              __html: `<lov-mermaid>\n${mermaidCode}\n</lov-mermaid>` 
            }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}