import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BusinessSegment {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const useBusinessSegments = (activeOnly = false) => {
  return useQuery({
    queryKey: ['business-segments', activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('business_segments')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as BusinessSegment[];
    }
  });
};

export const useCreateBusinessSegment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (segment: { name: string; description?: string; icon?: string }) => {
      // Get the max display_order
      const { data: maxOrder } = await supabase
        .from('business_segments')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

      const newOrder = (maxOrder?.display_order || 0) + 1;

      const { data, error } = await supabase
        .from('business_segments')
        .insert({
          name: segment.name,
          description: segment.description || null,
          icon: segment.icon || '🏢',
          display_order: newOrder
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-segments'] });
      toast.success('Segmento criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar segmento: ${error.message}`);
    }
  });
};

export const useUpdateBusinessSegment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BusinessSegment> & { id: string }) => {
      const { data, error } = await supabase
        .from('business_segments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-segments'] });
      toast.success('Segmento atualizado!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  });
};

export const useDeleteBusinessSegment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Check if there are leads using this segment
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('business_segment_id', id);

      if (count && count > 0) {
        throw new Error(`Este segmento está sendo usado por ${count} lead(s) e não pode ser excluído.`);
      }

      const { error } = await supabase
        .from('business_segments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-segments'] });
      toast.success('Segmento excluído!');
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });
};

export const useReorderBusinessSegments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (segments: { id: string; display_order: number }[]) => {
      for (const segment of segments) {
        const { error } = await supabase
          .from('business_segments')
          .update({ display_order: segment.display_order })
          .eq('id', segment.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-segments'] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao reordenar: ${error.message}`);
    }
  });
};
