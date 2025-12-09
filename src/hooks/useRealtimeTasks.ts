import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DesignTask } from '@/types/design-task';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeTasksOptions {
  onNewTask?: () => void;
  onStatusChange?: () => void;
}

// Função auxiliar para buscar uma única tarefa formatada
const fetchSingleTask = async (taskId: string): Promise<DesignTask | null> => {
  try {
    const { data: task, error } = await supabase
      .from("design_tasks")
      .select(`
        id,
        order_id,
        lead_id,
        campaign_id,
        status,
        priority,
        deadline,
        assigned_to,
        assigned_at,
        current_version,
        design_files,
        created_at,
        updated_at,
        completed_at,
        status_changed_at,
        created_by,
        created_by_salesperson,
        order_number,
        customer_id,
        returned_from_rejection,
        orders!inner (
          customer_name,
          customer_email,
          customer_phone,
          quantity,
          customization_data,
          model_id,
          shirt_models (
            name,
            sku,
            image_front
          )
        ),
        campaigns (
          name,
          segment_tag
        ),
        creator:profiles!design_tasks_created_by_fkey (
          full_name
        ),
        designer:profiles!design_tasks_assigned_to_fkey (
          full_name
        ),
        lead:leads!design_tasks_lead_id_fkey (
          needs_logo,
          uploaded_logo_url,
          logo_action,
          logo_description,
          salesperson_status,
          business_segment_id,
          business_segment_other,
          business_segments (
            id,
            name,
            icon
          )
        )
      `)
      .eq('id', taskId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !task) return null;

    // Buscar layouts da tarefa
    const { data: layoutsData } = await supabase
      .from('design_task_layouts')
      .select(`
        *,
        shirt_models:model_id (
          image_front,
          image_back,
          image_left,
          image_right
        )
      `)
      .eq('task_id', taskId)
      .order('layout_number', { ascending: true });

    const layouts = (layoutsData || []).map((layout: any) => ({
      ...layout,
      model_image_front: layout.shirt_models?.image_front || layout.customization_data?.modelImages?.front || null,
      model_image_back: layout.shirt_models?.image_back || layout.customization_data?.modelImages?.back || null,
      model_image_left: layout.shirt_models?.image_left || layout.customization_data?.modelImages?.left || null,
      model_image_right: layout.shirt_models?.image_right || layout.customization_data?.modelImages?.right || null,
    }));

    // Formatar tarefa
    const formattedTask = {
      ...task,
      customer_name: task.orders?.customer_name,
      customer_email: task.orders?.customer_email,
      customer_phone: task.orders?.customer_phone,
      quantity: task.orders?.quantity,
      customization_data: task.orders?.customization_data,
      campaign_name: task.campaigns?.name,
      segment_tag: task.campaigns?.segment_tag,
      model_name: task.orders?.shirt_models?.name,
      model_code: task.orders?.shirt_models?.sku,
      model_image_front: task.orders?.shirt_models?.image_front,
      needs_logo: task.lead?.needs_logo,
      logo_action: task.lead?.logo_action,
      logo_description: task.lead?.logo_description || null,
      uploaded_logo_url: task.lead?.uploaded_logo_url || null,
      salesperson_status: task.lead?.salesperson_status || null,
      created_by_salesperson: task.created_by_salesperson,
      creator_name: task.creator?.full_name || null,
      designer_name: task.designer?.full_name || null,
      designer_initials: task.designer?.full_name 
        ? task.designer.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : null,
      status_changed_at: task.status_changed_at,
      customer_id: task.customer_id,
      task_layouts: layouts,
      business_segment_id: task.lead?.business_segment_id || null,
      business_segment_name: (task.lead?.business_segments as any)?.name || null,
      business_segment_icon: (task.lead?.business_segments as any)?.icon || null,
      business_segment_other: task.lead?.business_segment_other || null,
      returned_from_rejection: task.returned_from_rejection || false,
      client_feedback: null,
      client_approved_at: null,
      changes_notes: null,
    } as unknown as DesignTask;

    return formattedTask;
  } catch (error) {
    console.error('Error fetching single task:', error);
    return null;
  }
};

export const useRealtimeTasks = (
  tasks: DesignTask[],
  setTasks: React.Dispatch<React.SetStateAction<DesignTask[]>>,
  selectedTaskRef: React.MutableRefObject<DesignTask | null>,
  setSelectedTask: React.Dispatch<React.SetStateAction<DesignTask | null>>,
  options: UseRealtimeTasksOptions = {}
) => {
  const { onNewTask, onStatusChange } = options;
  
  // Ref para evitar múltiplas atualizações simultâneas
  const isProcessingRef = useRef(false);
  const pendingUpdatesRef = useRef<string[]>([]);

  // Processar atualizações pendentes
  const processUpdate = useCallback(async (taskId: string, eventType: string) => {
    if (eventType === 'DELETE') {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      return;
    }

    const updatedTask = await fetchSingleTask(taskId);
    
    if (!updatedTask) {
      // Task foi deletada ou não existe mais
      setTasks(prev => prev.filter(t => t.id !== taskId));
      return;
    }

    setTasks(prev => {
      const existingIndex = prev.findIndex(t => t.id === taskId);
      
      if (existingIndex === -1) {
        // INSERT: Adicionar no início
        return [updatedTask, ...prev];
      } else {
        // UPDATE: Substituir a tarefa existente
        const newTasks = [...prev];
        newTasks[existingIndex] = updatedTask;
        return newTasks;
      }
    });

    // Atualizar selectedTask se for a mesma
    if (selectedTaskRef.current?.id === taskId) {
      setSelectedTask(updatedTask);
    }
  }, [setTasks, setSelectedTask, selectedTaskRef]);

  // Handler para eventos realtime
  const handleRealtimeChange = useCallback(async (
    payload: RealtimePostgresChangesPayload<{ [key: string]: any }>
  ) => {
    const taskId = (payload.new as any)?.id || (payload.old as any)?.id;
    if (!taskId) return;

    // Verificar se é um soft delete
    if (payload.eventType === 'UPDATE' && (payload.new as any)?.deleted_at) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      return;
    }

    // Tocar sons
    if (payload.eventType === 'INSERT') {
      onNewTask?.();
    } else if (payload.eventType === 'UPDATE') {
      const oldStatus = (payload.old as any)?.status;
      const newStatus = (payload.new as any)?.status;
      if (oldStatus !== newStatus) {
        onStatusChange?.();
      }
    }

    // Processar atualização
    await processUpdate(taskId, payload.eventType);
  }, [processUpdate, onNewTask, onStatusChange, setTasks]);

  useEffect(() => {
    // Channel principal para design_tasks
    const tasksChannel = supabase
      .channel("design_tasks_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "design_tasks",
        },
        handleRealtimeChange
      )
      .subscribe();

    // Channel para layouts (quando layouts mudam, precisamos atualizar a tarefa)
    const layoutsChannel = supabase
      .channel("layouts_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "design_task_layouts",
        },
        async (payload) => {
          const taskId = (payload.new as any)?.task_id || (payload.old as any)?.task_id;
          if (taskId) {
            await processUpdate(taskId, 'UPDATE');
          }
        }
      )
      .subscribe();

    // Channel para leads (quando lead muda, precisamos atualizar a tarefa associada)
    const leadsChannel = supabase
      .channel("leads_realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
        },
        async (payload) => {
          const leadId = (payload.new as any)?.id;
          if (!leadId) return;
          
          // Encontrar tarefas com esse lead
          const tasksWithLead = tasks.filter(t => t.lead_id === leadId);
          for (const task of tasksWithLead) {
            await processUpdate(task.id, 'UPDATE');
          }
        }
      )
      .subscribe();

    // Channel para change_requests
    const changeRequestsChannel = supabase
      .channel("change_requests_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "change_requests",
        },
        async (payload) => {
          const taskId = (payload.new as any)?.task_id || (payload.old as any)?.task_id;
          if (taskId) {
            // Atualizar selectedTask se for a mesma (para atualizar aba de alterações)
            if (selectedTaskRef.current?.id === taskId) {
              const updatedTask = await fetchSingleTask(taskId);
              if (updatedTask) {
                setSelectedTask(updatedTask);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(layoutsChannel);
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(changeRequestsChannel);
    };
  }, [handleRealtimeChange, processUpdate, tasks, selectedTaskRef, setSelectedTask]);

  return {
    fetchSingleTask,
  };
};
