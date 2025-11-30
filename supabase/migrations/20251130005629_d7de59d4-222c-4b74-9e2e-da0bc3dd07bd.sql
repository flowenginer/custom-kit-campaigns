-- Remover todas as políticas antigas da tabela customers
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Permitir inserção pública de clientes" ON public.customers;
DROP POLICY IF EXISTS "Admins podem visualizar todos os clientes" ON public.customers;
DROP POLICY IF EXISTS "Admins podem atualizar clientes" ON public.customers;
DROP POLICY IF EXISTS "Admins podem deletar clientes" ON public.customers;
DROP POLICY IF EXISTS "Vendedores podem visualizar clientes" ON public.customers;
DROP POLICY IF EXISTS "Super admins acesso total a clientes" ON public.customers;

-- Criar políticas limpas e corretas

-- 1. Permitir inserção pública (para registro via link)
CREATE POLICY "public_can_insert_customers"
ON public.customers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 2. Admins podem fazer tudo
CREATE POLICY "admins_full_access_customers"
ON public.customers
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 3. Vendedores podem visualizar
CREATE POLICY "salespersons_can_view_customers"
ON public.customers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'salesperson'));

-- 4. Super admins acesso total
CREATE POLICY "super_admins_full_access_customers"
ON public.customers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));