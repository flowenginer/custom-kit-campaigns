-- 1. Adicionar coluna order_number na tabela design_tasks
ALTER TABLE public.design_tasks 
ADD COLUMN order_number TEXT;

-- 2. Migrar prioridades existentes em design_tasks
UPDATE public.design_tasks 
SET priority = 'normal' 
WHERE priority = 'low';

UPDATE public.design_tasks 
SET priority = 'urgent' 
WHERE priority = 'high';

-- 3. Migrar prioridades existentes em pending_urgent_requests
UPDATE public.pending_urgent_requests 
SET requested_priority = 'normal' 
WHERE requested_priority = 'low';

UPDATE public.pending_urgent_requests 
SET requested_priority = 'urgent' 
WHERE requested_priority = 'high';

UPDATE public.pending_urgent_requests 
SET final_priority = 'normal' 
WHERE final_priority = 'low';

UPDATE public.pending_urgent_requests 
SET final_priority = 'urgent' 
WHERE final_priority = 'high';

-- 4. Alterar o ENUM task_priority para ter apenas normal e urgent
-- Remover defaults
ALTER TABLE public.design_tasks 
ALTER COLUMN priority DROP DEFAULT;

ALTER TABLE public.pending_urgent_requests 
ALTER COLUMN requested_priority DROP DEFAULT;

-- Renomear o ENUM antigo
ALTER TYPE task_priority RENAME TO task_priority_old;

-- Criar novo ENUM
CREATE TYPE task_priority AS ENUM ('normal', 'urgent');

-- Converter as colunas
ALTER TABLE public.design_tasks 
ALTER COLUMN priority TYPE task_priority 
USING priority::text::task_priority;

ALTER TABLE public.pending_urgent_requests 
ALTER COLUMN requested_priority TYPE task_priority 
USING requested_priority::text::task_priority;

ALTER TABLE public.pending_urgent_requests 
ALTER COLUMN final_priority TYPE task_priority 
USING final_priority::text::task_priority;

-- Adicionar novos defaults
ALTER TABLE public.design_tasks 
ALTER COLUMN priority SET DEFAULT 'normal'::task_priority;

ALTER TABLE public.pending_urgent_requests 
ALTER COLUMN requested_priority SET DEFAULT 'urgent'::task_priority;

-- Remover o ENUM antigo
DROP TYPE task_priority_old;