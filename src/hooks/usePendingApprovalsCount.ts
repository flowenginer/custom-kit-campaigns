import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePendingApprovalsCount = () => {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      const { count: pendingCount } = await supabase
        .from("pending_urgent_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      setCount(pendingCount || 0);
      setIsLoading(false);
    };

    fetchCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("pending_urgent_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_urgent_requests",
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { count, isLoading };
};
