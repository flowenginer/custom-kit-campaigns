-- Adicionar item de menu para Chat
INSERT INTO menu_items (slug, label, icon, route, description, display_order, is_active)
VALUES (
  'chat',
  'Chat',
  'MessageSquare',
  '/admin/chat',
  'Chat interno para comunicação entre usuários',
  100,
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Dar acesso ao chat para todas as roles em role_menu_defaults
DO $$
DECLARE
  role_record RECORD;
BEGIN
  FOR role_record IN 
    SELECT role FROM role_menu_defaults
  LOOP
    -- Atualizar allowed_menu_items para incluir 'chat' se não existir
    UPDATE role_menu_defaults
    SET allowed_menu_items = array_append(allowed_menu_items, 'chat')
    WHERE role = role_record.role
      AND NOT ('chat' = ANY(allowed_menu_items));
  END LOOP;
END $$;