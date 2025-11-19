-- Remover a foreign key antiga que aponta para auth.users
ALTER TABLE design_tasks
DROP CONSTRAINT IF EXISTS design_tasks_created_by_fkey;

-- Criar nova foreign key apontando para profiles
ALTER TABLE design_tasks
ADD CONSTRAINT design_tasks_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Adicionar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_design_tasks_created_by 
ON design_tasks(created_by);