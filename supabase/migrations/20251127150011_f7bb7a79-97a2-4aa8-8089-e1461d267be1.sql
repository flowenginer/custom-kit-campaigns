-- Add device detection columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS device_type TEXT,
ADD COLUMN IF NOT EXISTS device_os TEXT,
ADD COLUMN IF NOT EXISTS device_browser TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Add index for device analytics queries
CREATE INDEX IF NOT EXISTS idx_leads_device_type ON public.leads(device_type);
CREATE INDEX IF NOT EXISTS idx_leads_device_os ON public.leads(device_os);