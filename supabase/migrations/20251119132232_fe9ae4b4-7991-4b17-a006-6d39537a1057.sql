-- Remover políticas antigas que causam recursão
DROP POLICY IF EXISTS "Admins can update global settings" ON global_settings;
DROP POLICY IF EXISTS "Admins can insert global settings" ON global_settings;
DROP POLICY IF EXISTS "Authenticated users can view roles" ON user_roles;
DROP POLICY IF EXISTS "Super admins can manage roles" ON user_roles;

-- Criar políticas corretas usando is_admin()
CREATE POLICY "Admins can update global settings"
ON global_settings FOR UPDATE
TO public
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert global settings"
ON global_settings FOR INSERT
TO public
WITH CHECK (is_admin(auth.uid()));

-- user_roles: permitir SELECT para authenticated (sem recursão)
CREATE POLICY "Authenticated users can view roles"
ON user_roles FOR SELECT
TO authenticated
USING (true);

-- user_roles: apenas super_admins podem gerenciar (usando função)
CREATE POLICY "Super admins can manage roles"
ON user_roles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));