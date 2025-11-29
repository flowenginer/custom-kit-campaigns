-- Remove política existente que só funciona para anon
DROP POLICY IF EXISTS "Public can update registration links" ON customer_registration_links;

-- Cria política que funciona para usuários autenticados e anônimos
CREATE POLICY "Anyone can update valid registration links"
ON customer_registration_links
FOR UPDATE
TO anon, authenticated
USING (
  (expires_at > now()) AND (used_at IS NULL)
)
WITH CHECK (expires_at > now());