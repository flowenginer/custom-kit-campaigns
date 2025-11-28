import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePendingModificationsCount = () => {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      setIsLoading(true);
      try {
        const { count: totalCount } = await supabase
          .from("pending_modification_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        
        setCount(totalCount || 0);
      } catch (error) {
        console.error("Error fetching modification requests count:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCount();

    // Realtime subscription
    const channel = supabase
      .channel("pending_modification_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_modification_requests",
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
