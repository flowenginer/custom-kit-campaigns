-- Adicionar cor dos botões e opacidade para todas as cores
ALTER TABLE campaign_themes
ADD COLUMN theme_button_color VARCHAR(255) DEFAULT '#4F9CF9',
ADD COLUMN theme_primary_opacity INTEGER DEFAULT 100,
ADD COLUMN theme_background_opacity INTEGER DEFAULT 100,
ADD COLUMN theme_text_opacity INTEGER DEFAULT 100,
ADD COLUMN theme_accent_opacity INTEGER DEFAULT 100,
ADD COLUMN theme_button_opacity INTEGER DEFAULT 100;