-- Add workflow_template_id to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN workflow_template_id UUID REFERENCES public.workflow_templates(id);

-- Create index for better query performance
CREATE INDEX idx_campaigns_workflow_template 
ON public.campaigns(workflow_template_id);

-- Create a default workflow template from existing workflow_config
INSERT INTO public.workflow_templates (name, description, workflow_config)
VALUES (
  'Workflow Padrão',
  'Workflow padrão migrado das campanhas existentes',
  '[{"id": "initial_data", "label": "Dados Iniciais", "order": 0, "enabled": true, "is_custom": false}, {"id": "select_model", "label": "Selecionar Modelo", "order": 1, "enabled": true, "is_custom": false}, {"id": "customize_front", "label": "Personalizar Frente", "order": 2, "enabled": true, "is_custom": false}, {"id": "customize_back", "label": "Personalizar Costas", "order": 3, "enabled": true, "is_custom": false}, {"id": "sleeve_right", "label": "Manga Direita", "order": 4, "enabled": true, "is_custom": false}, {"id": "sleeve_left", "label": "Manga Esquerda", "order": 5, "enabled": true, "is_custom": false}, {"id": "review", "label": "Revisão e Envio", "order": 6, "enabled": true, "is_custom": false}]'::jsonb
);

-- Link all existing campaigns to the default workflow
UPDATE public.campaigns 
SET workflow_template_id = (
  SELECT id FROM public.workflow_templates 
  WHERE name = 'Workflow Padrão' 
  LIMIT 1
);

-- Make workflow_template_id required for future campaigns
ALTER TABLE public.campaigns 
ALTER COLUMN workflow_template_id SET NOT NULL;

-- Remove workflow_config column (campaigns now always use templates)
ALTER TABLE public.campaigns 
DROP COLUMN workflow_config;