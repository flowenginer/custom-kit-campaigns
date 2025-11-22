import { useEffect, useState, useCallback } from 'react';

interface UseAutoRefreshOptions {
  interval?: number; // em ms, padrão 60000 (1min)
  enabled?: boolean;
}

export const useAutoRefresh = (
  refreshFn: () => Promise<void>,
  options: UseAutoRefreshOptions = {}
) => {
  const { interval = 60000, enabled = true } = options;
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refreshFn();
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshFn, isRefreshing]);

  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(refresh, interval);
    return () => clearInterval(timer);
  }, [enabled, interval, refresh]);

  return {
    lastUpdated,
    isRefreshing,
    refresh
  };
};
