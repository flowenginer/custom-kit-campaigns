-- Criar tabela para links de cadastro de clientes
CREATE TABLE IF NOT EXISTS public.customer_registration_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  task_id UUID REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMPTZ,
  customer_id UUID REFERENCES public.customers(id)
);

-- Habilitar RLS
ALTER TABLE public.customer_registration_links ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Authenticated users can insert registration links"
  ON public.customer_registration_links
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated users can view own registration links"
  ON public.customer_registration_links
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Public can view valid registration links"
  ON public.customer_registration_links
  FOR SELECT
  TO anon
  USING (expires_at > now() AND used_at IS NULL);

CREATE POLICY "Public can update registration links"
  ON public.customer_registration_links
  FOR UPDATE
  TO anon
  USING (expires_at > now() AND used_at IS NULL)
  WITH CHECK (expires_at > now());

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_customer_registration_links_token ON public.customer_registration_links(token);
CREATE INDEX IF NOT EXISTS idx_customer_registration_links_task_id ON public.customer_registration_links(task_id);
CREATE INDEX IF NOT EXISTS idx_customer_registration_links_created_by ON public.customer_registration_links(created_by);