-- Inserir novo menu "Devolvidas" logo após "Pedidos"
INSERT INTO menu_items (slug, label, route, icon, description, display_order, is_active, parent_id)
VALUES (
  'returned',
  'Devolvidas',
  '/admin/returned',
  'AlertTriangle',
  'Tarefas devolvidas pelos designers para correção',
  (SELECT COALESCE(display_order, 0) + 1 FROM menu_items WHERE slug = 'orders'),
  true,
  NULL
)
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  route = EXCLUDED.route,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;