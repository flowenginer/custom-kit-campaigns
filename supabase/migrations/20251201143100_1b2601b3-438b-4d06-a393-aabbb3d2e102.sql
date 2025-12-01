-- Criar tabela para múltiplos layouts por task
CREATE TABLE public.design_task_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  layout_number INTEGER NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id),
  campaign_name TEXT,
  uniform_type TEXT,
  model_id UUID REFERENCES public.shirt_models(id),
  model_name TEXT,
  customization_data JSONB DEFAULT '{}'::jsonb,
  design_files JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  current_version INTEGER DEFAULT 1,
  client_approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(task_id, layout_number)
);

-- Habilitar RLS
ALTER TABLE public.design_task_layouts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (mesmas permissões que design_tasks)
CREATE POLICY "Authenticated users can view design task layouts"
  ON public.design_task_layouts
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert design task layouts"
  ON public.design_task_layouts
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update design task layouts"
  ON public.design_task_layouts
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Super admins full access to design_task_layouts"
  ON public.design_task_layouts
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Índices para performance
CREATE INDEX idx_design_task_layouts_task_id ON public.design_task_layouts(task_id);
CREATE INDEX idx_design_task_layouts_status ON public.design_task_layouts(status);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_design_task_layouts_updated_at
  BEFORE UPDATE ON public.design_task_layouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();