import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://nwh.chelsan.com.br/webhook/criacao-aprovacao';

// Generate a random token
function generateToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task_id, layout_id } = await req.json();

    if (!task_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'task_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing approval webhook for task:', task_id, 'layout:', layout_id);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get company settings for custom domain
    const { data: companySettings } = await supabase
      .from('company_settings')
      .select('custom_domain')
      .limit(1)
      .single();

    const baseUrl = companySettings?.custom_domain || Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || '';

    // Generate unique token for approval link
    const approvalToken = generateToken(32);
    
    // Create approval link record
    const { error: linkError } = await supabase
      .from('layout_approval_links')
      .insert({
        task_id,
        layout_id: layout_id || null,
        token: approvalToken,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });

    if (linkError) {
      console.error('Error creating approval link:', linkError);
      throw linkError;
    }

    // Build the approval URL
    const approvalUrl = `${baseUrl}/approval/${approvalToken}`;
    console.log('Generated approval URL:', approvalUrl);

    // Buscar dados completos da tarefa
    const { data: task, error: taskError } = await supabase
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
      .eq('id', task_id)
      .maybeSingle();

    if (taskError) throw taskError;

    if (!task) {
      return new Response(
        JSON.stringify({ success: false, error: 'Tarefa não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get layout data if layout_id provided
    let layoutData = null;
    if (layout_id) {
      const { data: layout } = await supabase
        .from('design_task_layouts')
        .select('*')
        .eq('id', layout_id)
        .single();
      layoutData = layout;
    }

    // Extrair URLs das imagens dos mockups
    let mockupImages: any[] = [];
    
    // First check layout-specific files
    if (layoutData?.design_files) {
      mockupImages = (layoutData.design_files as any[]).map((file: any) => ({
        url: file.url,
        version: file.version,
        uploaded_at: file.uploaded_at,
        notes: file.notes || null,
        client_approved: file.client_approved || false
      }));
    }
    
    // Fallback to task-level files
    if (mockupImages.length === 0 && Array.isArray(task.design_files)) {
      mockupImages = task.design_files.map((file: any) => ({
        url: file.url,
        version: file.version,
        uploaded_at: file.uploaded_at,
        notes: file.notes || null,
        client_approved: file.client_approved || false
      }));
    }

    // Preparar payload para o webhook
    const webhookPayload = {
      event: 'design_awaiting_approval',
      timestamp: new Date().toISOString(),
      task: {
        id: task.id,
        status: task.status,
        priority: task.priority,
        current_version: task.current_version,
        created_at: task.created_at,
        assigned_at: task.assigned_at
      },
      layout: layoutData ? {
        id: layoutData.id,
        layout_number: layoutData.layout_number,
        campaign_name: layoutData.campaign_name,
        uniform_type: layoutData.uniform_type,
        model_name: layoutData.model_name,
        current_version: layoutData.current_version
      } : null,
      customer: {
        name: task.orders.customer_name,
        email: task.orders.customer_email || null,
        phone: task.orders.customer_phone || null
      },
      order: {
        quantity: task.orders.quantity,
        customization_data: task.orders.customization_data,
        model_name: task.orders.shirt_models?.name || null
      },
      campaign: {
        name: task.campaigns?.name || null
      },
      mockups: mockupImages,
      designer_id: task.assigned_to,
      // NEW: Include approval link
      approval_link: approvalUrl,
      approval_token: approvalToken
    };

    console.log('Sending webhook to:', WEBHOOK_URL);
    console.log('Payload:', JSON.stringify(webhookPayload, null, 2));

    // Enviar webhook
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    const webhookResult = await webhookResponse.text();
    const webhookStatus = webhookResponse.status;

    console.log('Webhook response status:', webhookStatus);
    console.log('Webhook response body:', webhookResult);

    // Salvar log do webhook na tabela
    await supabase
      .from('webhook_logs')
      .insert({
        task_id,
        webhook_url: WEBHOOK_URL,
        payload: webhookPayload,
        response_status: webhookStatus,
        response_body: webhookResult.substring(0, 1000), // Limitar tamanho
        success: webhookResponse.ok,
        error_message: webhookResponse.ok ? null : `Status ${webhookStatus}: ${webhookResult}`
      });

    // Log no histórico da tarefa
    await supabase
      .from('design_task_history')
      .insert({
        task_id,
        action: 'webhook_sent',
        notes: `Webhook enviado para aprovação. Link: ${approvalUrl}`
      });

    if (!webhookResponse.ok) {
      throw new Error(`Webhook falhou com status ${webhookStatus}: ${webhookResult}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook enviado com sucesso',
        webhook_status: webhookStatus,
        mockups_count: mockupImages.length,
        approval_link: approvalUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-approval-webhook:', error);
    
    // Tentar salvar log de erro
    try {
      const { task_id } = await req.json().catch(() => ({}));
      if (task_id) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabase
          .from('webhook_logs')
          .insert({
            task_id,
            webhook_url: WEBHOOK_URL,
            payload: {},
            response_status: null,
            response_body: null,
            success: false,
            error_message: error.message
          });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
