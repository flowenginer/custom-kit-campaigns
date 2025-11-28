-- Correção completa das políticas RLS do chat para eliminar dependências circulares

-- 1. Criar função para verificar se usuário criou a conversa
CREATE OR REPLACE FUNCTION public.user_created_conversation(conv_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_conversations 
    WHERE id = conv_id 
    AND created_by = auth.uid()
  );
$$;

-- 2. Atualizar políticas de chat_conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON chat_conversations;
CREATE POLICY "Users can view own conversations" ON chat_conversations
  FOR SELECT USING (
    created_by = auth.uid() OR public.user_is_participant(id)
  );

-- 3. Atualizar políticas de chat_participants
DROP POLICY IF EXISTS "Conversation creators can add participants" ON chat_participants;
CREATE POLICY "Conversation creators can add participants" ON chat_participants
  FOR INSERT WITH CHECK (public.user_created_conversation(conversation_id));

-- 4. Atualizar políticas de chat_messages
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON chat_messages;
CREATE POLICY "Users can view messages in own conversations" ON chat_messages
  FOR SELECT USING (public.user_is_participant(conversation_id));

DROP POLICY IF EXISTS "Users can send messages in own conversations" ON chat_messages;
CREATE POLICY "Users can send messages in own conversations" ON chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND public.user_is_participant(conversation_id)
  );