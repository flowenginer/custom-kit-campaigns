-- Criar função para atualizar updated_at da conversa quando nova mensagem chega
CREATE OR REPLACE FUNCTION public.update_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger que dispara após INSERT em chat_messages
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON chat_messages;
CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_on_new_message();

-- Habilitar realtime para chat_conversations
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;