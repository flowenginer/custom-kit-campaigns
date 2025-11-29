-- FASE 1: Infraestrutura Base

-- Criar tabela customers (clientes PF/PJ)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_type TEXT NOT NULL CHECK (person_type IN ('pf', 'pj')),
  cpf TEXT UNIQUE,
  cnpj TEXT UNIQUE,
  name TEXT NOT NULL,
  company_name TEXT,
  state_registration TEXT,
  birth_date DATE,
  
  -- Endereço completo
  cep TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  
  -- Contato
  email TEXT,
  phone TEXT NOT NULL,
  contact_notes TEXT,
  
  -- Vínculo
  created_by UUID REFERENCES auth.users(id),
  
  -- Métricas
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  first_order_date TIMESTAMPTZ,
  last_order_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT customer_document_check CHECK (
    (person_type = 'pf' AND cpf IS NOT NULL AND cnpj IS NULL) OR
    (person_type = 'pj' AND cnpj IS NOT NULL)
  )
);

-- Criar tabela product_prices (preços base por modelo)
CREATE TABLE IF NOT EXISTS public.product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_tag TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  sku_prefix TEXT NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela company_settings (dados da empresa)
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dados da empresa
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL,
  inscricao_estadual TEXT,
  
  -- Endereço de origem (para cálculo de frete)
  cep TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  
  -- Contato
  email TEXT,
  phone TEXT,
  
  -- Integração Melhor Envio
  melhor_envio_token TEXT,
  melhor_envio_environment TEXT DEFAULT 'sandbox' CHECK (melhor_envio_environment IN ('sandbox', 'production')),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela erp_integrations (configurações de webhooks)
CREATE TABLE IF NOT EXISTS public.erp_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  api_token TEXT,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela erp_exports (histórico de exportações)
CREATE TABLE IF NOT EXISTS public.erp_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type TEXT NOT NULL CHECK (export_type IN ('product', 'order')),
  entity_id UUID NOT NULL,
  integration_type TEXT NOT NULL,
  external_id TEXT,
  external_number TEXT,
  payload JSONB,
  response JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error')),
  error_message TEXT,
  exported_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar campos em shirt_models
ALTER TABLE public.shirt_models 
  ADD COLUMN IF NOT EXISTS bling_product_id BIGINT,
  ADD COLUMN IF NOT EXISTS bling_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS peso DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS altura DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS largura DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS profundidade DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS unidade TEXT DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS volumes INTEGER DEFAULT 1;

-- Adicionar campos em design_tasks
ALTER TABLE public.design_tasks
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id),
  ADD COLUMN IF NOT EXISTS registration_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS registration_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS order_value DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS bling_order_id BIGINT,
  ADD COLUMN IF NOT EXISTS bling_order_number TEXT,
  ADD COLUMN IF NOT EXISTS shipping_option JSONB,
  ADD COLUMN IF NOT EXISTS shipping_value DECIMAL(10,2);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_customers_cpf ON public.customers(cpf);
CREATE INDEX IF NOT EXISTS idx_customers_cnpj ON public.customers(cnpj);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON public.customers(created_by);
CREATE INDEX IF NOT EXISTS idx_design_tasks_customer_id ON public.design_tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_design_tasks_registration_token ON public.design_tasks(registration_token);
CREATE INDEX IF NOT EXISTS idx_erp_exports_entity_id ON public.erp_exports(entity_id);
CREATE INDEX IF NOT EXISTS idx_shirt_models_bling_product_id ON public.shirt_models(bling_product_id);

-- RLS Policies para customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies para product_prices
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view product prices"
  ON public.product_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage product prices"
  ON public.product_prices FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- RLS Policies para company_settings
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view company settings"
  ON public.company_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage company settings"
  ON public.company_settings FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- RLS Policies para erp_integrations
ALTER TABLE public.erp_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view erp integrations"
  ON public.erp_integrations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage erp integrations"
  ON public.erp_integrations FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- RLS Policies para erp_exports
ALTER TABLE public.erp_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view erp exports"
  ON public.erp_exports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert erp exports"
  ON public.erp_exports FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_prices_updated_at
  BEFORE UPDATE ON public.product_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_erp_integrations_updated_at
  BEFORE UPDATE ON public.erp_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();