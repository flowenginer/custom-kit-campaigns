import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dashboard } from "@/types/dashboard";
import { toast } from "sonner";

export const useDashboards = () => {
  return useQuery({
    queryKey: ["dashboards"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("dashboard_configs")
        .select("*")
        .or(`created_by.eq.${user.id},is_public.eq.true`)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return data.map(d => ({
        ...d,
        widgets: (d.layout as any) || []
      })) as Dashboard[];
    },
  });
};

export const useSaveDashboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dashboardData: { 
      id?: string;
      name: string; 
      description?: string;
      is_public: boolean;
      widgets: any[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("User not authenticated");

      const payload = {
        name: dashboardData.name,
        description: dashboardData.description,
        is_public: dashboardData.is_public,
        layout: dashboardData.widgets as any,
        created_by: user.id,
      };

      if (dashboardData.id) {
        const { data, error } = await supabase
          .from("dashboard_configs")
          .update(payload)
          .eq("id", dashboardData.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("dashboard_configs")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      toast.success("Dashboard salvo com sucesso!");
    },
    onError: (error) => {
      console.error("Error saving dashboard:", error);
      toast.error("Erro ao salvar dashboard");
    },
  });
};

export const useDeleteDashboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dashboardId: string) => {
      const { error } = await supabase
        .from("dashboard_configs")
        .delete()
        .eq("id", dashboardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      toast.success("Dashboard excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting dashboard:", error);
      toast.error("Erro ao excluir dashboard");
    },
  });
};

export const useLoadDashboard = (dashboardId: string | null) => {
  return useQuery({
    queryKey: ["dashboard", dashboardId],
    queryFn: async () => {
      if (!dashboardId) return null;

      const { data, error } = await supabase
        .from("dashboard_configs")
        .select("*")
        .eq("id", dashboardId)
        .single();

      if (error) throw error;

      return {
        ...data,
        widgets: (data.layout as any) || []
      } as Dashboard;
    },
    enabled: !!dashboardId,
  });
};
