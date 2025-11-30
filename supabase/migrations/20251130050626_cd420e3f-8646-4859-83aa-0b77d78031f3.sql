-- Remover constraint antiga de apply_to se existir
ALTER TABLE price_rules DROP CONSTRAINT IF EXISTS price_rules_apply_to_check;

-- Adicionar constraint atualizada com todos os valores possíveis
ALTER TABLE price_rules ADD CONSTRAINT price_rules_apply_to_check 
CHECK (apply_to IN ('all', 'segment', 'model_tag', 'size', 'gender', 'custom_combination'));