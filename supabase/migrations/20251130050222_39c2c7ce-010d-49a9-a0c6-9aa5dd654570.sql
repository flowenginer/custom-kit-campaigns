-- Adicionar campos para múltiplos tipos e segmentos nas regras de preço
ALTER TABLE price_rules 
ADD COLUMN IF NOT EXISTS model_tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS segment_tags text[] DEFAULT '{}';