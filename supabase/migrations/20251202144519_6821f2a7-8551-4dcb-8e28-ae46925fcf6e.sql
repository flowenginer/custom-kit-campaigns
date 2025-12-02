-- Atualizar SKU das variações existentes para SKU COMPLETO (SKU do produto + gênero + tamanho)
UPDATE shirt_model_variations smv
SET sku_suffix = 
  sm.sku || '-' ||
  CASE 
    WHEN smv.gender ILIKE '%masculino%' OR smv.gender = 'male' THEN 'M'
    WHEN smv.gender ILIKE '%feminino%' OR smv.gender = 'female' THEN 'F'
    ELSE 'I'
  END || '-' ||
  REPLACE(REPLACE(REPLACE(UPPER(smv.size), ' ', ''), 'ANOS', 'A'), 'ANO', 'A')
FROM shirt_models sm
WHERE smv.model_id = sm.id
  AND sm.sku IS NOT NULL;