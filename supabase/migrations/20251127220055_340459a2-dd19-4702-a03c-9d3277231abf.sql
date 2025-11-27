-- Add dashboard-builder to allowed menu items for super_admin and admin roles
UPDATE role_menu_defaults 
SET allowed_menu_items = array_append(allowed_menu_items, 'dashboard-builder')
WHERE role IN ('super_admin', 'admin')
AND NOT ('dashboard-builder' = ANY(allowed_menu_items));