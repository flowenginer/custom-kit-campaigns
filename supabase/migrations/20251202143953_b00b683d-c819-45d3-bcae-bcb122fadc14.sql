-- Atualizar SKU das variações existentes que estão vazias
UPDATE shirt_model_variations
SET sku_suffix = 
  CASE 
    WHEN gender = 'male' THEN 'M'
    WHEN gender = 'female' THEN 'F'
    ELSE 'I'
  END || '-' ||
  REPLACE(REPLACE(REPLACE(size, ' ', ''), 'ANOS', 'A'), 'ANO', 'A')
WHERE sku_suffix IS NULL OR sku_suffix = '';