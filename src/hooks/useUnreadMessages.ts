import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUnreadMessages = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    fetchUnreadCount();

    // Realtime subscription - atualização incremental
    const messagesChannel = supabase
      .channel("unread_messages_optimized")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          // Incrementar se a mensagem não é do usuário atual
          if (payload.new.sender_id !== currentUserId) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_participants",
        },
        (payload) => {
          // Se last_read_at foi atualizado para o usuário atual, refetch
          if (payload.new.user_id === currentUserId && payload.new.last_read_at) {
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [currentUserId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchUnreadCount = useCallback(async () => {
    if (!currentUserId) return;

    try {
      // Usar RPC otimizada - uma única query!
      const { data, error } = await supabase
        .rpc('get_total_unread_count', { p_user_id: currentUserId });

      if (error) throw error;

      setUnreadCount(Number(data) || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, [currentUserId]);

  return { unreadCount, refetch: fetchUnreadCount };
};
