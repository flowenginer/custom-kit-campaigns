-- RPC otimizada para buscar conversas com last_message e unread_count em uma única query
CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id uuid)
RETURNS TABLE (
  conversation_id uuid,
  is_group boolean,
  group_name text,
  group_icon text,
  other_user_id uuid,
  other_user_name text,
  other_user_role text,
  last_message_content text,
  last_message_type text,
  last_message_created_at timestamptz,
  last_message_sender_name text,
  unread_count bigint,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_participations AS (
    SELECT cp.conversation_id, cp.last_read_at
    FROM chat_participants cp
    WHERE cp.user_id = p_user_id
  ),
  last_messages AS (
    SELECT DISTINCT ON (cm.conversation_id)
      cm.conversation_id,
      cm.content,
      cm.message_type,
      cm.created_at,
      cm.sender_id,
      p.full_name as sender_name
    FROM chat_messages cm
    LEFT JOIN profiles p ON p.id = cm.sender_id
    WHERE cm.conversation_id IN (SELECT conversation_id FROM user_participations)
      AND cm.deleted_at IS NULL
    ORDER BY cm.conversation_id, cm.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      cm.conversation_id,
      COUNT(*) as unread
    FROM chat_messages cm
    JOIN user_participations up ON up.conversation_id = cm.conversation_id
    WHERE cm.sender_id != p_user_id
      AND cm.deleted_at IS NULL
      AND cm.created_at > COALESCE(up.last_read_at, '1970-01-01'::timestamptz)
    GROUP BY cm.conversation_id
  ),
  other_participants AS (
    SELECT DISTINCT ON (cp.conversation_id)
      cp.conversation_id,
      cp.user_id,
      pr.full_name,
      ur.role
    FROM chat_participants cp
    JOIN chat_conversations cc ON cc.id = cp.conversation_id
    LEFT JOIN profiles pr ON pr.id = cp.user_id
    LEFT JOIN user_roles ur ON ur.user_id = cp.user_id
    WHERE cp.conversation_id IN (SELECT conversation_id FROM user_participations)
      AND cp.user_id != p_user_id
      AND cc.is_group = false
  )
  SELECT 
    cc.id as conversation_id,
    COALESCE(cc.is_group, false) as is_group,
    cc.group_name,
    cc.group_icon,
    op.user_id as other_user_id,
    op.full_name as other_user_name,
    COALESCE(op.role::text, 'viewer') as other_user_role,
    lm.content as last_message_content,
    lm.message_type as last_message_type,
    lm.created_at as last_message_created_at,
    lm.sender_name as last_message_sender_name,
    COALESCE(uc.unread, 0) as unread_count,
    cc.updated_at
  FROM chat_conversations cc
  JOIN user_participations up ON up.conversation_id = cc.id
  LEFT JOIN last_messages lm ON lm.conversation_id = cc.id
  LEFT JOIN unread_counts uc ON uc.conversation_id = cc.id
  LEFT JOIN other_participants op ON op.conversation_id = cc.id
  ORDER BY 
    COALESCE(uc.unread, 0) > 0 DESC,
    cc.updated_at DESC NULLS LAST;
$$;

-- RPC para buscar todos usuários com info de conversa existente
CREATE OR REPLACE FUNCTION public.get_all_users_with_conversations(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  role text,
  conversation_id uuid,
  last_message_content text,
  last_message_type text,
  last_message_created_at timestamptz,
  unread_count bigint,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_conversations AS (
    SELECT 
      cc.id as conv_id,
      cc.updated_at,
      cp_other.user_id as other_user_id
    FROM chat_conversations cc
    JOIN chat_participants cp_me ON cp_me.conversation_id = cc.id AND cp_me.user_id = p_user_id
    JOIN chat_participants cp_other ON cp_other.conversation_id = cc.id AND cp_other.user_id != p_user_id
    WHERE cc.is_group = false
  ),
  last_messages AS (
    SELECT DISTINCT ON (cm.conversation_id)
      cm.conversation_id,
      cm.content,
      cm.message_type,
      cm.created_at
    FROM chat_messages cm
    WHERE cm.deleted_at IS NULL
    ORDER BY cm.conversation_id, cm.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      cm.conversation_id,
      COUNT(*) as unread
    FROM chat_messages cm
    JOIN chat_participants cp ON cp.conversation_id = cm.conversation_id AND cp.user_id = p_user_id
    WHERE cm.sender_id != p_user_id
      AND cm.deleted_at IS NULL
      AND cm.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
    GROUP BY cm.conversation_id
  )
  SELECT 
    p.id as user_id,
    COALESCE(p.full_name, 'Sem nome') as full_name,
    COALESCE(ur.role::text, 'viewer') as role,
    uc.conv_id as conversation_id,
    lm.content as last_message_content,
    lm.message_type as last_message_type,
    lm.created_at as last_message_created_at,
    COALESCE(urc.unread, 0) as unread_count,
    uc.updated_at
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  LEFT JOIN user_conversations uc ON uc.other_user_id = p.id
  LEFT JOIN last_messages lm ON lm.conversation_id = uc.conv_id
  LEFT JOIN unread_counts urc ON urc.conversation_id = uc.conv_id
  WHERE p.id != p_user_id
  ORDER BY 
    COALESCE(urc.unread, 0) > 0 DESC,
    uc.updated_at DESC NULLS LAST,
    p.full_name ASC;
$$;

-- RPC para contar total de mensagens não lidas
CREATE OR REPLACE FUNCTION public.get_total_unread_count(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(unread), 0)::bigint
  FROM (
    SELECT COUNT(*) as unread
    FROM chat_messages cm
    JOIN chat_participants cp ON cp.conversation_id = cm.conversation_id AND cp.user_id = p_user_id
    WHERE cm.sender_id != p_user_id
      AND cm.deleted_at IS NULL
      AND cm.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
  ) sub;
$$;