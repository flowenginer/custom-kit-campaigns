-- Add new columns for lead attempt tracking
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS lead_group_identifier TEXT,
ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_leads_group_identifier ON public.leads(lead_group_identifier, created_at DESC);

-- Update existing leads with group identifier
UPDATE public.leads 
SET lead_group_identifier = COALESCE(email, 'noemail') || '_' || regexp_replace(phone, '[^0-9]', '', 'g')
WHERE lead_group_identifier IS NULL;

-- Calculate attempt numbers for existing leads
WITH ranked_leads AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY lead_group_identifier ORDER BY created_at) as attempt_num
  FROM public.leads
  WHERE lead_group_identifier IS NOT NULL
)
UPDATE public.leads
SET attempt_number = ranked_leads.attempt_num
FROM ranked_leads
WHERE leads.id = ranked_leads.id;