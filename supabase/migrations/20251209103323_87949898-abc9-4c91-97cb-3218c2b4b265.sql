-- Tabela de colunas do Kanban
CREATE TABLE public.kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  icon TEXT,
  background_color TEXT,
  text_color TEXT DEFAULT '#ffffff',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_manual_only BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de regras para cada coluna
CREATE TABLE public.kanban_column_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  rule_order INTEGER NOT NULL DEFAULT 0,
  field_name TEXT NOT NULL,
  operator TEXT NOT NULL,
  value TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_column_rules ENABLE ROW LEVEL SECURITY;

-- Policies for kanban_columns
CREATE POLICY "Admins podem gerenciar colunas Kanban" ON public.kanban_columns
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users podem visualizar colunas" ON public.kanban_columns
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for kanban_column_rules
CREATE POLICY "Admins podem gerenciar regras" ON public.kanban_column_rules
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users podem visualizar regras" ON public.kanban_column_rules
  FOR SELECT USING (auth.role() = 'authenticated');

-- Trigger para updated_at
CREATE TRIGGER update_kanban_columns_updated_at
  BEFORE UPDATE ON public.kanban_columns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir colunas atuais
INSERT INTO public.kanban_columns (key, title, icon, background_color, sort_order, is_manual_only) VALUES
  ('logo_needed', '📤 Leads sem Logo', 'Upload', '#f97316', 1, false),
  ('cards_devolvidos', '🔴 Cards Devolvidos', 'AlertCircle', '#ef4444', 2, false),
  ('retorno_alteracao', '🟡 Retorno de Alteração', 'RotateCcw', '#eab308', 3, false),
  ('pending', '📥 Novos Com Logo', 'Inbox', NULL, 4, false),
  ('in_progress', '🎨 Em Progresso', 'Palette', NULL, 5, false),
  ('awaiting_approval', '⏳ Aguard. Aprovação', 'Clock', NULL, 6, false),
  ('changes_requested', '🔄 Revisão Necessária', 'RefreshCw', NULL, 7, false),
  ('approved', '✅ Aprovado', 'Check', NULL, 8, false),
  ('completed', '📦 Produção', 'Package', NULL, 9, false);

-- Inserir regras para cada coluna
-- Logo Needed: needs_logo = true AND logo_action = 'waiting_client'
INSERT INTO public.kanban_column_rules (column_id, rule_order, field_name, operator, value) 
SELECT id, 1, 'needs_logo', 'equals', 'true' FROM kanban_columns WHERE key = 'logo_needed';
INSERT INTO public.kanban_column_rules (column_id, rule_order, field_name, operator, value)
SELECT id, 2, 'logo_action', 'equals', 'waiting_client' FROM kanban_columns WHERE key = 'logo_needed';

-- Cards Devolvidos: salesperson_status = 'rejected_by_designer' AND returned_from_rejection != true
INSERT INTO public.kanban_column_rules (column_id, rule_order, field_name, operator, value)
SELECT id, 1, 'salesperson_status', 'equals', 'rejected_by_designer' FROM kanban_columns WHERE key = 'cards_devolvidos';
INSERT INTO public.kanban_column_rules (column_id, rule_order, field_name, operator, value)
SELECT id, 2, 'returned_from_rejection', 'not_equals', 'true' FROM kanban_columns WHERE key = 'cards_devolvidos';

-- Retorno de Alteração: returned_from_rejection = true AND salesperson_status != 'rejected_by_designer'
INSERT INTO public.kanban_column_rules (column_id, rule_order, field_name, operator, value)
SELECT id, 1, 'returned_from_rejection', 'equals', 'true' FROM kanban_columns WHERE key = 'retorno_alteracao';
INSERT INTO public.kanban_column_rules (column_id, rule_order, field_name, operator, value)
SELECT id, 2, 'salesperson_status', 'not_equals', 'rejected_by_designer' FROM kanban_columns WHERE key = 'retorno_alteracao';
INSERT INTO public.kanban_column_rules (column_id, rule_order, field_name, operator, value)
SELECT id, 3, 'status', 'equals', 'pending' FROM kanban_columns WHERE key = 'retorno_alteracao';

-- Pending: status = 'pending' (com condições negativas das colunas especiais)
INSERT INTO public.kanban_column_rules (column_id, rule_order, field_name, operator, value)
SELECT id, 1, 'status', 'equals', 'pending' FROM kanban_columns WHERE key = 'pending';

-- Outras colunas baseadas em status
INSERT INTO public.kanban_column_rules (column_id, rule_order, field_name, operator, value)
SELECT id, 1, 'status', 'equals', 'in_progress' FROM kanban_columns WHERE key = 'in_progress';

INSERT INTO public.kanban_column_rules (column_id, rule_order, field_name, operator, value)
SELECT id, 1, 'status', 'equals', 'awaiting_approval' FROM kanban_columns WHERE key = 'awaiting_approval';

INSERT INTO public.kanban_column_rules (column_id, rule_order, field_name, operator, value)
SELECT id, 1, 'status', 'equals', 'changes_requested' FROM kanban_columns WHERE key = 'changes_requested';

INSERT INTO public.kanban_column_rules (column_id, rule_order, field_name, operator, value)
SELECT id, 1, 'status', 'equals', 'approved' FROM kanban_columns WHERE key = 'approved';

INSERT INTO public.kanban_column_rules (column_id, rule_order, field_name, operator, value)
SELECT id, 1, 'status', 'equals', 'completed' FROM kanban_columns WHERE key = 'completed';

-- Atualizar role_kanban_defaults com as novas keys
UPDATE public.role_kanban_defaults 
SET allowed_columns = ARRAY['logo_needed', 'cards_devolvidos', 'retorno_alteracao', 'pending', 'in_progress', 'awaiting_approval', 'changes_requested', 'approved', 'completed']
WHERE role IN ('super_admin', 'admin');

UPDATE public.role_kanban_defaults 
SET allowed_columns = ARRAY['pending', 'in_progress', 'awaiting_approval', 'changes_requested', 'approved', 'completed']
WHERE role = 'designer';

UPDATE public.role_kanban_defaults 
SET allowed_columns = ARRAY['logo_needed', 'cards_devolvidos', 'retorno_alteracao', 'pending', 'awaiting_approval', 'approved', 'completed']
WHERE role = 'salesperson';