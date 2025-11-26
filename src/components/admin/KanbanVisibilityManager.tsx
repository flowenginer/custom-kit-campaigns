import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppRole } from "@/hooks/useUserRole";
import { Loader2, Users, RefreshCw } from "lucide-react";

interface RoleDefaults {
  id: string;
  role: AppRole;
  allowed_columns: string[];
}

interface UserWithCustomSettings {
  id: string;
  email: string;
  full_name: string | null;
  roles: AppRole[];
  allowed_kanban_columns: string[];
}

const allKanbanColumns = [
  { id: 'pending', label: 'Novos Com Logo', icon: '📋' },
  { id: 'in_progress', label: 'Em Progresso', icon: '🎨' },
  { id: 'awaiting_approval', label: 'Aguard. Aprovação', icon: '⏳' },
  { id: 'changes_requested', label: 'Revisão Necessária', icon: '🔄' },
  { id: 'approved', label: 'Aprovado', icon: '✅' },
  { id: 'completed', label: 'Produção', icon: '📦' },
];

const roleInfo: Record<AppRole, { label: string; icon: string; description: string }> = {
  salesperson: { label: 'Vendedor', icon: '👔', description: 'Vendedores precisam ver mockups para aprovação' },
  designer: { label: 'Designer', icon: '🎨', description: 'Designers trabalham em todas as etapas' },
  admin: { label: 'Admin', icon: '⚙️', description: 'Administradores têm visão completa' },
  super_admin: { label: 'Super Admin', icon: '👑', description: 'Acesso total ao sistema' },
  viewer: { label: 'Visualizador', icon: '👁️', description: 'Apenas visualização' },
};

export const KanbanVisibilityManager = () => {
  const [roleDefaults, setRoleDefaults] = useState<RoleDefaults[]>([]);
  const [usersWithCustom, setUsersWithCustom] = useState<UserWithCustomSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  
  // Estados para edição de cada papel
  const [editingRole, setEditingRole] = useState<Record<AppRole, string[]>>({
    salesperson: [],
    designer: [],
    admin: [],
    super_admin: [],
    viewer: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Buscar configurações padrão por papel
      const { data: defaults, error: defaultsError } = await supabase
        .from('role_kanban_defaults')
        .select('*')
        .order('role');

      if (defaultsError) throw defaultsError;
      
      if (defaults) {
        setRoleDefaults(defaults);
        const editingState: Record<AppRole, string[]> = {} as any;
        defaults.forEach((def) => {
          editingState[def.role as AppRole] = def.allowed_columns || [];
        });
        setEditingRole(editingState);
      }

      // Buscar usuários com configurações personalizadas
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, allowed_kanban_columns')
        .not('allowed_kanban_columns', 'is', null);

      if (profilesError) throw profilesError;

      if (profiles && profiles.length > 0) {
        // Buscar emails e roles dos usuários
        const userIds = profiles.map(p => p.id);
        
        const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
        if (usersError) throw usersError;

        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);

        if (rolesError) throw rolesError;

        const usersMap = new Map<string, string>();
        if (users) {
          for (const u of users) {
            if (u.email) {
              usersMap.set(u.id, u.email);
            }
          }
        }
        
        const rolesMap = new Map<string, AppRole[]>();
        rolesData?.forEach(r => {
          if (!rolesMap.has(r.user_id)) rolesMap.set(r.user_id, []);
          rolesMap.get(r.user_id)?.push(r.role as AppRole);
        });

        const customUsers: UserWithCustomSettings[] = profiles
          .map(p => {
            const email = usersMap.get(p.id);
            if (!email) return null;
            return {
              id: p.id,
              email,
              full_name: p.full_name,
              roles: rolesMap.get(p.id) || [],
              allowed_kanban_columns: p.allowed_kanban_columns as string[],
            };
          })
          .filter((u): u is UserWithCustomSettings => u !== null);

        setUsersWithCustom(customUsers);
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async (role: AppRole) => {
    setSaving(role);
    try {
      const columns = editingRole[role];
      
      if (columns.length === 0) {
        toast.error('Selecione pelo menos uma coluna');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('role_kanban_defaults')
        .update({ 
          allowed_columns: columns,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('role', role);

      if (error) throw error;

      toast.success(`Configuração do papel "${roleInfo[role].label}" salva com sucesso!`);
      await loadData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(null);
    }
  };

  const handleResetUserToDefault = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ allowed_kanban_columns: null })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Usuário resetado para padrão do papel');
      await loadData();
    } catch (error: any) {
      console.error('Erro ao resetar:', error);
      toast.error('Erro ao resetar usuário');
    }
  };

  const toggleColumn = (role: AppRole, columnId: string) => {
    setEditingRole(prev => {
      const current = prev[role] || [];
      const updated = current.includes(columnId)
        ? current.filter(c => c !== columnId)
        : [...current, columnId];
      return { ...prev, [role]: updated };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Visibilidade de Colunas - Gestão de Criação</h2>
          <p className="text-muted-foreground mt-1">
            Configure quais colunas cada papel pode ver no quadro Kanban
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Seção 1: Configuração por Papel */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Configuração Padrão por Papel</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(['salesperson', 'designer', 'admin', 'super_admin'] as AppRole[]).map((role) => {
            const info = roleInfo[role];
            const currentColumns = editingRole[role] || [];
            
            return (
              <Card key={role}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{info.icon}</span>
                    {info.label}
                  </CardTitle>
                  <CardDescription>{info.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-2">
                    {allKanbanColumns.map((col) => (
                      <div 
                        key={col.id} 
                        className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          id={`${role}-${col.id}`}
                          checked={currentColumns.includes(col.id)}
                          onCheckedChange={() => toggleColumn(role, col.id)}
                        />
                        <Label 
                          htmlFor={`${role}-${col.id}`}
                          className="flex-1 text-sm cursor-pointer flex items-center gap-2"
                        >
                          <span>{col.icon}</span>
                          {col.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      {currentColumns.length} de {allKanbanColumns.length} colunas
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleSaveRole(role)}
                      disabled={saving === role || currentColumns.length === 0}
                    >
                      {saving === role ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Seção 2: Usuários com Configuração Personalizada */}
      {usersWithCustom.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Usuários com Configuração Personalizada</h3>
            <p className="text-sm text-muted-foreground">
              Estes usuários têm configurações diferentes do padrão do papel
            </p>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Papel(is)</TableHead>
                    <TableHead>Colunas</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersWithCustom.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || 'Sem nome'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map(r => (
                            <Badge key={r} variant="outline" className="text-xs">
                              {roleInfo[r]?.label || r}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {user.allowed_kanban_columns.length} / {allKanbanColumns.length}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetUserToDefault(user.id)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Resetar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
