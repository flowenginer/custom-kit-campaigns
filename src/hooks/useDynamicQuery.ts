import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QueryConfig, WidgetFilter } from "@/types/dashboard";

export const useDynamicQuery = (
  queryConfig: QueryConfig | null, 
  enabled: boolean = true,
  globalFilters: WidgetFilter[] = []
) => {
  return useQuery({
    queryKey: ["dynamic-query", queryConfig],
    queryFn: async () => {
      if (!queryConfig) return null;

      const { table, field, aggregation, groupBy, filters, orderBy, orderDirection, limit } = queryConfig;

      // Construir query base
      let query = (supabase as any).from(table).select(field);

      // Combinar filtros do widget com filtros globais
      const allFilters = [...(filters || []), ...globalFilters];

      // Aplicar filtros
      if (allFilters.length > 0) {
        allFilters.forEach(filter => {
          const { field: filterField, operator, value } = filter;
          
          switch (operator) {
            case '=':
              query = query.eq(filterField, value);
              break;
            case '!=':
              query = query.neq(filterField, value);
              break;
            case '>':
              query = query.gt(filterField, value);
              break;
            case '<':
              query = query.lt(filterField, value);
              break;
            case '>=':
              query = query.gte(filterField, value);
              break;
            case '<=':
              query = query.lte(filterField, value);
              break;
            case 'like':
              query = query.like(filterField, `%${value}%`);
              break;
            case 'ilike':
              query = query.ilike(filterField, `%${value}%`);
              break;
            case 'in':
              if (Array.isArray(value)) {
                query = query.in(filterField, value);
              }
              break;
          }
        });
      }

      // Aplicar ordenação
      if (orderBy) {
        query = query.order(orderBy, { ascending: orderDirection === 'asc' });
      }

      // Aplicar limite
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Se houver agregação, processar os dados
      if (aggregation && data) {
        const values = data.map((row: any) => {
          const keys = field.split(',').map(k => k.trim());
          return keys.length === 1 ? row[keys[0]] : row;
        });

        switch (aggregation) {
          case 'count':
            return { value: values.length, data };
          case 'sum':
            return { 
              value: values.reduce((acc: number, val: any) => acc + (parseFloat(val) || 0), 0),
              data 
            };
          case 'avg':
            const sum = values.reduce((acc: number, val: any) => acc + (parseFloat(val) || 0), 0);
            return { value: sum / values.length, data };
          case 'min':
            return { 
              value: Math.min(...values.map((v: any) => parseFloat(v) || 0)),
              data 
            };
          case 'max':
            return { 
              value: Math.max(...values.map((v: any) => parseFloat(v) || 0)),
              data 
            };
          default:
            return { value: null, data };
        }
      }

      // Se houver groupBy, agrupar os dados
      if (groupBy && data) {
        const grouped = data.reduce((acc: any, row: any) => {
          const key = row[groupBy];
          if (!acc[key]) acc[key] = [];
          acc[key].push(row);
          return acc;
        }, {});

        return { data: grouped, raw: data };
      }

      return { data };
    },
    enabled: enabled && !!queryConfig,
    refetchInterval: false,
    staleTime: 0,
  });
};
