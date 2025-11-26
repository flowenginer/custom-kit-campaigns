-- Migrar dados de created_by das leads para design_tasks antigas
UPDATE design_tasks dt
SET 
  created_by = l.created_by,
  created_by_salesperson = COALESCE(l.created_by_salesperson, false)
FROM leads l
WHERE dt.lead_id = l.id
AND dt.created_by IS NULL
AND l.created_by IS NOT NULL;