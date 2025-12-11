import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RoleConfig {
  id: string;
  role_key: string;
  label: string;
  icon: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
}

export const useRolesConfig = () => {
  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roles_config')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Erro ao carregar roles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const getRoleLabel = (roleKey: string): string => {
    const role = roles.find(r => r.role_key === roleKey);
    return role?.label || roleKey.replace('_', ' ').toUpperCase();
  };

  const getRoleIcon = (roleKey: string): string => {
    const role = roles.find(r => r.role_key === roleKey);
    return role?.icon || '👤';
  };

  const getRoleInfo = (roleKey: string): RoleConfig | undefined => {
    return roles.find(r => r.role_key === roleKey);
  };

  return {
    roles,
    loading,
    fetchRoles,
    getRoleLabel,
    getRoleIcon,
    getRoleInfo,
  };
};
