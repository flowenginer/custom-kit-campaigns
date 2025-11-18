-- FASE 1.2: Expandir tabelas e criar policies

-- Expandir tabela leads com novos campos
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS needs_logo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by_salesperson boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS uploaded_logo_url text,
ADD COLUMN IF NOT EXISTS salesperson_status text 
  CHECK (salesperson_status IS NULL OR salesperson_status IN ('awaiting_logo', 'sent_to_designer', 'awaiting_final_confirmation'));

-- Expandir tabela design_tasks
ALTER TABLE public.design_tasks 
ADD COLUMN IF NOT EXISTS created_by_salesperson boolean DEFAULT false;

-- Atualizar RLS policies para vendedores

-- Policy para vendedores visualizarem leads que precisam de logo ou criados por eles
CREATE POLICY "Salespersons can view leads needing logos"
ON public.leads
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'salesperson'::app_role) AND 
  (needs_logo = true OR created_by_salesperson = true)
);

-- Policy para vendedores atualizarem leads que precisam de logo
CREATE POLICY "Salespersons can update leads needing logos"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'salesperson'::app_role) AND 
  (needs_logo = true OR created_by_salesperson = true)
)
WITH CHECK (
  has_role(auth.uid(), 'salesperson'::app_role) AND 
  (needs_logo = true OR created_by_salesperson = true)
);

-- Policy para vendedores inserirem novos leads
CREATE POLICY "Salespersons can insert leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'salesperson'::app_role) AND 
  created_by_salesperson = true
);

-- Policy para vendedores visualizarem orders relacionadas aos seus leads
CREATE POLICY "Salespersons can view related orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'salesperson'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.order_id = orders.id 
    AND (leads.needs_logo = true OR leads.created_by_salesperson = true)
  )
);

-- Policy para vendedores criarem orders
CREATE POLICY "Salespersons can create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'salesperson'::app_role));

-- Policy para vendedores visualizarem design tasks relacionadas
CREATE POLICY "Salespersons can view related design tasks"
ON public.design_tasks
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'salesperson'::app_role) AND
  created_by_salesperson = true
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_leads_salesperson_status ON public.leads(salesperson_status);
CREATE INDEX IF NOT EXISTS idx_leads_needs_logo ON public.leads(needs_logo) WHERE needs_logo = true;
CREATE INDEX IF NOT EXISTS idx_leads_created_by_salesperson ON public.leads(created_by_salesperson) WHERE created_by_salesperson = true;
CREATE INDEX IF NOT EXISTS idx_design_tasks_created_by_salesperson ON public.design_tasks(created_by_salesperson) WHERE created_by_salesperson = true;