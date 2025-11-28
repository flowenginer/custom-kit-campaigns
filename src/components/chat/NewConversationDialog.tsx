import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";

interface User {
  id: string;
  full_name: string;
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string) => void;
}

export const NewConversationDialog = ({
  open,
  onOpenChange,
  onConversationCreated,
}: NewConversationDialogProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      getCurrentUser();
      loadUsers();
    }
  }, [open]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .neq("id", user.id)
        .order("full_name");

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConversation = async (otherUserId: string) => {
    if (!currentUserId) return;

    setCreating(true);
    try {
      // Verificar se já existe conversa
      const { data: existingParticipations } = await supabase
        .from("chat_participants")
        .select("conversation_id")
        .eq("user_id", currentUserId);

      if (existingParticipations) {
        for (const part of existingParticipations) {
          const { data: otherPart } = await supabase
            .from("chat_participants")
            .select("conversation_id")
            .eq("conversation_id", part.conversation_id)
            .eq("user_id", otherUserId)
            .single();

          if (otherPart) {
            // Conversa já existe
            onConversationCreated(part.conversation_id);
            onOpenChange(false);
            return;
          }
        }
      }

      // Criar nova conversa
      const { data: newConv, error: convError } = await supabase
        .from("chat_conversations")
        .insert({ created_by: currentUserId })
        .select()
        .single();

      if (convError) throw convError;

      // Adicionar participantes
      const { error: partError } = await supabase
        .from("chat_participants")
        .insert([
          { conversation_id: newConv.id, user_id: currentUserId },
          { conversation_id: newConv.id, user_id: otherUserId },
        ]);

      if (partError) throw partError;

      onConversationCreated(newConv.id);
      onOpenChange(false);
      toast.success("Conversa criada!");
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Erro ao criar conversa");
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Nova Conversa</DialogTitle>
          <DialogDescription>Selecione um usuário para iniciar uma conversa</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuário..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[300px] border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
                Nenhum usuário encontrado
              </div>
            ) : (
              <div className="divide-y">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleCreateConversation(user.id)}
                    disabled={creating}
                    className="w-full p-3 flex items-center gap-3 hover:bg-accent/10 transition-colors text-left"
                  >
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.full_name}</span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
