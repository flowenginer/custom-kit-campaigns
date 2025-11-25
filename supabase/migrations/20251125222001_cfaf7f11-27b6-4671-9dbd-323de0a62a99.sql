-- Add deleted_at column to workflow_templates table
ALTER TABLE public.workflow_templates 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance when filtering non-deleted workflows
CREATE INDEX idx_workflow_templates_deleted_at ON public.workflow_templates(deleted_at) 
WHERE deleted_at IS NULL;