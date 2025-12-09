import { useState, useEffect } from "react";
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

    const channel = supabase
      .channel("conversations_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_participants" },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_conversations" },
        () => loadData()
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

  const loadData = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      // 1. Buscar TODOS os usuários com suas roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // 2. Buscar conversas do usuário atual
      const { data: myParticipations, error: partError } = await supabase
        .from("chat_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", currentUserId);

      if (partError) throw partError;

      const myConvIds = myParticipations?.map((p) => p.conversation_id) || [];

      // 3. Buscar detalhes das conversas
      const { data: conversations, error: convError } = await supabase
        .from("chat_conversations")
        .select("id, is_group, group_name, group_icon, updated_at")
        .in("id", myConvIds.length > 0 ? myConvIds : ["00000000-0000-0000-0000-000000000000"]);

      if (convError) throw convError;

      // 4. Separar grupos e conversas individuais
      const groupConvs = conversations?.filter((c) => c.is_group) || [];
      const individualConvs = conversations?.filter((c) => !c.is_group) || [];

      // 5. Para conversas individuais, mapear para o outro usuário
      const convToOtherUser: Record<string, string> = {};
      for (const conv of individualConvs) {
        const { data: otherPart } = await supabase
          .from("chat_participants")
          .select("user_id")
          .eq("conversation_id", conv.id)
          .neq("user_id", currentUserId)
          .single();

        if (otherPart) {
          convToOtherUser[conv.id] = otherPart.user_id;
        }
      }

      // 6. Montar lista de usuários com info de conversa
      const usersList: UserWithConversation[] = [];

      for (const profile of profiles || []) {
        if (profile.id === currentUserId) continue;

        const userRole = roles?.find((r) => r.user_id === profile.id);
        
        // Verificar se já existe conversa com este usuário
        const existingConvId = Object.entries(convToOtherUser).find(
          ([_, otherId]) => otherId === profile.id
        )?.[0];

        let lastMessage;
        let unreadCount = 0;
        let updatedAt = null;

        if (existingConvId) {
          // Buscar última mensagem
          const { data: lastMsg } = await supabase
            .from("chat_messages")
            .select("content, created_at, message_type")
            .eq("conversation_id", existingConvId)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          lastMessage = lastMsg || undefined;

          // Buscar last_read_at
          const participation = myParticipations?.find(
            (p) => p.conversation_id === existingConvId
          );

          // Contar não lidas
          const { count } = await supabase
            .from("chat_messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", existingConvId)
            .neq("sender_id", currentUserId)
            .gt("created_at", participation?.last_read_at || "1970-01-01");

          unreadCount = count || 0;

          const conv = individualConvs.find((c) => c.id === existingConvId);
          updatedAt = conv?.updated_at || null;
        }

        usersList.push({
          id: profile.id,
          full_name: profile.full_name || "Sem nome",
          role: userRole?.role || "viewer",
          conversation_id: existingConvId || null,
          last_message: lastMessage,
          unread_count: unreadCount,
          updated_at: updatedAt,
        });
      }

      // 7. Ordenar: não lidas primeiro, depois por última mensagem
      usersList.sort((a, b) => {
        if (a.unread_count > 0 && b.unread_count === 0) return -1;
        if (a.unread_count === 0 && b.unread_count > 0) return 1;
        if (a.updated_at && b.updated_at) {
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
        if (a.updated_at) return -1;
        if (b.updated_at) return 1;
        return a.full_name.localeCompare(b.full_name);
      });

      setUsers(usersList);

      // 8. Processar grupos
      const groupsList: GroupConversation[] = [];

      for (const group of groupConvs) {
        const { data: lastMsg } = await supabase
          .from("chat_messages")
          .select("content, created_at, message_type, sender:profiles!chat_messages_sender_id_fkey(full_name)")
          .eq("conversation_id", group.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const participation = myParticipations?.find(
          (p) => p.conversation_id === group.id
        );

        const { count } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", group.id)
          .neq("sender_id", currentUserId)
          .gt("created_at", participation?.last_read_at || "1970-01-01");

        groupsList.push({
          id: group.id,
          group_name: group.group_name || "Grupo",
          group_icon: group.group_icon || "👥",
          last_message: lastMsg ? {
            content: lastMsg.content,
            created_at: lastMsg.created_at,
            message_type: lastMsg.message_type,
            sender_name: (lastMsg.sender as any)?.full_name || "Desconhecido",
          } : undefined,
          unread_count: count || 0,
          updated_at: group.updated_at,
        });
      }

      // Ordenar grupos
      groupsList.sort((a, b) => {
        if (a.unread_count > 0 && b.unread_count === 0) return -1;
        if (a.unread_count === 0 && b.unread_count > 0) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      setGroups(groupsList);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = async (user: UserWithConversation) => {
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

  const filteredUsers = users.filter((u) =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter((g) =>
    g.group_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const usersWithMessages = filteredUsers.filter((u) => u.conversation_id && u.last_message);
  const usersWithoutMessages = filteredUsers.filter((u) => !u.conversation_id || !u.last_message);

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
                            {format(new Date(group.last_message.created_at), "HH:mm", { locale: ptBR })}
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
                          <span 
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-background",
                              "flex items-center justify-center text-[9px] text-white font-bold shadow-sm",
                              ROLE_COLORS[user.role]
                            )}
                            title={ROLE_LABELS[user.role]}
                          >
                            {ROLE_LABELS[user.role]?.charAt(0) || "?"}
                          </span>
                        </div>
                        
                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm truncate">{user.full_name}</span>
                            {user.last_message && (
                              <span className="text-[11px] text-muted-foreground ml-2 flex-shrink-0">
                                {formatRelativeDate(user.last_message.created_at)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-muted-foreground truncate max-w-[180px] flex items-center gap-1">
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
                {usersWithoutMessages.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={cn(
                      "w-full p-3 flex items-center gap-3 hover:bg-accent/10 transition-colors text-left",
                      selectedConversationId === user.conversation_id && "bg-accent/20"
                    )}
                  >
                    <Avatar className="flex-shrink-0 h-8 w-8">
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate flex-1">{user.full_name}</span>
                    <Badge
                      variant="secondary"
                      className={cn("text-[10px] px-1.5", ROLE_COLORS[user.role], "text-white")}
                    >
                      {ROLE_LABELS[user.role] || user.role}
                    </Badge>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};