-- Corrigir leads existentes que não têm needs_logo definido
-- Leads completos sem logo = needs_logo = true
UPDATE leads
SET 
  needs_logo = true, 
  salesperson_status = 'awaiting_logo'
WHERE completed = true 
  AND needs_logo IS NULL
  AND order_id IS NOT NULL
  AND (uploaded_logo_url IS NULL OR uploaded_logo_url = '');

-- Leads completos com logo = needs_logo = false  
UPDATE leads
SET 
  needs_logo = false,
  salesperson_status = NULL
WHERE completed = true 
  AND needs_logo IS NULL
  AND order_id IS NOT NULL
  AND uploaded_logo_url IS NOT NULL
  AND uploaded_logo_url != '';

-- Restaurar design_tasks que foram soft-deleted mas que estão vinculadas a leads que precisam de logo
UPDATE design_tasks
SET deleted_at = NULL
WHERE deleted_at IS NOT NULL
  AND lead_id IN (
    SELECT id FROM leads 
    WHERE needs_logo = true 
      AND completed = true
      AND order_id IS NOT NULL
  );