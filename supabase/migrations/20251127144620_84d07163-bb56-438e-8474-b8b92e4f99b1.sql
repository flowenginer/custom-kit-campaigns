-- Criar tabela role_menu_defaults para configurações padrão de menu por role
CREATE TABLE role_menu_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  allowed_menu_items TEXT[] DEFAULT ARRAY['dashboard', 'creation', 'ranking'],
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- Habilitar RLS
ALTER TABLE role_menu_defaults ENABLE ROW LEVEL SECURITY;

-- Policy para leitura (authenticated)
CREATE POLICY "Authenticated users can read menu defaults"
ON role_menu_defaults
FOR SELECT
TO authenticated
USING (true);

-- Policy para admin atualizar
CREATE POLICY "Admins podem atualizar configurações Menu"
ON role_menu_defaults
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

-- Policy para admin inserir
CREATE POLICY "Admins podem inserir configurações Menu"
ON role_menu_defaults
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- Inserir configurações padrão para cada role
INSERT INTO role_menu_defaults (role, allowed_menu_items) VALUES
  ('super_admin', ARRAY['dashboard', 'data_cross', 'ranking', 'segments', 'models', 'campaigns', 'leads', 'workflows', 'ab_tests', 'creation', 'orders', 'approvals', 'api', 'settings', 'themes']),
  ('admin', ARRAY['dashboard', 'data_cross', 'ranking', 'segments', 'models', 'campaigns', 'leads', 'workflows', 'ab_tests', 'creation', 'orders', 'approvals', 'api']),
  ('designer', ARRAY['ranking', 'creation']),
  ('salesperson', ARRAY['ranking', 'creation', 'orders', 'themes']),
  ('viewer', ARRAY['ranking']);

-- Adicionar coluna allowed_menu_items na tabela profiles para override individual
ALTER TABLE profiles 
ADD COLUMN allowed_menu_items TEXT[] DEFAULT NULL;

COMMENT ON COLUMN profiles.allowed_menu_items IS 'Override individual de itens de menu. Se NULL, usa o padrão da role.';