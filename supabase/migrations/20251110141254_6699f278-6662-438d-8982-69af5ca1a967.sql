-- Remover políticas existentes que estão bloqueando
DROP POLICY IF EXISTS "Admin full access to leads" ON leads;
DROP POLICY IF EXISTS "Public can insert leads" ON leads;
DROP POLICY IF EXISTS "Public can update own lead" ON leads;

-- Política para admins autenticados (acesso total)
CREATE POLICY "Admin full access to leads"
ON leads
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para permitir inserção pública (qualquer pessoa pode criar um lead)
CREATE POLICY "Public can insert leads"
ON leads
FOR INSERT
TO anon
WITH CHECK (true);

-- Política para permitir leitura pública
CREATE POLICY "Public can read own leads"
ON leads
FOR SELECT
TO anon
USING (true);

-- Política para permitir update público (permite atualizar is_online, last_seen, etc)
CREATE POLICY "Public can update leads"
ON leads
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);