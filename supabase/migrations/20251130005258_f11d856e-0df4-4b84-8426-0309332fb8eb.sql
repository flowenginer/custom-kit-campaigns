-- Políticas RLS para tabela customers

-- Permitir que qualquer pessoa insira um novo cliente (para registro público via link)
CREATE POLICY "Permitir inserção pública de clientes"
ON public.customers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Permitir que admins vejam todos os clientes
CREATE POLICY "Admins podem visualizar todos os clientes"
ON public.customers
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Permitir que admins atualizem clientes
CREATE POLICY "Admins podem atualizar clientes"
ON public.customers
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Permitir que admins deletem clientes
CREATE POLICY "Admins podem deletar clientes"
ON public.customers
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Permitir que vendedores vejam todos os clientes
CREATE POLICY "Vendedores podem visualizar clientes"
ON public.customers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'salesperson'));

-- Super admins têm acesso total
CREATE POLICY "Super admins acesso total a clientes"
ON public.customers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));