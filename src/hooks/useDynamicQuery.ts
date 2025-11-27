import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QueryConfig } from "@/types/dashboard";

export const useDynamicQuery = (config: QueryConfig | null) => {
  return useQuery({
    queryKey: ["dynamic-query", config],
    queryFn: async () => {
      if (!config) return null;

      let query: any = supabase.from(config.tableName).select(config.fields.join(", "));

      // Apply filters
      if (config.filters) {
        config.filters.forEach((filter) => {
          switch (filter.operator) {
            case "eq":
              query = query.eq(filter.field, filter.value);
              break;
            case "gt":
              query = query.gt(filter.field, filter.value);
              break;
            case "lt":
              query = query.lt(filter.field, filter.value);
              break;
            case "gte":
              query = query.gte(filter.field, filter.value);
              break;
            case "lte":
              query = query.lte(filter.field, filter.value);
              break;
            case "like":
              query = query.like(filter.field, `%${filter.value}%`);
              break;
            case "in":
              query = query.in(filter.field, String(filter.value).split(","));
              break;
          }
        });
      }

      // Apply limit
      if (config.limit) {
        query = query.limit(config.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process aggregation if needed
      if (config.aggregation && data) {
        const { type, field } = config.aggregation;
        
        if (config.groupBy) {
          // Group by aggregation
          const grouped = data.reduce((acc: any, row: any) => {
            const key = row[config.groupBy!];
            if (!acc[key]) {
              acc[key] = { [config.groupBy!]: key, values: [] };
            }
            acc[key].values.push(row[field]);
            return acc;
          }, {});

          return Object.values(grouped).map((group: any) => {
            const values = group.values;
            let result = 0;

            switch (type) {
              case "count":
                result = values.length;
                break;
              case "sum":
                result = values.reduce((sum: number, val: number) => sum + (val || 0), 0);
                break;
              case "avg":
                result = values.reduce((sum: number, val: number) => sum + (val || 0), 0) / values.length;
                break;
              case "min":
                result = Math.min(...values.filter((v: any) => v !== null));
                break;
              case "max":
                result = Math.max(...values.filter((v: any) => v !== null));
                break;
            }

            return { [config.groupBy!]: group[config.groupBy!], value: result };
          });
        } else {
          // Single aggregation
          const values = data.map((row: any) => row[field]).filter((v) => v !== null);
          let result = 0;

          switch (type) {
            case "count":
              result = data.length;
              break;
            case "sum":
              result = values.reduce((sum: number, val: number) => sum + val, 0);
              break;
            case "avg":
              result = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
              break;
            case "min":
              result = Math.min(...values);
              break;
            case "max":
              result = Math.max(...values);
              break;
          }

          return [{ value: result }];
        }
      }

      return data;
    },
    enabled: !!config,
  });
};
