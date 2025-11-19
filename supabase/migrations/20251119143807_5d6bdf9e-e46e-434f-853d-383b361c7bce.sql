-- Adicionar colunas UTM aos eventos de funil
ALTER TABLE funnel_events 
ADD COLUMN utm_source text,
ADD COLUMN utm_medium text,
ADD COLUMN utm_campaign text,
ADD COLUMN utm_term text,
ADD COLUMN utm_content text;

-- Criar índices para performance nas queries da dashboard
CREATE INDEX idx_funnel_events_utm_source ON funnel_events(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX idx_funnel_events_created_at ON funnel_events(created_at);
CREATE INDEX idx_funnel_events_session_campaign ON funnel_events(session_id, campaign_id);