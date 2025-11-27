-- Adicionar campo status_changed_at na tabela design_tasks
ALTER TABLE design_tasks 
ADD COLUMN IF NOT EXISTS status_changed_at timestamp with time zone DEFAULT now();

-- Atualizar registros existentes com o valor do created_at
UPDATE design_tasks 
SET status_changed_at = created_at 
WHERE status_changed_at IS NULL;

-- Criar função para atualizar status_changed_at automaticamente quando status muda
CREATE OR REPLACE FUNCTION update_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para chamar a função
DROP TRIGGER IF EXISTS trigger_status_changed_at ON design_tasks;
CREATE TRIGGER trigger_status_changed_at
BEFORE UPDATE ON design_tasks
FOR EACH ROW
EXECUTE FUNCTION update_status_changed_at();