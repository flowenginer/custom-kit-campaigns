-- 1. Add public read policy for workflow_templates
CREATE POLICY "Public can read workflow templates"
ON public.workflow_templates
FOR SELECT
TO anon, authenticated
USING (true);

-- 2. Add workflow_config snapshot column to campaigns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS workflow_config jsonb;

-- 3. Backfill existing campaigns with their workflow configs
UPDATE public.campaigns c
SET workflow_config = wt.workflow_config
FROM public.workflow_templates wt
WHERE c.workflow_template_id = wt.id
  AND c.workflow_config IS NULL;

-- 4. Create function to copy workflow config to campaign
CREATE OR REPLACE FUNCTION public.copy_workflow_config_to_campaign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When workflow_template_id is set or updated, copy the config
  IF NEW.workflow_template_id IS NOT NULL THEN
    SELECT workflow_config INTO NEW.workflow_config
    FROM public.workflow_templates
    WHERE id = NEW.workflow_template_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Create trigger to automatically copy workflow config
DROP TRIGGER IF EXISTS copy_workflow_config_trigger ON public.campaigns;
CREATE TRIGGER copy_workflow_config_trigger
BEFORE INSERT OR UPDATE OF workflow_template_id
ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.copy_workflow_config_to_campaign();