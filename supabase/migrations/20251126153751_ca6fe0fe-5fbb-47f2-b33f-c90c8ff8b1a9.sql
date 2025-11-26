-- Criar tabela de solicitações de alteração
CREATE TABLE IF NOT EXISTS public.change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_change_requests_task_id ON public.change_requests(task_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_resolved ON public.change_requests(task_id, resolved_at);

-- Habilitar RLS
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;

-- Policies para change_requests
CREATE POLICY "Authenticated users can view change requests"
  ON public.change_requests
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert change requests"
  ON public.change_requests
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

CREATE POLICY "Authenticated users can update change requests"
  ON public.change_requests
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Super admins full access to change_requests"
  ON public.change_requests
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));