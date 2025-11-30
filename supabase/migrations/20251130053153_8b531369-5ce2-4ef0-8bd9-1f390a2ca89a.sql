-- Adicionar campo de preço promocional nas variações
ALTER TABLE shirt_model_variations
ADD COLUMN IF NOT EXISTS promotional_price numeric DEFAULT NULL;

COMMENT ON COLUMN shirt_model_variations.promotional_price IS 'Preço promocional da variação (sobrescreve base_price + price_adjustment quando definido)';

-- Adicionar campos para controlar se regra afeta base ou promocional
ALTER TABLE price_rules
ADD COLUMN IF NOT EXISTS affects_base_price boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS affects_promotional_price boolean DEFAULT true;

COMMENT ON COLUMN price_rules.affects_base_price IS 'Se true, a regra altera o base_price do modelo';
COMMENT ON COLUMN price_rules.affects_promotional_price IS 'Se true, a regra define promotional_price na variação';