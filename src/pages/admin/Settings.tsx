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
import { UserPlus, Trash2, Edit, KeyRound, Loader2, Code2 } from "lucide-react";
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
  
  // Global scripts states
  const [globalHeadScripts, setGlobalHeadScripts] = useState("");
  const [globalBodyScripts, setGlobalBodyScripts] = useState("");
  const [isLoadingScripts, setIsLoadingScripts] = useState(true);
  const [isSavingScripts, setIsSavingScripts] = useState(false);

  const allRoles: { value: AppRole; label: string; description: string }[] = [
    { value: 'super_admin', label: 'Super Admin', description: 'Acesso total + gerenciar usuários' },
    { value: 'admin', label: 'Admin', description: 'Acesso a todas funcionalidades' },
    { value: 'designer', label: 'Designer', description: 'Acesso apenas a tarefas de design' },
    { value: 'viewer', label: 'Visualizador', description: 'Apenas visualização' },
  ];

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
    fetchGlobalScripts();
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

  const fetchGlobalScripts = async () => {
    setIsLoadingScripts(true);
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('global_head_scripts, global_body_scripts')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setGlobalHeadScripts(data.global_head_scripts || '');
        setGlobalBodyScripts(data.global_body_scripts || '');
      }
    } catch (error: any) {
      toast.error('Erro ao carregar scripts globais');
      console.error(error);
    } finally {
      setIsLoadingScripts(false);
    }
  };

  const handleSaveGlobalScripts = async () => {
    setIsSavingScripts(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check if a row exists
      const { data: existing } = await supabase
        .from('global_settings')
        .select('id')
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('global_settings')
          .update({
            global_head_scripts: globalHeadScripts,
            global_body_scripts: globalBodyScripts,
            updated_by: user?.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('global_settings')
          .insert({
            global_head_scripts: globalHeadScripts,
            global_body_scripts: globalBodyScripts,
            updated_by: user?.id
          });

        if (error) throw error;
      }

      toast.success('Scripts globais salvos com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar scripts globais');
      console.error(error);
    } finally {
      setIsSavingScripts(false);
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="password">Senha</TabsTrigger>
          <TabsTrigger value="scripts"><Code2 className="w-4 h-4 mr-2 inline" />Scripts</TabsTrigger>
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

        {/* TAB: SCRIPTS GLOBAIS */}
        <TabsContent value="scripts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scripts Globais</CardTitle>
              <CardDescription>
                Configure scripts de rastreamento (Google Tag Manager, Microsoft Clarity, etc.) que serão injetados em todas as páginas de campanha
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingScripts ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="head-scripts">Scripts do Head</Label>
                    <p className="text-sm text-muted-foreground">
                      Scripts que serão inseridos no {'<head>'} da página (GTM principal, Clarity, etc.)
                    </p>
                    <textarea
                      id="head-scripts"
                      className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                      placeholder={`<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->

<!-- Microsoft Clarity -->
<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "XXXXXXXXX");
</script>`}
                      value={globalHeadScripts}
                      onChange={(e) => setGlobalHeadScripts(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="body-scripts">Scripts do Body</Label>
                    <p className="text-sm text-muted-foreground">
                      Scripts que serão inseridos no início do {'<body>'} (GTM noscript)
                    </p>
                    <textarea
                      id="body-scripts"
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                      placeholder={`<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`}
                      value={globalBodyScripts}
                      onChange={(e) => setGlobalBodyScripts(e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={handleSaveGlobalScripts}
                    disabled={isSavingScripts}
                  >
                    {isSavingScripts && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Scripts Globais
                  </Button>

                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <h4 className="text-sm font-medium mb-2">ℹ️ Informações Importantes</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Os scripts serão injetados automaticamente em todas as páginas de campanha</li>
                      <li>Certifique-se de colar apenas scripts confiáveis de fontes oficiais</li>
                      <li>Scripts maliciosos podem comprometer a segurança do seu site</li>
                      <li>As alterações são aplicadas imediatamente após salvar</li>
                    </ul>
                  </div>
                </>
              )}
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

      {/* Scripts Tab Content - needs to be added inside Tabs component */}
    </div>
  );
};

export default Settings;
