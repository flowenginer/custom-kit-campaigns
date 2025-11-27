-- Create campaign visual overrides table
CREATE TABLE IF NOT EXISTS public.campaign_visual_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, step_id)
);

-- Enable RLS
ALTER TABLE public.campaign_visual_overrides ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access to visual overrides"
ON public.campaign_visual_overrides
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Public can read visual overrides (needed for campaign pages)
CREATE POLICY "Public can read visual overrides"
ON public.campaign_visual_overrides
FOR SELECT
TO anon, authenticated
USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_campaign_visual_overrides_updated_at
  BEFORE UPDATE ON public.campaign_visual_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_campaign_visual_overrides_campaign_step 
ON public.campaign_visual_overrides(campaign_id, step_id);