import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Sem autorização');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Verificar se é super_admin
    const { data: roleCheck } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (!roleCheck) {
      throw new Error('Acesso negado. Apenas Super Admins.');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // LISTAR USUÁRIOS
    if (action === 'list') {
      console.log('Listando usuários...');
      const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) throw error;

      const userIds = users.users.map((u: any) => u.id);
      
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('*')
        .in('user_id', userIds);

      const enrichedUsers = users.users.map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        profile: profiles?.find((p: any) => p.id === u.id),
        roles: roles?.filter((r: any) => r.user_id === u.id).map((r: any) => r.role) || []
      }));

      console.log(`${enrichedUsers.length} usuários listados`);
      return new Response(
        JSON.stringify({ success: true, data: enrichedUsers }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRIAR USUÁRIO
    if (action === 'create' && req.method === 'POST') {
      const { email, password, full_name, roles } = await req.json();

      if (!email || !password) {
        throw new Error('Email e senha são obrigatórios');
      }

      console.log(`Criando usuário: ${email}`);

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name }
      });

      if (createError) throw createError;

      // Atribuir roles
      if (roles && roles.length > 0) {
        const roleInserts = roles.map((role: string) => ({
          user_id: newUser.user.id,
          role,
          created_by: user.id
        }));

        await supabaseAdmin
          .from('user_roles')
          .insert(roleInserts);
      }

      console.log(`Usuário ${email} criado com sucesso`);
      return new Response(
        JSON.stringify({ success: true, data: newUser.user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ATUALIZAR ROLES
    if (action === 'update_roles' && req.method === 'PATCH') {
      const { user_id, roles } = await req.json();

      if (!user_id || !roles) {
        throw new Error('user_id e roles são obrigatórios');
      }

      console.log(`Atualizando roles do usuário: ${user_id}`);

      // Remover roles antigas
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', user_id);

      // Inserir novas roles
      const roleInserts = roles.map((role: string) => ({
        user_id,
        role,
        created_by: user.id
      }));

      await supabaseAdmin
        .from('user_roles')
        .insert(roleInserts);

      console.log(`Roles atualizados com sucesso`);
      return new Response(
        JSON.stringify({ success: true, message: 'Roles atualizados' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // RESETAR SENHA
    if (action === 'reset_password' && req.method === 'POST') {
      const { user_id, new_password } = await req.json();

      if (!user_id || !new_password) {
        throw new Error('user_id e new_password são obrigatórios');
      }

      console.log(`Resetando senha do usuário: ${user_id}`);

      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        { password: new_password }
      );

      if (error) throw error;

      console.log(`Senha resetada com sucesso`);
      return new Response(
        JSON.stringify({ success: true, message: 'Senha resetada com sucesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETAR USUÁRIO
    if (action === 'delete' && req.method === 'DELETE') {
      const { user_id } = await req.json();

      if (!user_id) {
        throw new Error('user_id é obrigatório');
      }

      if (user_id === user.id) {
        throw new Error('Você não pode deletar sua própria conta');
      }

      console.log(`Deletando usuário: ${user_id}`);

      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);

      if (error) throw error;

      console.log(`Usuário deletado com sucesso`);
      return new Response(
        JSON.stringify({ success: true, message: 'Usuário deletado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Ação não reconhecida');

  } catch (error: any) {
    console.error('Erro:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
