-- Permitir que usuários anônimos possam inserir pedidos
CREATE POLICY "Allow anonymous insert on orders"
ON orders
FOR INSERT
TO anon
WITH CHECK (true);

-- Permitir que usuários autenticados possam inserir pedidos
CREATE POLICY "Allow authenticated insert on orders"
ON orders
FOR INSERT
TO authenticated
WITH CHECK (true);