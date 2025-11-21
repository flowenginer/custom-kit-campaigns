-- Adicionar segment_tag à tabela segments
ALTER TABLE segments ADD COLUMN IF NOT EXISTS segment_tag TEXT;

-- Preencher segment_tag para segmentos existentes baseado no nome
UPDATE segments 
SET segment_tag = CASE
  WHEN name ILIKE '%energia solar%' THEN 'energia_solar'
  WHEN name ILIKE '%agro%' THEN 'agro'
  WHEN name ILIKE '%futevôlei%' OR name ILIKE '%futevolei%' THEN 'futevoelei'
  ELSE LOWER(REGEXP_REPLACE(SPLIT_PART(name, '|', 1), '[^a-zA-Z0-9]+', '_', 'g'))
END
WHERE segment_tag IS NULL;

-- Adicionar segment_tag e model_tag à tabela shirt_models
ALTER TABLE shirt_models ADD COLUMN IF NOT EXISTS segment_tag TEXT;
ALTER TABLE shirt_models ADD COLUMN IF NOT EXISTS model_tag TEXT;

-- Preencher segment_tag baseado no segment_id atual
UPDATE shirt_models sm
SET segment_tag = s.segment_tag
FROM segments s
WHERE sm.segment_id = s.id AND sm.segment_tag IS NULL;

-- Preencher model_tag baseado no segment.model_tag
UPDATE shirt_models sm
SET model_tag = s.model_tag
FROM segments s
WHERE sm.segment_id = s.id AND sm.model_tag IS NULL;

-- Adicionar segment_tag à tabela campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS segment_tag TEXT;

-- Preencher segment_tag para campanhas existentes
UPDATE campaigns c
SET segment_tag = s.segment_tag
FROM segments s
WHERE c.segment_id = s.id AND c.segment_tag IS NULL;