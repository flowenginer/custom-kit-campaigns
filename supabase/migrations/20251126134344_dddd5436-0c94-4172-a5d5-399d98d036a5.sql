-- Corrigir dados existentes: vincular lead_id nos design_tasks
UPDATE design_tasks dt
SET lead_id = l.id
FROM leads l
WHERE dt.order_id = l.order_id 
  AND dt.lead_id IS NULL
  AND l.order_id IS NOT NULL;

-- Definir logo_action para leads que precisam de logo
UPDATE leads
SET logo_action = 'waiting_client'
WHERE needs_logo = true 
  AND logo_action IS NULL;