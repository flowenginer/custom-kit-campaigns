import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DataSourceField {
  name: string;
  type: string;
  label: string;
}

export interface DataSource {
  id: string;
  table_name: string;
  display_name: string;
  description: string | null;
  category: string | null;
  available_fields: DataSourceField[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useDataSources = () => {
  const { data: dataSources = [], isLoading, error, refetch } = useQuery({
    queryKey: ["data-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_sources")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("display_name", { ascending: true });

      if (error) throw error;
      
      // Parse available_fields from JSON
      return (data || []).map(source => ({
        ...source,
        available_fields: (source.available_fields as unknown) as DataSourceField[]
      })) as DataSource[];
    },
  });

  // Agrupar fontes por categoria
  const groupedSources = dataSources.reduce((acc, source) => {
    const category = source.category || "other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(source);
    return acc;
  }, {} as Record<string, DataSource[]>);

  // Labels amigáveis para categorias
  const categoryLabels: Record<string, string> = {
    sales: "Vendas",
    production: "Produção",
    analytics: "Analytics",
    system: "Sistema",
    other: "Outros",
  };

  return {
    dataSources,
    groupedSources,
    categoryLabels,
    isLoading,
    error,
    refetch,
  };
};
