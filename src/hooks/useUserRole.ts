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
      } else if (error) {
        console.error('Error fetching roles:', error);
      }

      // 🆕 BUSCAR COLUNAS PERMITIDAS DO KANBAN
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('allowed_kanban_columns')
        .eq('id', user.id)
        .single();

      if (!profileError && profileData) {
        // Garantir que sempre seja um array de strings
        const rawColumns = profileData.allowed_kanban_columns;
        let columns: string[];
        
        if (Array.isArray(rawColumns)) {
          columns = rawColumns as string[];
        } else {
          columns = ['pending', 'in_progress', 'awaiting_approval', 'changes_requested', 'approved', 'completed'];
        }
        
        setAllowedKanbanColumns(columns);
        console.log('📊 Allowed Kanban Columns:', columns);
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
