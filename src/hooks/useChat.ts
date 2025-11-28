import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatConversation {
  id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  other_user: {
    id: string;
    full_name: string;
  };
  last_message?: {
    content: string;
    created_at: string;
    message_type: string;
  };
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  audio_duration: number | null;
  created_at: string;
  sender_name: string;
}

export const useChat = (conversationId: string | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!conversationId) return;

    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Buscar nome do remetente
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", payload.new.sender_id)
            .single();

          const newMessage: ChatMessage = {
            ...payload.new,
            sender_name: profile?.full_name || "Desconhecido",
          } as ChatMessage;

          setMessages((prev) => [...prev, newMessage]);

          // Atualizar last_read_at
          if (payload.new.sender_id !== currentUserId) {
            await supabase
              .from("chat_participants")
              .update({ last_read_at: new Date().toISOString() })
              .eq("conversation_id", conversationId)
              .eq("user_id", currentUserId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadMessages = async () => {
    if (!conversationId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(full_name)
        `)
        .eq("conversation_id", conversationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formatted: ChatMessage[] = (data || []).map((msg: any) => ({
        ...msg,
        sender_name: msg.sender?.full_name || "Desconhecido",
      }));

      setMessages(formatted);

      // Marcar como lido
      if (currentUserId) {
        await supabase
          .from("chat_participants")
          .update({ last_read_at: new Date().toISOString() })
          .eq("conversation_id", conversationId)
          .eq("user_id", currentUserId);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (
    content: string | null,
    messageType: string = "text",
    fileUrl: string | null = null,
    fileName: string | null = null,
    audioDuration: number | null = null
  ) => {
    if (!conversationId || !currentUserId) return;

    try {
      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content,
        message_type: messageType,
        file_url: fileUrl,
        file_name: fileName,
        audio_duration: audioDuration,
      });

      if (error) throw error;

      // Atualizar updated_at da conversa
      await supabase
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${conversationId}/${Date.now()}.${fileExt}`;
    const filePath = `chat-files/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-files")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("chat-files").getPublicUrl(filePath);

    return publicUrl;
  };

  return {
    messages,
    loading,
    sendMessage,
    uploadFile,
    currentUserId,
  };
};
