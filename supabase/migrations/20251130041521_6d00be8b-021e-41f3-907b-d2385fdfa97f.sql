-- Remover constraints restritivas de tamanho e gênero para permitir valores flexíveis
ALTER TABLE shirt_model_variations DROP CONSTRAINT IF EXISTS shirt_model_variations_size_check;
ALTER TABLE shirt_model_variations DROP CONSTRAINT IF EXISTS shirt_model_variations_gender_check;