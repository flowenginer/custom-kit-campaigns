-- Adicionar campos display_label e icon na tabela tags
ALTER TABLE public.tags 
ADD COLUMN IF NOT EXISTS display_label TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '👕';

-- Remover a constraint restritiva de model_tag
ALTER TABLE public.segments 
DROP CONSTRAINT IF EXISTS segments_model_tag_check;

-- Atualizar tipos existentes com seus emojis e labels
UPDATE public.tags SET 
  display_label = 'Manga Curta',
  icon = '👕'
WHERE tag_type = 'model' AND tag_value = 'manga_curta';

UPDATE public.tags SET 
  display_label = 'Manga Longa',
  icon = '🧥'
WHERE tag_type = 'model' AND tag_value = 'manga_longa';

UPDATE public.tags SET 
  display_label = 'Regata',
  icon = '🎽'
WHERE tag_type = 'model' AND tag_value = 'regata';

UPDATE public.tags SET 
  display_label = 'Ziper',
  icon = '🧥'
WHERE tag_type = 'model' AND tag_value = 'ziper';

UPDATE public.tags SET 
  display_label = 'Kit Completo',
  icon = '📦'
WHERE tag_type = 'model' AND tag_value = 'kit';

UPDATE public.tags SET 
  display_label = 'Short',
  icon = '🩳'
WHERE tag_type = 'model' AND tag_value = 'short';