-- Corrigir política RLS para design_tasks
-- Remover política antiga que pode estar causando problemas
DROP POLICY IF EXISTS "Authenticated users can update design tasks" ON design_tasks;

-- Criar política com WITH CHECK explícito para garantir que funciona
CREATE POLICY "Authenticated users can update design tasks"
ON design_tasks FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);