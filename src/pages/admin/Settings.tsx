import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserPlus, Trash2, Edit, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppRole } from "@/hooks/useUserRole";

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  profile: {
    full_name: string | null;
  } | null;
  roles: AppRole[];
}

const Settings = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  
  // Password reset states
  const [selectedUserForReset, setSelectedUserForReset] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [myCurrentPassword, setMyCurrentPassword] = useState("");
  const [myNewPassword, setMyNewPassword] = useState("");

  const allRoles: { value: AppRole; label: string; description: string }[] = [
    { value: 'super_admin', label: 'Super Admin', description: 'Acesso total + gerenciar usuários' },
    { value: 'admin', label: 'Admin', description: 'Acesso a todas funcionalidades' },
    { value: 'designer', label: 'Designer', description: 'Acesso apenas a tarefas de design' },
    { value: 'viewer', label: 'Visualizador', description: 'Apenas visualização' },
  ];

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('manage-users', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: new URLSearchParams({ action: 'list' })
      });

      if (response.error) throw response.error;
      if (response.data?.success) {
        setUsers(response.data.data);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!email || !password) {
      toast.error('Email e senha são obrigatórios');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('manage-users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          email,
          password,
          full_name: fullName,
          roles: selectedRoles
        })
      });

      if (response.error) throw response.error;
      if (response.data?.success) {
        toast.success('Usuário criado com sucesso');
        setIsCreateDialogOpen(false);
        resetForm();
        fetchUsers();
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateRoles = async () => {
    if (!selectedUser) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('manage-users', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_roles',
          user_id: selectedUser.id,
          roles: selectedRoles
        })
      });

      if (response.error) throw response.error;
      if (response.data?.success) {
        toast.success('Roles atualizados com sucesso');
        setIsEditDialogOpen(false);
        resetForm();
        fetchUsers();
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('manage-users', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          user_id: selectedUser.id
        })
      });

      if (response.error) throw response.error;
      if (response.data?.success) {
        toast.success('Usuário deletado com sucesso');
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleResetUserPassword = async () => {
    if (!selectedUserForReset || !newPassword) {
      toast.error('Selecione um usuário e defina uma nova senha');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('manage-users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reset_password',
          user_id: selectedUserForReset,
          new_password: newPassword
        })
      });

      if (response.error) throw response.error;
      if (response.data?.success) {
        toast.success('Senha resetada com sucesso');
        setSelectedUserForReset("");
        setNewPassword("");
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleChangeMyPassword = async () => {
    if (!myCurrentPassword || !myNewPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: myNewPassword
      });

      if (error) throw error;
      toast.success('Sua senha foi alterada com sucesso');
      setMyCurrentPassword("");
      setMyNewPassword("");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setSelectedRoles([]);
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedRoles(user.roles);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'super_admin': return 'default';
      case 'admin': return 'secondary';
      case 'designer': return 'outline';
      case 'viewer': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerenciar usuários, permissões e recuperação de senha
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="password">Recuperar Senha</TabsTrigger>
        </TabsList>

        {/* TAB: USUÁRIOS */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gerenciar Usuários</CardTitle>
                  <CardDescription>
                    Adicione usuários e defina suas permissões de acesso
                  </CardDescription>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Adicionar Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                      <DialogDescription>
                        Crie uma nova conta e defina as permissões de acesso
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="usuario@empresa.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Senha Temporária</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fullName">Nome Completo</Label>
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="João Silva"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Permissões</Label>
                        {allRoles.map((role) => (
                          <div key={role.value} className="flex items-start space-x-2">
                            <Checkbox
                              id={role.value}
                              checked={selectedRoles.includes(role.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRoles([...selectedRoles, role.value]);
                                } else {
                                  setSelectedRoles(selectedRoles.filter(r => r !== role.value));
                                }
                              }}
                            />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor={role.value}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {role.label}
                              </label>
                              <p className="text-sm text-muted-foreground">
                                {role.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateUser}>Criar Usuário</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Permissões</TableHead>
                      <TableHead>Último Acesso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.profile?.full_name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {user.roles.map((role) => (
                              <Badge key={role} variant={getRoleBadgeVariant(role)}>
                                {role.replace('_', ' ').toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleDateString('pt-BR')
                            : 'Nunca'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDeleteDialog(user)}
                              disabled={user.id === currentUserId}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: RECUPERAR SENHA */}
        <TabsContent value="password" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Minha Senha</CardTitle>
              <CardDescription>Altere sua própria senha de acesso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="myCurrentPassword">Senha Atual</Label>
                <Input
                  id="myCurrentPassword"
                  type="password"
                  value={myCurrentPassword}
                  onChange={(e) => setMyCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <Label htmlFor="myNewPassword">Nova Senha</Label>
                <Input
                  id="myNewPassword"
                  type="password"
                  value={myNewPassword}
                  onChange={(e) => setMyNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button onClick={handleChangeMyPassword}>
                <KeyRound className="h-4 w-4 mr-2" />
                Alterar Minha Senha
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resetar Senha de Outro Usuário</CardTitle>
              <CardDescription>
                Defina uma nova senha temporária para qualquer usuário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="userSelect">Selecione o Usuário</Label>
                <Select value={selectedUserForReset} onValueChange={setSelectedUserForReset}>
                  <SelectTrigger id="userSelect">
                    <SelectValue placeholder="Escolha um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter(u => u.id !== currentUserId)
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.email} {user.profile?.full_name && `(${user.profile.full_name})`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="newPassword">Nova Senha Temporária</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-4">
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  ⚠️ O usuário deve alterar esta senha no próximo login por questões de segurança.
                </p>
              </div>
              <Button onClick={handleResetUserPassword} disabled={!selectedUserForReset || !newPassword}>
                <KeyRound className="h-4 w-4 mr-2" />
                Resetar Senha do Usuário
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Editar Roles */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Permissões</DialogTitle>
            <DialogDescription>
              Atualize as permissões de acesso de {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {allRoles.map((role) => (
              <div key={role.value} className="flex items-start space-x-2">
                <Checkbox
                  id={`edit-${role.value}`}
                  checked={selectedRoles.includes(role.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedRoles([...selectedRoles, role.value]);
                    } else {
                      setSelectedRoles(selectedRoles.filter(r => r !== role.value));
                    }
                  }}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor={`edit-${role.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {role.label}
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {role.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRoles}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário {selectedUser?.email} será permanentemente deletado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
