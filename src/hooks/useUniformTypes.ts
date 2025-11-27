import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UniformType {
  tag_value: string;
  display_label: string | null;
  icon: string | null;
}

export const useUniformTypes = () => {
  const [types, setTypes] = useState<UniformType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUniformTypes();
  }, []);

  const loadUniformTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('tag_value, display_label, icon')
        .eq('tag_type', 'model')
        .order('tag_value');

      if (error) throw error;
      setTypes(data || []);
    } catch (error) {
      console.error('Error loading uniform types:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (tagValue: string): string => {
    const type = types.find(t => t.tag_value === tagValue);
    return type?.icon || '👕';
  };

  const getLabel = (tagValue: string): string => {
    const type = types.find(t => t.tag_value === tagValue);
    return type?.display_label || tagValue;
  };

  return {
    types,
    isLoading,
    getIcon,
    getLabel,
    refresh: loadUniformTypes,
  };
};
