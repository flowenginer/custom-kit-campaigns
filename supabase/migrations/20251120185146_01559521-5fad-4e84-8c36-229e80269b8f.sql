-- FASE 1: Adicionar coluna de permissões de colunas Kanban na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN allowed_kanban_columns JSONB DEFAULT '["pending", "in_progress", "awaiting_approval", "changes_requested", "approved", "completed"]'::jsonb;

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.allowed_kanban_columns IS 
'Array de IDs de colunas Kanban que o usuário tem permissão para visualizar. Possíveis valores: pending, in_progress, awaiting_approval, changes_requested, approved, completed';