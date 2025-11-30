-- Adicionar coluna genders na tabela price_rules para permitir regras de preço por gênero
ALTER TABLE price_rules ADD COLUMN genders text[] DEFAULT '{}';

COMMENT ON COLUMN price_rules.genders IS 'Lista de gêneros aos quais a regra se aplica (masculino, feminino, unissex)';