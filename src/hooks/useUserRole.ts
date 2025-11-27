import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = 'super_admin' | 'admin' | 'designer' | 'viewer' | 'salesperson';

interface UserRoleRow {
  role: AppRole;
}

export const useUserRole = () => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [allowedKanbanColumns, setAllowedKanbanColumns] = useState<string[]>([]);
  const [allowedMenuItems, setAllowedMenuItems] = useState<string[]>([]); // 🆕 NOVO
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

        // Determinar o papel primário do usuário
        const primaryRole = userRoles.includes('super_admin') ? 'super_admin' :
                          userRoles.includes('admin') ? 'admin' :
                          userRoles.includes('designer') ? 'designer' :
                          userRoles.includes('salesperson') ? 'salesperson' : 'viewer';

        // Buscar configuração padrão do papel (Kanban)
        const { data: roleDefaults } = await supabase
          .from('role_kanban_defaults')
          .select('allowed_columns')
          .eq('role', primaryRole)
          .maybeSingle();

        // 🆕 Buscar configuração padrão de menu
        const { data: menuDefaults } = await supabase
          .from('role_menu_defaults')
          .select('allowed_menu_items')
          .eq('role', primaryRole)
          .maybeSingle();

        // Verificar se o usuário tem configuração personalizada
        const { data: profileData } = await supabase
          .from('profiles')
          .select('allowed_kanban_columns, allowed_menu_items')
          .eq('id', user.id)
          .maybeSingle();

        let columns: string[];
        let menuItems: string[];

        // Se o usuário tem configuração personalizada (não null e não vazia), usar ela
        // Caso contrário, usar o padrão do papel
        if (profileData?.allowed_kanban_columns && 
            Array.isArray(profileData.allowed_kanban_columns) && 
            profileData.allowed_kanban_columns.length > 0) {
          columns = profileData.allowed_kanban_columns as string[];
        } else if (roleDefaults?.allowed_columns) {
          columns = roleDefaults.allowed_columns as string[];
        } else {
          // Fallback completo
          columns = ['pending', 'in_progress', 'awaiting_approval', 'changes_requested', 'approved', 'completed'];
        }

        // 🆕 Configurar itens de menu
        if (profileData?.allowed_menu_items && 
            Array.isArray(profileData.allowed_menu_items) && 
            profileData.allowed_menu_items.length > 0) {
          menuItems = profileData.allowed_menu_items as string[];
        } else if (menuDefaults?.allowed_menu_items) {
          menuItems = menuDefaults.allowed_menu_items as string[];
        } else {
          // Fallback completo
          menuItems = ['dashboard', 'creation', 'ranking'];
        }
        
        setAllowedKanbanColumns(columns);
        setAllowedMenuItems(menuItems); // 🆕 NOVO
      } else if (error) {
        console.error('Error fetching roles:', error);
      }
      
      setIsLoading(false);
    };

    fetchRoles();
  }, []);

  return {
    roles,
    allowedKanbanColumns,
    allowedMenuItems, // 🆕 NOVO RETORNO
    isLoading,
    isSuperAdmin: roles.includes('super_admin'),
    isAdmin: roles.includes('admin') || roles.includes('super_admin'),
    isDesigner: roles.includes('designer'),
    isViewer: roles.includes('viewer'),
    isSalesperson: roles.includes('salesperson'),
    hasRole: (role: AppRole) => roles.includes(role)
  };
};
