-- Criar tabela leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id),
  session_id TEXT NOT NULL,
  
  -- Dados do lead
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  quantity TEXT NOT NULL,
  custom_quantity INTEGER,
  
  -- Parâmetros UTM
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  
  -- Tracking
  current_step INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  order_id UUID REFERENCES orders(id),
  
  -- Resumo da personalização
  customization_summary JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint para evitar duplicatas
  CONSTRAINT unique_session_campaign UNIQUE(session_id, campaign_id)
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX idx_leads_session_id ON leads(session_id);
CREATE INDEX idx_leads_completed ON leads(completed);
CREATE INDEX idx_leads_utm_source ON leads(utm_source);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- RLS Policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to leads"
  ON leads
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Public can insert leads"
  ON leads
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update own lead"
  ON leads
  FOR UPDATE
  USING (true);