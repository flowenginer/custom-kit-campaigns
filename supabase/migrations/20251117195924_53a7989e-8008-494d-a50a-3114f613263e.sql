-- Bug #3: Permitir deletar leads convertidos
-- Adicionar CASCADE nas foreign keys de design_tasks

-- 1. Remove constraint antiga de lead_id
ALTER TABLE design_tasks 
DROP CONSTRAINT IF EXISTS design_tasks_lead_id_fkey;

-- 2. Adiciona constraint com CASCADE
ALTER TABLE design_tasks
ADD CONSTRAINT design_tasks_lead_id_fkey
FOREIGN KEY (lead_id)
REFERENCES leads(id)
ON DELETE CASCADE;