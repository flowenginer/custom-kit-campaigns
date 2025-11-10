-- Adicionar colunas para rastreamento de presença online
ALTER TABLE leads ADD COLUMN is_online BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Criar índice para performance em consultas de leads online
CREATE INDEX idx_leads_is_online ON leads(is_online) WHERE is_online = true;