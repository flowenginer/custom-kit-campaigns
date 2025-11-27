import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardTemplate, Widget } from "@/types/dashboard";
import { toast } from "sonner";

export const useTemplates = () => {
  return useQuery({
    queryKey: ["dashboard-templates"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("dashboard_templates")
        .select("*")
        .or(`is_system.eq.true,created_by.eq.${user?.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map(t => ({
        ...t,
        layout: t.layout as any as Widget[]
      })) as DashboardTemplate[];
    },
  });
};

export const useSaveAsTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      category: string;
      layout: any[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("dashboard_templates")
        .insert({
          name: params.name,
          description: params.description,
          category: params.category,
          layout: params.layout,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-templates"] });
      toast.success("Template salvo com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar template: ${error.message}`);
    },
  });
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("dashboard_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-templates"] });
      toast.success("Template excluído com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir template: ${error.message}`);
    },
  });
};
