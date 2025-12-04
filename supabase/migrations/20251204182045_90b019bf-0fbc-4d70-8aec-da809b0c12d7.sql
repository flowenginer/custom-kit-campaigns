-- Add RLS policy to allow public update for shipping selection by token
CREATE POLICY "Allow public update on shipping_selection_links by token"
ON public.shipping_selection_links
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Add RLS policy to allow public update on design_tasks for shipping selection
CREATE POLICY "Allow public shipping update on design_tasks"
ON public.design_tasks
FOR UPDATE
USING (true)
WITH CHECK (true);