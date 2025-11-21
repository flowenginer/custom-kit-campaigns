-- Remover policies redundantes de INSERT em orders
DROP POLICY IF EXISTS "Anyone can insert orders" ON orders;
DROP POLICY IF EXISTS "Allow anonymous insert on orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated insert on orders" ON orders;
DROP POLICY IF EXISTS "Salespersons can create orders" ON orders;

-- Criar uma única policy clara para INSERT público
CREATE POLICY "public_can_insert_orders"
ON orders
FOR INSERT
TO public
WITH CHECK (true);

-- Garantir que RLS está habilitado
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;