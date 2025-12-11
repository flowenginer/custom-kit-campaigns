import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Loader2, RefreshCw, Shield, ShieldCheck } from "lucide-react";
import { RoleConfig } from "@/hooks/useRolesConfig";

export const RolesManager = () => {
  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [roleKey, setRoleKey] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [roleIcon, setRoleIcon] = useState("👤");
  const [roleDescription, setRoleDescription] = useState("");
  const [roleActive, setRoleActive] = useState(true);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roles_config')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setRoles(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar perfis');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRoleKey("");
    setRoleLabel("");
    setRoleIcon("👤");
    setRoleDescription("");
    setRoleActive(true);
    setSelectedRole(null);
  };

  const handleCreateRole = async () => {
    if (!roleKey || !roleLabel) {
      toast.error('Chave e nome são obrigatórios');
      return;
    }

    // Validar formato da chave
    const keyRegex = /^[a-z_]+$/;
    if (!keyRegex.test(roleKey)) {
      toast.error('A chave deve conter apenas letras minúsculas e underscores');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('add_custom_role', {
        p_role_key: roleKey,
        p_label: roleLabel,
        p_icon: roleIcon,
        p_description: roleDescription || null,
      });

      if (error) throw error;

      toast.success('Perfil criado com sucesso!');
      setIsCreateDialogOpen(false);
      resetForm();
      loadRoles();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar perfil');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;

    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_custom_role', {
        p_role_key: selectedRole.role_key,
        p_label: roleLabel,
        p_icon: roleIcon,
        p_description: roleDescription || null,
        p_is_active: roleActive,
      });

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
      setIsEditDialogOpen(false);
      resetForm();
      loadRoles();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar perfil');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (role: RoleConfig) => {
    setSelectedRole(role);
    setRoleLabel(role.label);
    setRoleIcon(role.icon);
    setRoleDescription(role.description || "");
    setRoleActive(role.is_active);
    setIsEditDialogOpen(true);
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
          <h2 className="text-2xl font-bold">Gerenciamento de Perfis</h2>
          <p className="text-muted-foreground">
            Crie e gerencie os perfis de usuário do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadRoles}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Perfil
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Perfil</DialogTitle>
                <DialogDescription>
                  Crie um novo perfil de usuário para o sistema
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="roleKey">Chave do Perfil *</Label>
                  <Input
                    id="roleKey"
                    placeholder="production_manager"
                    value={roleKey}
                    onChange={(e) => setRoleKey(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use apenas letras minúsculas e underscores
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roleLabel">Nome do Perfil *</Label>
                  <Input
                    id="roleLabel"
                    placeholder="Gerente de Produção"
                    value={roleLabel}
                    onChange={(e) => setRoleLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roleIcon">Ícone (Emoji)</Label>
                  <Input
                    id="roleIcon"
                    placeholder="👤"
                    value={roleIcon}
                    onChange={(e) => setRoleIcon(e.target.value)}
                    className="w-24 text-2xl text-center"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roleDescription">Descrição</Label>
                  <Textarea
                    id="roleDescription"
                    placeholder="Descreva as responsabilidades deste perfil"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateRole} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Perfil'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfis do Sistema</CardTitle>
          <CardDescription>
            Perfis marcados como "Sistema" não podem ser excluídos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Ícone</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Chave</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="text-2xl">{role.icon}</TableCell>
                  <TableCell className="font-medium">{role.label}</TableCell>
                  <TableCell>
                    <code className="px-2 py-1 bg-muted rounded text-sm">
                      {role.role_key}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {role.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.is_system ? "default" : "secondary"}>
                      {role.is_system ? (
                        <>
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Sistema
                        </>
                      ) : (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          Personalizado
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.is_active ? "default" : "outline"}>
                      {role.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(role)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Edite as informações do perfil "{selectedRole?.label}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Chave do Perfil</Label>
              <Input value={selectedRole?.role_key || ""} disabled />
              <p className="text-xs text-muted-foreground">
                A chave não pode ser alterada após a criação
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRoleLabel">Nome do Perfil *</Label>
              <Input
                id="editRoleLabel"
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRoleIcon">Ícone (Emoji)</Label>
              <Input
                id="editRoleIcon"
                value={roleIcon}
                onChange={(e) => setRoleIcon(e.target.value)}
                className="w-24 text-2xl text-center"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRoleDescription">Descrição</Label>
              <Textarea
                id="editRoleDescription"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
              />
            </div>
            {!selectedRole?.is_system && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="roleActive"
                  checked={roleActive}
                  onCheckedChange={setRoleActive}
                />
                <Label htmlFor="roleActive">Perfil Ativo</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRole} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
