-- Alterar colunas para permitir NULL
ALTER TABLE public.orders 
ALTER COLUMN customer_email DROP NOT NULL;

ALTER TABLE public.orders 
ALTER COLUMN customer_phone DROP NOT NULL;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admin full access to orders" ON public.orders;
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;

-- Criar nova política de INSERT público
CREATE POLICY "Anyone can insert orders"
ON public.orders 
FOR INSERT
WITH CHECK (true);

-- Criar política de SELECT para admins
CREATE POLICY "Admins can view all orders"
ON public.orders 
FOR SELECT
USING (auth.role() = 'authenticated');

-- Criar política de UPDATE para admins
CREATE POLICY "Admins can update orders"
ON public.orders 
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');