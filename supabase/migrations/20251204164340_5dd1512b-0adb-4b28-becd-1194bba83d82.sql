-- Inserir menu principal "Integrações"
INSERT INTO menu_items (id, label, slug, icon, route, description, parent_id, display_order, is_active)
VALUES 
  (gen_random_uuid(), 'Integrações', 'integracoes', 'Plug', '/admin/integracoes', 'Gerenciar integrações externas', NULL, 90, true);

-- Buscar o ID do menu "Integrações" para usar como parent_id
-- Inserir submenus
INSERT INTO menu_items (label, slug, icon, route, description, parent_id, display_order, is_active)
SELECT 
  'Melhor Envio', 
  'melhor-envio', 
  'Truck', 
  '/admin/melhor-envio', 
  'Configuração e painel de envios',
  id,
  1,
  true
FROM menu_items WHERE slug = 'integracoes';

INSERT INTO menu_items (label, slug, icon, route, description, parent_id, display_order, is_active)
SELECT 
  'Bling', 
  'bling', 
  'Boxes', 
  '/admin/bling', 
  'Integração com Bling ERP',
  id,
  2,
  true
FROM menu_items WHERE slug = 'integracoes';