import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dashboard, Widget } from "@/types/dashboard";
import { toast } from "sonner";

export const useDashboards = () => {
  return useQuery({
    queryKey: ["dashboards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_configs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((dashboard) => ({
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        widgets: (dashboard.layout as any) || [],
        isPublic: dashboard.is_public,
        createdAt: dashboard.created_at,
        updatedAt: dashboard.updated_at,
      })) as Dashboard[];
    },
  });
};

export const useSaveDashboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      widgets,
      isPublic,
    }: {
      id?: string;
      name: string;
      description?: string;
      widgets: Widget[];
      isPublic: boolean;
    }) => {
      const dashboardData = {
        name,
        description,
        layout: widgets as any,
        is_public: isPublic,
      };

      if (id) {
        // Update existing
        const { data, error } = await supabase
          .from("dashboard_configs")
          .update(dashboardData)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
          .from("dashboard_configs")
          .insert([{ ...dashboardData, created_by: user.id }])
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
      toast.error("Erro ao salvar dashboard: " + error.message);
    },
  });
};

export const useDeleteDashboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("dashboard_configs")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      toast.success("Dashboard excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir dashboard: " + error.message);
    },
  });
};

export const useLoadDashboard = (id: string | null) => {
  return useQuery({
    queryKey: ["dashboard", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("dashboard_configs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        widgets: (data.layout as any) || [],
        isPublic: data.is_public,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      } as Dashboard;
    },
    enabled: !!id,
  });
};
