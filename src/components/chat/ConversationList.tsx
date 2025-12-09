import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Loader2, Mic, Paperclip, Image } from "lucide-react";
import { format, isToday, isYesterday, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const formatRelativeDate = (dateString: string) => {
  const date = new Date(dateString);
  if (isToday(date)) return format(date, "HH:mm", { locale: ptBR });
  if (isYesterday(date)) return "Ontem";
  if (differenceInDays(new Date(), date) < 7) {
    return format(date, "EEE", { locale: ptBR });
  }
  return format(date, "dd/MM", { locale: ptBR });
};

interface UserWithConversation {
  id: string;
  full_name: string;
  role: string;
  conversation_id: string | null;
  last_message?: {
    content: string;
    created_at: string;
    message_type: string;
  };
  unread_count: number;
  updated_at: string | null;
}

interface GroupConversation {
  id: string;
  group_name: string;
  group_icon: string;
  last_message?: {
    content: string;
    created_at: string;
    message_type: string;
    sender_name: string;
  };
  unread_count: number;
  updated_at: string;
}

interface ConversationListProps {
  onSelectConversation: (conversation: any) => void;
  onCreateGroup: () => void;
  selectedConversationId: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  designer: "Designer",
  salesperson: "Vendedor",
  viewer: "Visualizador",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-500",
  admin: "bg-orange-500",
  designer: "bg-purple-500",
  salesperson: "bg-blue-500",
  viewer: "bg-gray-500",
};

export const ConversationList = ({
  onSelectConversation,
  onCreateGroup,
  selectedConversationId,
}: ConversationListProps) => {
  const [users, setUsers] = useState<UserWithConversation[]>([]);
  const [groups, setGroups] = useState<GroupConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    loadData();

    // Realtime subscription - atualização granular
    const channel = supabase
      .channel("conversations_updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          // Atualizar apenas a conversa afetada
          const convId = payload.new.conversation_id;
          updateConversationFromRealtime(convId, payload.new);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_conversations" },
        () => loadData() // Novo grupo/conversa - reload
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

  // Atualização granular quando nova mensagem chega
  const updateConversationFromRealtime = useCallback(async (
    conversationId: string, 
    newMessage: any
  ) => {
    if (!currentUserId) return;

    // Atualizar grupos se for um grupo
    setGroups(prev => {
      const groupIndex = prev.findIndex(g => g.id === conversationId);
      if (groupIndex === -1) return prev;

      const updated = [...prev];
      const group = { ...updated[groupIndex] };
      
      group.last_message = {
        content: newMessage.content,
        created_at: newMessage.created_at,
        message_type: newMessage.message_type,
        sender_name: "", // Será atualizado na próxima carga completa
      };
      
      if (newMessage.sender_id !== currentUserId) {
        group.unread_count = (group.unread_count || 0) + 1;
      }
      
      group.updated_at = newMessage.created_at;
      updated[groupIndex] = group;
      
      // Reordenar
      updated.sort((a, b) => {
        if (a.unread_count > 0 && b.unread_count === 0) return -1;
        if (a.unread_count === 0 && b.unread_count > 0) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      
      return updated;
    });

    // Atualizar usuários
    setUsers(prev => {
      const userIndex = prev.findIndex(u => u.conversation_id === conversationId);
      if (userIndex === -1) return prev;

      const updated = [...prev];
      const user = { ...updated[userIndex] };
      
      user.last_message = {
        content: newMessage.content,
        created_at: newMessage.created_at,
        message_type: newMessage.message_type,
      };
      
      if (newMessage.sender_id !== currentUserId) {
        user.unread_count = (user.unread_count || 0) + 1;
      }
      
      user.updated_at = newMessage.created_at;
      updated[userIndex] = user;
      
      // Reordenar
      updated.sort((a, b) => {
        if (a.unread_count > 0 && b.unread_count === 0) return -1;
        if (a.unread_count === 0 && b.unread_count > 0) return 1;
        if (a.updated_at && b.updated_at) {
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
        if (a.updated_at) return -1;
        if (b.updated_at) return 1;
        return a.full_name.localeCompare(b.full_name);
      });
      
      return updated;
    });
  }, [currentUserId]);

  const loadData = useCallback(async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      // 1. Buscar conversas via RPC otimizada (uma única query!)
      const { data: conversations, error: convError } = await supabase
        .rpc('get_user_conversations', { p_user_id: currentUserId });

      if (convError) throw convError;

      // 2. Buscar todos usuários com info de conversa via RPC
      const { data: allUsers, error: usersError } = await supabase
        .rpc('get_all_users_with_conversations', { p_user_id: currentUserId });

      if (usersError) throw usersError;

      // 3. Separar grupos das conversas
      const groupsList: GroupConversation[] = [];
      
      for (const conv of conversations || []) {
        if (conv.is_group) {
          groupsList.push({
            id: conv.conversation_id,
            group_name: conv.group_name || "Grupo",
            group_icon: conv.group_icon || "👥",
            last_message: conv.last_message_content ? {
              content: conv.last_message_content,
              created_at: conv.last_message_created_at,
              message_type: conv.last_message_type,
              sender_name: conv.last_message_sender_name || "",
            } : undefined,
            unread_count: Number(conv.unread_count) || 0,
            updated_at: conv.updated_at,
          });
        }
      }

      // 4. Montar lista de usuários
      const usersList: UserWithConversation[] = (allUsers || []).map((u: any) => ({
        id: u.user_id,
        full_name: u.full_name || "Sem nome",
        role: u.role || "viewer",
        conversation_id: u.conversation_id || null,
        last_message: u.last_message_content ? {
          content: u.last_message_content,
          created_at: u.last_message_created_at,
          message_type: u.last_message_type,
        } : undefined,
        unread_count: Number(u.unread_count) || 0,
        updated_at: u.updated_at || null,
      }));

      setGroups(groupsList);
      setUsers(usersList);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const handleSelectUser = async (user: UserWithConversation) => {
    // Zerar contagem de não lidas ao selecionar
    if (user.unread_count > 0) {
      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, unread_count: 0 } : u
      ));
    }

    if (user.conversation_id) {
      onSelectConversation({
        id: user.conversation_id,
        is_group: false,
        other_user: { id: user.id, full_name: user.full_name },
      });
    } else {
      // Criar nova conversa
      try {
        const { data: conversation, error: convError } = await supabase
          .from("chat_conversations")
          .insert({ created_by: currentUserId!, is_group: false })
          .select()
          .single();

        if (convError) throw convError;

        // Adicionar participantes
        const { error: partError } = await supabase
          .from("chat_participants")
          .insert([
            { conversation_id: conversation.id, user_id: currentUserId! },
            { conversation_id: conversation.id, user_id: user.id },
          ]);

        if (partError) throw partError;

        // Atualizar estado local
        setUsers(prev => prev.map(u => 
          u.id === user.id ? { ...u, conversation_id: conversation.id } : u
        ));

        onSelectConversation({
          id: conversation.id,
          is_group: false,
          other_user: { id: user.id, full_name: user.full_name },
        });
      } catch (error) {
        console.error("Error creating conversation:", error);
      }
    }
  };

  const handleSelectGroup = (group: GroupConversation) => {
    // Zerar contagem de não lidas ao selecionar
    if (group.unread_count > 0) {
      setGroups(prev => prev.map(g => 
        g.id === group.id ? { ...g, unread_count: 0 } : g
      ));
    }

    onSelectConversation({
      id: group.id,
      is_group: true,
      group_name: group.group_name,
      group_icon: group.group_icon,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const getMessagePreview = (msg?: { content: string; message_type: string; sender_name?: string }) => {
    if (!msg) return { text: "Nenhuma mensagem ainda", icon: null };

    let text = "";
    let icon = null;
    
    if (msg.message_type === "audio") {
      text = "Áudio";
      icon = <Mic className="h-3 w-3" />;
    } else if (msg.message_type === "file") {
      text = "Arquivo";
      icon = <Paperclip className="h-3 w-3" />;
    } else if (msg.message_type === "image") {
      text = "Imagem";
      icon = <Image className="h-3 w-3" />;
    } else {
      text = msg.content || "";
    }

    if (msg.sender_name) {
      text = `${msg.sender_name.split(" ")[0]}: ${text}`;
    }
    return { text, icon };
  };

  const filteredUsers = useMemo(() => 
    users.filter((u) =>
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [users, searchQuery]);

  const filteredGroups = useMemo(() => 
    groups.filter((g) =>
      g.group_name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [groups, searchQuery]);

  const usersWithMessages = useMemo(() => 
    filteredUsers.filter((u) => u.conversation_id && u.last_message),
    [filteredUsers]);
  
  const usersWithoutMessages = useMemo(() => 
    filteredUsers.filter((u) => !u.conversation_id || !u.last_message),
    [filteredUsers]);

  return (
    <div className="flex flex-col h-full">
      {/* Search + Create Group */}
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onCreateGroup} className="w-full" size="sm" variant="outline">
          <Users className="h-4 w-4 mr-2" />
          Criar Grupo
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="divide-y">
            {/* Grupos */}
            {filteredGroups.length > 0 && (
              <>
                <div className="px-4 py-2 bg-muted/50">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Grupos
                  </span>
                </div>
                {filteredGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleSelectGroup(group)}
                    className={cn(
                      "w-full p-4 flex items-start gap-3 hover:bg-accent/10 transition-colors text-left",
                      selectedConversationId === group.id && "bg-accent/20",
                      group.unread_count > 0 && "bg-primary/5"
                    )}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                      {group.group_icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate">{group.group_name}</span>
                        {group.last_message && (
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatRelativeDate(group.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                          {getMessagePreview(group.last_message).icon}
                          <span>{getMessagePreview(group.last_message).text}</span>
                        </p>
                        {group.unread_count > 0 && (
                          <Badge className="bg-destructive text-white text-[10px] h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full animate-pulse">
                            {group.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Conversas Recentes */}
            {usersWithMessages.length > 0 && (
              <>
                <div className="px-4 py-2 bg-muted/50">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Conversas Recentes
                  </span>
                </div>
                <div className="p-2 space-y-1">
                  {usersWithMessages.map((user) => {
                    const preview = getMessagePreview(user.last_message);
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className={cn(
                          "w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200 text-left",
                          "hover:bg-accent hover:shadow-sm",
                          selectedConversationId === user.conversation_id && "bg-accent shadow-sm ring-1 ring-primary/20",
                          user.unread_count > 0 && !selectedConversationId && "bg-primary/5"
                        )}
                      >
                        {/* Avatar com indicador de role */}
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                            <AvatarFallback className={cn(ROLE_COLORS[user.role], "text-white font-medium text-sm")}>
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          {/* Indicador de role pequeno */}
                          <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center",
                            ROLE_COLORS[user.role]
                          )}>
                            <span className="text-[8px] text-white font-bold">
                              {user.role === "super_admin" ? "S" : 
                               user.role === "admin" ? "A" :
                               user.role === "designer" ? "D" :
                               user.role === "salesperson" ? "V" : ""}
                            </span>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn(
                                "font-medium truncate",
                                user.unread_count > 0 && "font-semibold"
                              )}>
                                {user.full_name}
                              </span>
                            </div>
                            {user.last_message && (
                              <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                {formatRelativeDate(user.last_message.created_at)}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn(
                              "text-sm truncate flex items-center gap-1",
                              user.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                            )}>
                              {preview.icon}
                              <span>{preview.text}</span>
                            </p>
                            {user.unread_count > 0 && (
                              <Badge className="bg-destructive text-white text-[10px] h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full animate-pulse">
                                {user.unread_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Todos os Usuários */}
            {usersWithoutMessages.length > 0 && (
              <>
                <div className="px-4 py-2 bg-muted/50">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Todos os Usuários
                  </span>
                </div>
                <div className="p-2 space-y-1">
                  {usersWithoutMessages.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className={cn(
                        "w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200 text-left",
                        "hover:bg-accent hover:shadow-sm",
                        selectedConversationId === user.conversation_id && "bg-accent shadow-sm ring-1 ring-primary/20"
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                          <AvatarFallback className={cn(ROLE_COLORS[user.role], "text-white font-medium text-xs")}>
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{user.full_name}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {ROLE_LABELS[user.role] || user.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Iniciar conversa</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
