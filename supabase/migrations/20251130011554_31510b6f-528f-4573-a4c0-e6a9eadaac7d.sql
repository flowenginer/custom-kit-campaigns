-- Remover política antiga de INSERT se existir e recriar corretamente
DROP POLICY IF EXISTS public_can_insert_customers ON public.customers;

-- Criar política de INSERT público permitindo usuários anônimos e autenticados
CREATE POLICY "public_can_insert_customers" 
ON public.customers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);