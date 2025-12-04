import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

export const useReturnedTasksCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { isSuperAdmin, isAdmin, isSalesperson } = useUserRole();

  const fetchCount = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar leads com status rejeitado
      let query = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('salesperson_status', 'rejected_by_designer');

      // Se é vendedor (não admin), filtrar só os dele
      if (isSalesperson && !isSuperAdmin && !isAdmin) {
        query = query.eq('created_by', user.id);
      }

      const { count: returnedCount, error } = await query;

      if (error) throw error;
      setCount(returnedCount || 0);
    } catch (error) {
      console.error('Error fetching returned tasks count:', error);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, isAdmin, isSalesperson]);

  useEffect(() => {
    fetchCount();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('returned-tasks-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: 'salesperson_status=eq.rejected_by_designer'
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCount]);

  return { count, loading, refetch: fetchCount };
};
