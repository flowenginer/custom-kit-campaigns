-- Add group support columns to chat_conversations
ALTER TABLE chat_conversations 
  ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_name TEXT,
  ADD COLUMN IF NOT EXISTS group_icon TEXT DEFAULT '👥',
  ADD COLUMN IF NOT EXISTS group_description TEXT;

-- Add index for faster group queries
CREATE INDEX IF NOT EXISTS idx_chat_conversations_is_group ON chat_conversations(is_group) WHERE is_group = true;