-- Atualizar o valor padrão da cor principal para vermelho
ALTER TABLE campaign_themes 
  ALTER COLUMN theme_primary_color SET DEFAULT '#FF0000';