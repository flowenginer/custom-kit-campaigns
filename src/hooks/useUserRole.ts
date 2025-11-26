import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = 'super_admin' | 'admin' | 'designer' | 'viewer' | 'salesperson';

interface UserRoleRow {
  role: AppRole;
}

export const useUserRole = () => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [allowedKanbanColumns, setAllowedKanbanColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Fazer a chamada diretamente sem o tipo do supabase para evitar erro de TypeScript
      // até que types.ts seja regenerado com a função get_user_roles
      const response: any = await (supabase as any).rpc('get_user_roles', {
        _user_id: user.id
      });

      const { data, error } = response;

      if (!error && data) {
        const userRoles = (data as UserRoleRow[]).map(r => r.role);
        setRoles(userRoles);
        console.log('User roles loaded:', userRoles);
        console.log('Is Super Admin:', userRoles.includes('super_admin'));

        // 🆕 BUSCAR COLUNAS PERMITIDAS DO KANBAN
        // Primeiro, verificar se o usuário tem configuração personalizada
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('allowed_kanban_columns')
          .eq('id', user.id)
          .single();

        let columns: string[];

        // Se o usuário tiver configuração personalizada, usar ela
        if (!profileError && profileData && profileData.allowed_kanban_columns) {
          columns = profileData.allowed_kanban_columns as string[];
          console.log('📊 Using custom Kanban columns for user:', columns);
        } else {
          // Caso contrário, buscar o padrão do papel do usuário
          // Pegar o papel com maior prioridade (super_admin > admin > designer > salesperson > viewer)
          const primaryRole = userRoles.includes('super_admin') ? 'super_admin' :
                            userRoles.includes('admin') ? 'admin' :
                            userRoles.includes('designer') ? 'designer' :
                            userRoles.includes('salesperson') ? 'salesperson' : 'viewer';

          const { data: roleDefaults, error: roleError } = await supabase
            .from('role_kanban_defaults')
            .select('allowed_columns')
            .eq('role', primaryRole)
            .single();

          if (!roleError && roleDefaults) {
            columns = roleDefaults.allowed_columns as string[];
            console.log(`📊 Using default Kanban columns for role ${primaryRole}:`, columns);
          } else {
            // Fallback para todas as colunas se não encontrar configuração
            columns = ['pending', 'in_progress', 'awaiting_approval', 'changes_requested', 'approved', 'completed'];
            console.log('📊 Using fallback Kanban columns:', columns);
          }
        }
        
        setAllowedKanbanColumns(columns);
      } else if (error) {
        console.error('Error fetching roles:', error);
      }
      
      setIsLoading(false);
    };

    fetchRoles();
  }, []);

  return {
    roles,
    allowedKanbanColumns, // 🆕 NOVO RETORNO
    isLoading,
    isSuperAdmin: roles.includes('super_admin'),
    isAdmin: roles.includes('admin') || roles.includes('super_admin'),
    isDesigner: roles.includes('designer'),
    isViewer: roles.includes('viewer'),
    isSalesperson: roles.includes('salesperson'),
    hasRole: (role: AppRole) => roles.includes(role)
  };
};
