import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log('Task Operations API - Action:', action);

    // 1. LISTAR TAREFAS
    if (action === 'list') {
      const status = url.searchParams.get('status');
      const assigned_to = url.searchParams.get('assigned_to');

      let query = supabase
        .from('design_tasks')
        .select(`
          *,
          orders!inner (
            customer_name,
            customer_email,
            customer_phone,
            quantity,
            customization_data,
            model_id,
            shirt_models (name)
          ),
          campaigns (name)
        `)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);
      if (assigned_to) query = query.eq('assigned_to', assigned_to);

      const { data, error } = await query;
      
      if (error) throw error;

      console.log(`Found ${data?.length || 0} tasks`);

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. VER DETALHES DE UMA TAREFA (por ID ou TELEFONE)
    if (action === 'get') {
      const task_id = url.searchParams.get('task_id');
      const phone = url.searchParams.get('phone');
      
      // Validar: precisa ter um dos dois
      if (!task_id && !phone) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'É necessário fornecer task_id OU phone' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let query = supabase
        .from('design_tasks')
        .select(`
          *,
          orders!inner (
            customer_name,
            customer_email,
            customer_phone,
            quantity,
            customization_data,
            model_id,
            shirt_models (name)
          ),
          campaigns (name)
        `);

      // Filtrar por task_id ou phone
      if (task_id) {
        query = query.eq('id', task_id);
      } else if (phone) {
        query = query.eq('orders.customer_phone', phone);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      
      if (!data) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: phone 
              ? 'Nenhuma tarefa encontrada para este telefone' 
              : 'Tarefa não encontrada'
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Task found via ${task_id ? 'ID' : 'phone'}: ${data.id}`);

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. CRIAR NOVA TAREFA
    if (action === 'create' && req.method === 'POST') {
      const { order_id, campaign_id, priority, deadline, notes } = await req.json();

      // Validações
      if (!order_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'order_id é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Creating new task for order: ${order_id}`);

      // Buscar lead_id baseado no order_id
      const { data: orderData } = await supabase
        .from('orders')
        .select('campaign_id, session_id')
        .eq('id', order_id)
        .maybeSingle();

      if (!orderData) {
        return new Response(
          JSON.stringify({ success: false, error: 'Pedido não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: leadData } = await supabase
        .from('leads')
        .select('id')
        .eq('session_id', orderData.session_id)
        .maybeSingle();

      // Validar priority se fornecido
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      const taskPriority = priority && validPriorities.includes(priority) ? priority : 'normal';

      // Criar tarefa
      const { data: newTask, error } = await supabase
        .from('design_tasks')
        .insert({
          order_id,
          lead_id: leadData?.id || null,
          campaign_id: campaign_id || orderData.campaign_id,
          status: 'pending',
          priority: taskPriority,
          deadline: deadline || null
        })
        .select()
        .single();

      if (error) throw error;

      // Criar registro no histórico
      await supabase
        .from('design_task_history')
        .insert({
          task_id: newTask.id,
          action: 'created',
          new_status: 'pending',
          notes: notes || 'Tarefa criada via API'
        });

      console.log(`New task created: ${newTask.id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Tarefa criada com sucesso',
          data: newTask
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. ATUALIZAR STATUS
    if (action === 'update_status' && req.method === 'PATCH') {
      const { task_id, new_status, notes } = await req.json();

      if (!task_id || !new_status) {
        return new Response(
          JSON.stringify({ success: false, error: 'task_id e new_status são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validar status válido
      const validStatuses = ['pending', 'in_progress', 'awaiting_approval', 'approved', 'changes_requested', 'completed'];
      if (!validStatuses.includes(new_status)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Status inválido. Valores aceitos: ' + validStatuses.join(', ') }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar tarefa atual
      const { data: currentTask } = await supabase
        .from('design_tasks')
        .select('status')
        .eq('id', task_id)
        .maybeSingle();

      if (!currentTask) {
        return new Response(
          JSON.stringify({ success: false, error: 'Tarefa não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Atualizar status
      const { error: updateError } = await supabase
        .from('design_tasks')
        .update({ 
          status: new_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', task_id);

      if (updateError) throw updateError;

      // Criar registro no histórico
      await supabase
        .from('design_task_history')
        .insert({
          task_id,
          action: 'status_changed',
          old_status: currentTask.status,
          new_status,
          notes: notes || `Status alterado via API (N8n)`
        });

      console.log(`Task ${task_id} status changed from ${currentTask.status} to ${new_status}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Status atualizado com sucesso',
          old_status: currentTask.status,
          new_status 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. ATRIBUIR DESIGNER
    if (action === 'assign_designer' && req.method === 'PATCH') {
      const { task_id, designer_id } = await req.json();

      if (!task_id || !designer_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'task_id e designer_id são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('design_tasks')
        .update({ 
          assigned_to: designer_id,
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', task_id);

      if (error) throw error;

      // Criar registro no histórico
      await supabase
        .from('design_task_history')
        .insert({
          task_id,
          user_id: designer_id,
          action: 'assigned',
          notes: 'Designer atribuído via API (N8n)'
        });

      console.log(`Task ${task_id} assigned to ${designer_id}`);

      return new Response(
        JSON.stringify({ success: true, message: 'Designer atribuído com sucesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. ADICIONAR COMENTÁRIO
    if (action === 'add_comment' && req.method === 'POST') {
      const { task_id, comment, is_internal } = await req.json();

      if (!task_id || !comment) {
        return new Response(
          JSON.stringify({ success: false, error: 'task_id e comment são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('design_task_comments')
        .insert({
          task_id,
          comment,
          is_internal: is_internal ?? false
        });

      if (error) throw error;

      console.log(`Comment added to task ${task_id}`);

      return new Response(
        JSON.stringify({ success: true, message: 'Comentário adicionado com sucesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. VER HISTÓRICO
    if (action === 'get_history') {
      const task_id = url.searchParams.get('task_id');
      
      if (!task_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'task_id é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('design_task_history')
        .select('*')
        .eq('task_id', task_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`Found ${data?.length || 0} history records for task ${task_id}`);

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ação não reconhecida
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Ação não reconhecida. Ações disponíveis: list, get, update_status, assign_designer, add_comment, get_history' 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in task-operations:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
