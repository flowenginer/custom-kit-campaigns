import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
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
  updated_at: string;
}

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
  selectedConversationId: string | null;
}

export const ConversationList = ({
  onSelectConversation,
  onNewConversation,
  selectedConversationId,
}: ConversationListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    loadConversations();

    const channel = supabase
      .channel("conversations_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
        },
        () => {
          loadConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_participants",
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadConversations = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      // Buscar conversas do usuário
      const { data: participations, error: partError } = await supabase
        .from("chat_participants")
        .select(`
          conversation_id,
          last_read_at,
          conversations:chat_conversations!inner(
            id,
            created_at,
            updated_at
          )
        `)
        .eq("user_id", currentUserId);

      if (partError) throw partError;

      const conversationsList: Conversation[] = [];

      for (const part of participations || []) {
        const convId = part.conversation_id;

        // Buscar outro participante
        const { data: otherPart } = await supabase
          .from("chat_participants")
          .select("user_id, profiles!inner(id, full_name)")
          .eq("conversation_id", convId)
          .neq("user_id", currentUserId)
          .single();

        if (!otherPart) continue;

        // Buscar última mensagem
        const { data: lastMsg } = await supabase
          .from("chat_messages")
          .select("content, created_at, message_type")
          .eq("conversation_id", convId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Contar não lidas
        const { count: unreadCount } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", convId)
          .neq("sender_id", currentUserId)
          .gt("created_at", part.last_read_at);

        conversationsList.push({
          id: convId,
          other_user: {
            id: (otherPart as any).profiles.id,
            full_name: (otherPart as any).profiles.full_name,
          },
          last_message: lastMsg || undefined,
          unread_count: unreadCount || 0,
          updated_at: (part as any).conversations.updated_at,
        });
      }

      // Ordenar por mais recente
      conversationsList.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setConversations(conversationsList);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.other_user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const getMessagePreview = (conv: Conversation) => {
    if (!conv.last_message) return "Nenhuma mensagem ainda";

    if (conv.last_message.message_type === "audio") return "🎤 Áudio";
    if (conv.last_message.message_type === "file") return "📎 Arquivo";
    if (conv.last_message.message_type === "image") return "🖼️ Imagem";

    return conv.last_message.content || "";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onNewConversation} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Conversa
        </Button>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
            {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={cn(
                  "w-full p-4 flex items-start gap-3 hover:bg-accent/10 transition-colors text-left",
                  selectedConversationId === conv.id && "bg-accent/20"
                )}
              >
                <Avatar className="flex-shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(conv.other_user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium truncate">
                      {conv.other_user.full_name}
                    </span>
                    {conv.last_message && (
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {format(new Date(conv.last_message.created_at), "HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground truncate">
                      {getMessagePreview(conv)}
                    </p>
                    {conv.unread_count > 0 && (
                      <Badge className="bg-primary text-primary-foreground text-xs flex-shrink-0">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
