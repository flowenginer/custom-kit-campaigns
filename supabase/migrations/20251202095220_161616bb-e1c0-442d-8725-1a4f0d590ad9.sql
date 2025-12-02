-- Remover constraint antiga
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_salesperson_status_check;

-- Adicionar nova constraint incluindo 'rejected_by_designer'
ALTER TABLE public.leads ADD CONSTRAINT leads_salesperson_status_check 
CHECK (
  salesperson_status IS NULL OR 
  salesperson_status = ANY (ARRAY[
    'awaiting_logo'::text, 
    'sent_to_designer'::text, 
    'awaiting_final_confirmation'::text, 
    'approved'::text,
    'rejected_by_designer'::text
  ])
);