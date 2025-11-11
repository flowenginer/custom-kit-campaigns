export interface WorkflowStep {
  id: string;
  label: string;
  order: number;
  enabled: boolean;
  is_custom?: boolean;
  description?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  workflow_config: WorkflowStep[];
  created_at?: string;
  updated_at?: string;
}
