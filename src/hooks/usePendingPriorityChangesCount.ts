import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePendingPriorityChangesCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = async () => {
    try {
      const { count: total, error } = await supabase
        .from("pending_priority_change_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (error) throw error;
      setCount(total || 0);
    } catch (error) {
      console.error("Error fetching priority changes count:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("priority_changes_count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_priority_change_requests",
        },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { count, loading, refetch: fetchCount };
};
