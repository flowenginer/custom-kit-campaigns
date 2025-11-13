import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = 'super_admin' | 'admin' | 'designer' | 'viewer';

interface UserRoleRow {
  role: AppRole;
}

export const useUserRole = () => {
  const [roles, setRoles] = useState<AppRole[]>([]);
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
      
      setIsLoading(false);
    };

    fetchRoles();
  }, []);

  return {
    roles,
    isLoading,
    isSuperAdmin: roles.includes('super_admin'),
    isAdmin: roles.includes('admin') || roles.includes('super_admin'),
    isDesigner: roles.includes('designer'),
    isViewer: roles.includes('viewer'),
    hasRole: (role: AppRole) => roles.includes(role)
  };
};
