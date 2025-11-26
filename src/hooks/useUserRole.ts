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
        // Primeiro, determinar o papel primário do usuário
        const primaryRole = userRoles.includes('super_admin') ? 'super_admin' :
                          userRoles.includes('admin') ? 'admin' :
                          userRoles.includes('designer') ? 'designer' :
                          userRoles.includes('salesperson') ? 'salesperson' : 'viewer';

        // Buscar configuração padrão do papel
        const { data: roleDefaults } = await supabase
          .from('role_kanban_defaults')
          .select('allowed_columns')
          .eq('role', primaryRole)
          .single();

        const defaultColumns = roleDefaults?.allowed_columns || 
          ['pending', 'in_progress', 'awaiting_approval', 'changes_requested', 'approved', 'completed'];

        // Verificar se o usuário tem configuração personalizada
        const { data: profileData } = await supabase
          .from('profiles')
          .select('allowed_kanban_columns')
          .eq('id', user.id)
          .single();

        let columns: string[];
        const allColumns = ['pending', 'in_progress', 'awaiting_approval', 'changes_requested', 'approved', 'completed'];
        const profileColumns = profileData?.allowed_kanban_columns as string[] | null;

        // Se o usuário tem configuração personalizada E ela é diferente do padrão completo
        // então usar a personalizada. Caso contrário, usar o padrão do papel.
        const hasCustomConfig = profileColumns && 
                               profileColumns.length !== allColumns.length &&
                               JSON.stringify(profileColumns.sort()) !== JSON.stringify(allColumns.sort());

        if (hasCustomConfig) {
          columns = profileColumns;
          console.log('📊 Using custom Kanban columns for user:', columns);
        } else {
          columns = defaultColumns;
          console.log(`📊 Using default Kanban columns for role ${primaryRole}:`, columns);
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
