-- Adicionar coluna model_tag à tabela segments
ALTER TABLE public.segments 
ADD COLUMN model_tag TEXT CHECK (model_tag IN ('manga_longa', 'ziper', 'manga_curta', 'regata', 'kit'));

COMMENT ON COLUMN public.segments.model_tag IS 'Tipo de modelo da camisa: manga_longa, ziper, manga_curta, regata, kit';