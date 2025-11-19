-- Create global_settings table for global scripts configuration
CREATE TABLE IF NOT EXISTS public.global_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  global_head_scripts text,
  global_body_scripts text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read global settings (needed for public campaign pages)
CREATE POLICY "Anyone can read global settings"
  ON public.global_settings
  FOR SELECT
  USING (true);

-- Policy: Only admins can update global settings
CREATE POLICY "Admins can update global settings"
  ON public.global_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Policy: Only admins can insert global settings
CREATE POLICY "Admins can insert global settings"
  ON public.global_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Insert default empty row (there should only be one row in this table)
INSERT INTO public.global_settings (global_head_scripts, global_body_scripts)
VALUES ('', '')
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at
CREATE TRIGGER update_global_settings_updated_at
  BEFORE UPDATE ON public.global_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();