import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Save, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppRole } from "@/hooks/useUserRole";

interface RoleDefaults {
  id: string;
  role: AppRole;
  allowed_menu_items: string[];
}

interface UserWithCustomSettings {
  id: string;
  email: string;
  full_name: string | null;
  roles: AppRole[];
  allowed_menu_items: string[];
}

// Lista completa de todos os itens de menu disponíveis
const allMenuItems = [
  { id: 'dashboard', label: 'Dashboard', description: 'Painel principal com métricas' },
  { id: 'data_cross', label: 'Data Cross', description: 'Análises avançadas de dados' },
  { id: 'ranking', label: 'Ranking', description: 'Ranking de produção' },
  { id: 'segments', label: 'Segmentos', description: 'Gerenciar segmentos' },
  { id: 'models', label: 'Modelos', description: 'Gerenciar modelos de uniforme' },
  { id: 'campaigns', label: 'Campanhas', description: 'Gerenciar campanhas' },
  { id: 'leads', label: 'Leads', description: 'Visualizar leads' },
  { id: 'workflows', label: 'Workflows', description: 'Gerenciar fluxos de trabalho' },
  { id: 'ab_tests', label: 'Testes A/B', description: 'Gerenciar testes A/B' },
  { id: 'creation', label: 'Criação', description: 'Kanban de tarefas de design' },
  { id: 'orders', label: 'Pedidos', description: 'Visualizar pedidos' },
  { id: 'approvals', label: 'Aprovações', description: 'Aprovar solicitações urgentes' },
  { id: 'api', label: 'API', description: 'Configurar webhooks e integrações' },
  { id: 'settings', label: 'Configurações', description: 'Configurações do sistema' },
  { id: 'themes', label: 'Temas', description: 'Gerenciar temas visuais' },
];

const roleInfo: Record<AppRole, { label: string; description: string }> = {
  super_admin: { label: 'Super Admin', description: 'Acesso total ao sistema' },
  admin: { label: 'Admin', description: 'Acesso administrativo' },
  designer: { label: 'Designer', description: 'Acesso a tarefas de design' },
  salesperson: { label: 'Vendedor', description: 'Acesso a pedidos e temas' },
  viewer: { label: 'Visualizador', description: 'Acesso somente leitura' },
};

export const MenuVisibilityManager = () => {
  const [roleDefaults, setRoleDefaults] = useState<RoleDefaults[]>([]);
  const [usersWithCustom, setUsersWithCustom] = useState<UserWithCustomSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [editingItems, setEditingItems] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar configurações padrão por role
      const { data: defaults, error: defaultsError } = await supabase
        .from('role_menu_defaults')
        .select('*')
        .order('role');

      if (defaultsError) throw defaultsError;
      setRoleDefaults(defaults || []);

      // Carregar usuários com configuração personalizada
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/manage-users?action=list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        }
      });

      const userData = await response.json();
      if (!response.ok) throw new Error(userData.error || 'Erro ao carregar usuários');

      if (userData.success) {
        const usersWithSettings = userData.data.filter(
          (user: any) => user.profile?.allowed_menu_items && user.profile.allowed_menu_items.length > 0
        ).map((user: any) => ({
          id: user.id,
          email: user.email,
          full_name: user.profile?.full_name || null,
          roles: user.roles || [],
          allowed_menu_items: user.profile.allowed_menu_items,
        }));
        setUsersWithCustom(usersWithSettings);
      }
    } catch (error: any) {
      toast.error('Erro ao carregar configurações');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMenuItem = (itemId: string) => {
    setEditingItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSaveRole = async (role: AppRole) => {
    try {
      const roleDefault = roleDefaults.find(r => r.role === role);
      if (!roleDefault) return;

      const { error } = await supabase
        .from('role_menu_defaults')
        .update({
          allowed_menu_items: editingItems,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roleDefault.id);

      if (error) throw error;

      toast.success(`Configuração de ${roleInfo[role].label} atualizada`);
      setEditingRole(null);
      loadData();
    } catch (error: any) {
      toast.error('Erro ao salvar configuração');
      console.error(error);
    }
  };

  const handleResetUserToDefault = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/manage-users?action=update_roles`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          user_id: userId,
          allowed_menu_items: null, // Reset para padrão da role
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao resetar');

      if (data.success) {
        toast.success('Usuário resetado para padrão da role');
        loadData();
      }
    } catch (error: any) {
      toast.error('Erro ao resetar usuário');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Visibilidade do Menu</h2>
          <p className="text-muted-foreground">
            Configure quais itens de menu cada role pode ver por padrão
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Seção 1: Padrões por Role */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Configurações Padrão por Função</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['salesperson', 'designer', 'admin', 'super_admin'] as AppRole[]).map((role) => {
            const roleDefault = roleDefaults.find(r => r.role === role);
            if (!roleDefault) return null;

            const isEditing = editingRole === role;
            const currentItems = isEditing ? editingItems : roleDefault.allowed_menu_items;

            return (
              <Card key={role}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {roleInfo[role].label}
                    <Badge variant="secondary">{currentItems.length} itens</Badge>
                  </CardTitle>
                  <CardDescription>{roleInfo[role].description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {allMenuItems.map((item) => (
                      <div key={item.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={`${role}-${item.id}`}
                          checked={currentItems.includes(item.id)}
                          disabled={!isEditing}
                          onCheckedChange={() => isEditing && toggleMenuItem(item.id)}
                        />
                        <div className="grid gap-1 leading-none">
                          <Label
                            htmlFor={`${role}-${item.id}`}
                            className={`text-sm font-medium ${!isEditing ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            {item.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    {!isEditing ? (
                      <Button
                        onClick={() => {
                          setEditingRole(role);
                          setEditingItems(roleDefault.allowed_menu_items);
                        }}
                        className="w-full"
                        variant="outline"
                      >
                        Editar
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleSaveRole(role)}
                          className="flex-1"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Salvar
                        </Button>
                        <Button
                          onClick={() => setEditingRole(null)}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Seção 2: Usuários com Override */}
      {usersWithCustom.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Usuários com Configuração Personalizada</h3>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Funções</TableHead>
                    <TableHead>Itens Visíveis</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersWithCustom.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || 'Sem nome'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {user.roles.map((role) => (
                            <Badge key={role} variant="outline">
                              {roleInfo[role]?.label || role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {user.allowed_menu_items.length} itens
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleResetUserToDefault(user.id)}
                          variant="ghost"
                          size="sm"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Resetar para Padrão
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
