-- Adicionar policy para permitir UPDATE público de clientes (necessário para atualização via link)
CREATE POLICY "public_can_update_customers_via_link"
ON public.customers
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);