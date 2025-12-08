-- Adicionar coluna para identificar tarefas que voltaram de recusa
ALTER TABLE design_tasks 
ADD COLUMN returned_from_rejection boolean DEFAULT false;

-- Atualizar tarefas existentes que foram rejeitadas (baseado em task_rejections não resolvidas)
UPDATE design_tasks dt
SET returned_from_rejection = true
WHERE EXISTS (
  SELECT 1 FROM task_rejections tr 
  WHERE tr.task_id = dt.id 
  AND tr.resolved = false
);