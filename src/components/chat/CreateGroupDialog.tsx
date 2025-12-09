import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  full_name: string;
  role: string;
}

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated: (conversationId: string) => void;
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

export const CreateGroupDialog = ({
  open,
  onOpenChange,
  onGroupCreated,
}: CreateGroupDialogProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupIcon, setGroupIcon] = useState("👥");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadUsers();
      setGroupName("");
      setGroupIcon("👥");
      setSelectedUsers([]);
    }
  }, [open]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Buscar todos os usuários com suas roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");

      if (profilesError) throw profilesError;

      // Buscar roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const usersWithRoles: User[] = (profiles || [])
        .filter((p) => p.id !== user?.id)
        .map((profile) => {
          const userRole = roles?.find((r) => r.user_id === profile.id);
          return {
            id: profile.id,
            full_name: profile.full_name || "Sem nome",
            role: userRole?.role || "viewer",
          };
        });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (role: string) => {
    const usersWithRole = users.filter((u) => u.role === role).map((u) => u.id);
    const allSelected = usersWithRole.every((id) => selectedUsers.includes(id));

    if (allSelected) {
      setSelectedUsers(selectedUsers.filter((id) => !usersWithRole.includes(id)));
    } else {
      setSelectedUsers([...new Set([...selectedUsers, ...usersWithRole])]);
    }
  };

  const handleToggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Digite um nome para o grupo");
      return;
    }
    if (selectedUsers.length < 1) {
      toast.error("Selecione pelo menos 1 participante");
      return;
    }
    if (!currentUserId) {
      toast.error("Usuário não autenticado");
      return;
    }

    setCreating(true);
    try {
      // Criar conversa como grupo
      const { data: conversation, error: convError } = await supabase
        .from("chat_conversations")
        .insert({
          created_by: currentUserId,
          is_group: true,
          group_name: groupName.trim(),
          group_icon: groupIcon,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Adicionar participantes (incluindo o criador)
      const participants = [currentUserId, ...selectedUsers].map((userId) => ({
        conversation_id: conversation.id,
        user_id: userId,
      }));

      const { error: partError } = await supabase
        .from("chat_participants")
        .insert(participants);

      if (partError) throw partError;

      toast.success("Grupo criado com sucesso!");
      onGroupCreated(conversation.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Erro ao criar grupo");
    } finally {
      setCreating(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const groupedUsers = users.reduce((acc, user) => {
    if (!acc[user.role]) acc[user.role] = [];
    acc[user.role].push(user);
    return acc;
  }, {} as Record<string, User[]>);

  const icons = ["👥", "💼", "🎨", "💬", "🏢", "⭐", "🔥", "📢"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Criar Grupo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome e Ícone */}
          <div className="space-y-2">
            <Label>Nome do Grupo</Label>
            <div className="flex gap-2">
              <div className="flex gap-1">
                {icons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setGroupIcon(icon)}
                    className={`p-2 rounded hover:bg-muted transition-colors ${
                      groupIcon === icon ? "bg-muted ring-2 ring-primary" : ""
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <Input
              placeholder="Ex: Vendedores, Designers..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          {/* Seleção de participantes */}
          <div className="space-y-2">
            <Label>Participantes ({selectedUsers.length} selecionados)</Label>
            <ScrollArea className="h-[300px] border rounded-md p-2">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedUsers).map(([role, roleUsers]) => (
                    <div key={role} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="secondary"
                          className={`${ROLE_COLORS[role]} text-white`}
                        >
                          {ROLE_LABELS[role] || role}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectAll(role)}
                          className="text-xs"
                        >
                          Selecionar todos
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {roleUsers.map((user) => (
                          <label
                            key={user.id}
                            className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={() => handleToggleUser(user.id)}
                            />
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {getInitials(user.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{user.full_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGroup} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Grupo"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};