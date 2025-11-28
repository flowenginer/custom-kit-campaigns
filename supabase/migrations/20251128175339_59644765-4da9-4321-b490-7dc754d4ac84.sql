-- ====================================
-- FUNCIONALIDADE 2: Sistema de Solicitação de Alteração
-- ====================================

CREATE TABLE pending_modification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES design_tasks(id),
  description TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  requested_by UUID REFERENCES profiles(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies para pending_modification_requests
ALTER TABLE pending_modification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salespersons can insert own modification requests" ON pending_modification_requests
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'salesperson') AND requested_by = auth.uid()
  );

CREATE POLICY "Salespersons can view own modification requests" ON pending_modification_requests
  FOR SELECT USING (
    has_role(auth.uid(), 'salesperson') AND requested_by = auth.uid()
  );

CREATE POLICY "Admins can view all modification requests" ON pending_modification_requests
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update modification requests" ON pending_modification_requests
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Super admins full access to modification requests" ON pending_modification_requests
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- ====================================
-- FUNCIONALIDADE 3: Chat Interno
-- ====================================

-- Conversas
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Participantes
CREATE TABLE chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Mensagens
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text', -- text, audio, file, image
  file_url TEXT,
  file_name TEXT,
  audio_duration INTEGER, -- duração em segundos
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX idx_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX idx_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_participants_user ON chat_participants(user_id);
CREATE INDEX idx_participants_conversation ON chat_participants(conversation_id);
CREATE INDEX idx_conversations_created_by ON chat_conversations(created_by);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;

-- RLS para chat_conversations
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON chat_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE conversation_id = chat_conversations.id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations" ON chat_conversations
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- RLS para chat_participants
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own participations" ON chat_participants
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM chat_participants cp2
    WHERE cp2.conversation_id = chat_participants.conversation_id
    AND cp2.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own read status" ON chat_participants
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Conversation creators can add participants" ON chat_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations 
      WHERE id = conversation_id 
      AND created_by = auth.uid()
    )
  );

-- RLS para chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own conversations" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE conversation_id = chat_messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in own conversations" ON chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE conversation_id = chat_messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

-- Bucket para arquivos do chat
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- Policy para upload de arquivos do chat
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-files' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view chat files"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-files');