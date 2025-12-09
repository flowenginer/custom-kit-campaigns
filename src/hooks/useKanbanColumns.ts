import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KanbanColumnRule {
  id: string;
  column_id: string;
  rule_order: number;
  field_name: string;
  operator: string;
  value: string | null;
  is_active: boolean;
}

export interface KanbanColumn {
  id: string;
  key: string;
  title: string;
  icon: string | null;
  background_color: string | null;
  text_color: string | null;
  sort_order: number;
  is_active: boolean;
  is_manual_only: boolean;
  rules: KanbanColumnRule[];
}

export const useKanbanColumns = () => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchColumns = async () => {
    try {
      setLoading(true);
      
      // Buscar colunas
      const { data: columnsData, error: columnsError } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (columnsError) throw columnsError;

      // Buscar regras
      const { data: rulesData, error: rulesError } = await supabase
        .from('kanban_column_rules')
        .select('*')
        .eq('is_active', true)
        .order('rule_order');

      if (rulesError) throw rulesError;

      // Combinar colunas com suas regras
      const columnsWithRules: KanbanColumn[] = (columnsData || []).map(col => ({
        ...col,
        rules: (rulesData || []).filter(rule => rule.column_id === col.id)
      }));

      setColumns(columnsWithRules);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao carregar colunas Kanban:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColumns();
  }, []);

  // Função para verificar se uma task pertence a uma coluna baseado nas regras
  const matchesColumn = (task: any, column: KanbanColumn): boolean => {
    if (column.rules.length === 0) return false;

    // Todas as regras devem ser satisfeitas (AND)
    return column.rules.every(rule => {
      const taskValue = getNestedValue(task, rule.field_name);
      
      switch (rule.operator) {
        case 'equals':
          if (rule.value === 'true') return taskValue === true;
          if (rule.value === 'false') return taskValue === false;
          if (rule.value === 'null') return taskValue === null || taskValue === undefined;
          return String(taskValue) === rule.value;
        
        case 'not_equals':
          if (rule.value === 'true') return taskValue !== true;
          if (rule.value === 'false') return taskValue !== false;
          if (rule.value === 'null') return taskValue !== null && taskValue !== undefined;
          return String(taskValue) !== rule.value;
        
        case 'is_null':
          return taskValue === null || taskValue === undefined;
        
        case 'is_not_null':
          return taskValue !== null && taskValue !== undefined;
        
        case 'contains':
          return String(taskValue).toLowerCase().includes((rule.value || '').toLowerCase());
        
        case 'greater_than':
          return Number(taskValue) > Number(rule.value);
        
        case 'less_than':
          return Number(taskValue) < Number(rule.value);
        
        default:
          return false;
      }
    });
  };

  // Helper para acessar valores aninhados (ex: 'lead.needs_logo')
  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Função para filtrar tasks para uma coluna específica
  const getTasksForColumn = (tasks: any[], columnKey: string): any[] => {
    const column = columns.find(c => c.key === columnKey);
    if (!column) return [];

    // Colunas especiais com lógica de exclusão mútua
    if (columnKey === 'pending') {
      // Pending deve excluir tasks que pertencem a logo_needed, cards_devolvidos ou retorno_alteracao
      const logoNeededCol = columns.find(c => c.key === 'logo_needed');
      const cardsDevCol = columns.find(c => c.key === 'cards_devolvidos');
      const retornoCol = columns.find(c => c.key === 'retorno_alteracao');

      return tasks.filter(task => {
        if (!matchesColumn(task, column)) return false;
        if (logoNeededCol && matchesColumn(task, logoNeededCol)) return false;
        if (cardsDevCol && matchesColumn(task, cardsDevCol)) return false;
        if (retornoCol && matchesColumn(task, retornoCol)) return false;
        return true;
      });
    }

    return tasks.filter(task => matchesColumn(task, column));
  };

  return {
    columns,
    loading,
    error,
    refetch: fetchColumns,
    matchesColumn,
    getTasksForColumn
  };
};
