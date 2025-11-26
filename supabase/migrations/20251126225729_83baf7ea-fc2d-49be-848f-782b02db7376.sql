-- Corrigir política RLS: TODOS precisam LER as configurações, mas só admins podem MODIFICAR

-- Remover política antiga de leitura restrita
DROP POLICY IF EXISTS "Admins podem ler configurações Kanban" ON role_kanban_defaults;

-- Criar nova política: TODOS os usuários autenticados podem LER
CREATE POLICY "Authenticated users can read Kanban defaults"
ON role_kanban_defaults
FOR SELECT
TO authenticated
USING (true);

-- Manter as políticas de modificação apenas para admins
-- (já existem, não precisa recriar)