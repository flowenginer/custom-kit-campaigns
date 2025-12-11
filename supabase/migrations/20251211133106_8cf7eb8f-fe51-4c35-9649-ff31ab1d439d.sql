-- Tabela para configuração de perfis/roles
CREATE TABLE public.roles_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  icon TEXT DEFAULT '👤',
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.roles_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view roles_config"
ON public.roles_config FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage roles_config"
ON public.roles_config FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Popular com roles existentes
INSERT INTO public.roles_config (role_key, label, icon, description, is_system, sort_order) VALUES
  ('super_admin', 'Super Admin', '👑', 'Acesso total ao sistema e gerenciamento de usuários', true, 1),
  ('admin', 'Admin', '⚙️', 'Acesso a todas as funcionalidades exceto gerenciamento de usuários', true, 2),
  ('designer', 'Designer', '🎨', 'Acesso às tarefas de design e criação', true, 3),
  ('salesperson', 'Vendedor', '👔', 'Acesso a pedidos, clientes e chat', true, 4),
  ('viewer', 'Visualizador', '👁️', 'Apenas visualização do sistema', true, 5);

-- Trigger para updated_at
CREATE TRIGGER update_roles_config_updated_at
BEFORE UPDATE ON public.roles_config
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para adicionar novo role customizado
CREATE OR REPLACE FUNCTION public.add_custom_role(
  p_role_key TEXT,
  p_label TEXT,
  p_icon TEXT DEFAULT '👤',
  p_description TEXT DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Verificar se usuário é admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem criar perfis';
  END IF;

  -- Adicionar ao ENUM se não existir
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = p_role_key AND enumtypid = 'app_role'::regtype) THEN
    EXECUTE format('ALTER TYPE app_role ADD VALUE IF NOT EXISTS %L', p_role_key);
  END IF;
  
  -- Adicionar à tabela de configuração
  INSERT INTO roles_config (role_key, label, icon, description, is_system)
  VALUES (p_role_key, p_label, p_icon, p_description, false)
  ON CONFLICT (role_key) DO UPDATE SET 
    label = EXCLUDED.label,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING jsonb_build_object('id', id, 'role_key', role_key, 'label', label) INTO v_result;
    
  -- Criar entrada em role_kanban_defaults (com todas as colunas por padrão)
  INSERT INTO role_kanban_defaults (role, allowed_columns)
  SELECT p_role_key::app_role, array_agg(key)
  FROM kanban_columns WHERE is_active = true
  ON CONFLICT (role) DO NOTHING;
  
  -- Criar entrada em role_menu_defaults (com menus básicos)
  INSERT INTO role_menu_defaults (role, allowed_menu_items)
  VALUES (p_role_key::app_role, ARRAY['dashboard', 'chat'])
  ON CONFLICT (role) DO NOTHING;
  
  RETURN v_result;
END;
$$;

-- Função para atualizar role customizado
CREATE OR REPLACE FUNCTION public.update_custom_role(
  p_role_key TEXT,
  p_label TEXT,
  p_icon TEXT,
  p_description TEXT,
  p_is_active BOOLEAN
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se usuário é admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem atualizar perfis';
  END IF;

  UPDATE roles_config SET
    label = p_label,
    icon = p_icon,
    description = p_description,
    is_active = p_is_active,
    updated_at = now()
  WHERE role_key = p_role_key;
END;
$$;