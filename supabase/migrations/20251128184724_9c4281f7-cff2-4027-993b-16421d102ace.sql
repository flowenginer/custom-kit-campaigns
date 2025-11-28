-- Corrigir recursão infinita nas políticas RLS de chat_participants

-- 1. Remover a política problemática
DROP POLICY IF EXISTS "Users can view own participations" ON chat_participants;

-- 2. Criar função SECURITY DEFINER para verificar participação (evita recursão)
CREATE OR REPLACE FUNCTION public.user_is_participant(conv_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE conversation_id = conv_id 
    AND user_id = auth.uid()
  );
$$;

-- 3. Criar política simplificada para ver próprias participações
CREATE POLICY "Users can view own participations" ON chat_participants
  FOR SELECT USING (user_id = auth.uid());

-- 4. Adicionar política para ver outros participantes da mesma conversa
CREATE POLICY "Users can view conversation participants" ON chat_participants
  FOR SELECT USING (public.user_is_participant(conversation_id));