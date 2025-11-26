-- Criar tabela para configurações padrão de visibilidade Kanban por papel
CREATE TABLE IF NOT EXISTS public.role_kanban_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role UNIQUE NOT NULL,
  allowed_columns TEXT[] NOT NULL DEFAULT ARRAY['pending', 'in_progress', 'awaiting_approval', 'changes_requested', 'approved', 'completed'],
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.role_kanban_defaults ENABLE ROW LEVEL SECURITY;

-- Policies: Admins podem gerenciar
CREATE POLICY "Admins podem ler configurações Kanban"
ON public.role_kanban_defaults
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins podem inserir configurações Kanban"
ON public.role_kanban_defaults
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar configurações Kanban"
ON public.role_kanban_defaults
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

-- Inserir padrões iniciais
INSERT INTO public.role_kanban_defaults (role, allowed_columns) VALUES
  ('designer', ARRAY['pending', 'in_progress', 'awaiting_approval', 'changes_requested', 'approved', 'completed']),
  ('salesperson', ARRAY['awaiting_approval', 'changes_requested', 'approved']),
  ('admin', ARRAY['pending', 'in_progress', 'awaiting_approval', 'changes_requested', 'approved', 'completed']),
  ('super_admin', ARRAY['pending', 'in_progress', 'awaiting_approval', 'changes_requested', 'approved', 'completed']);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_role_kanban_defaults_updated_at
  BEFORE UPDATE ON public.role_kanban_defaults
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();