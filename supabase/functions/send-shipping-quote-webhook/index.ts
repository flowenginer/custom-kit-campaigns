import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://nwh.techspacesports.com.br/webhook/events_criacao';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      task_id, 
      selection_link_id,
      selection_link_url, 
      shipping_options, 
      dimension_info 
    } = await req.json();

    console.log('[Shipping Quote Webhook] Starting for task:', task_id);

    if (!task_id) {
      throw new Error('task_id is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch task data with related info
    const { data: task, error: taskError } = await supabase
      .from('design_tasks')
      .select(`
        id,
        order_id,
        lead_id,
        campaign_id,
        status,
        priority,
        order_number,
        customer_id,
        created_at,
        orders (
          id,
          customer_name,
          customer_email,
          customer_phone,
          quantity
        ),
        campaigns (
          id,
          name,
          segment_tag
        )
      `)
      .eq('id', task_id)
      .single();

    if (taskError) {
      console.error('[Shipping Quote Webhook] Error fetching task:', taskError);
      throw new Error(`Failed to fetch task: ${taskError.message}`);
    }

    console.log('[Shipping Quote Webhook] Task data fetched:', task?.id);

    // Cast orders and campaigns to single objects (they come from single() query)
    const order = task.orders as unknown as { id: string; customer_name: string; customer_email: string | null; customer_phone: string | null; quantity: number } | null;
    const campaign = task.campaigns as unknown as { id: string; name: string; segment_tag: string | null } | null;

    // Fetch customer data if customer_id exists
    let customerData: { id: string; name: string; email: string | null; phone: string; cep: string; street: string; number: string; complement: string | null; neighborhood: string; city: string; state: string } | null = null;
    if (task.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id, name, email, phone, cep, street, number, complement, neighborhood, city, state')
        .eq('id', task.customer_id)
        .single();
      
      customerData = customer;
    }

    // Build webhook payload
    const webhookPayload = {
      event: 'shipping_quote_sent',
      timestamp: new Date().toISOString(),
      task: {
        id: task.id,
        order_id: task.order_id,
        order_number: task.order_number,
        status: task.status,
        priority: task.priority,
        campaign_id: task.campaign_id,
        campaign_name: campaign?.name || null,
        segment_tag: campaign?.segment_tag || null,
      },
      customer: {
        id: task.customer_id || null,
        name: customerData?.name || order?.customer_name || null,
        email: customerData?.email || order?.customer_email || null,
        phone: customerData?.phone || order?.customer_phone || null,
        address: customerData ? {
          cep: customerData.cep,
          street: customerData.street,
          number: customerData.number,
          complement: customerData.complement,
          neighborhood: customerData.neighborhood,
          city: customerData.city,
          state: customerData.state,
        } : null,
      },
      shipping: {
        selection_link_id: selection_link_id,
        selection_link_url: selection_link_url,
        options: shipping_options?.map((opt: { id: number; name: string; company: string | { name: string; picture?: string }; price: number; custom_price?: number; delivery_time: number; delivery_range?: { min: number; max: number } }) => ({
          id: opt.id,
          company: typeof opt.company === 'object' ? opt.company?.name : opt.company,
          company_picture: typeof opt.company === 'object' ? opt.company?.picture : null,
          name: opt.name,
          price: opt.custom_price || opt.price,
          original_price: opt.price,
          delivery_time: opt.delivery_time,
          delivery_range: opt.delivery_range || null,
        })) || [],
        dimensions: dimension_info?.calculated ? {
          weight: dimension_info.calculated.weight,
          width: dimension_info.calculated.width,
          height: dimension_info.calculated.height,
          length: dimension_info.calculated.length,
          quantity: dimension_info.calculated.quantity,
          insurance_value: dimension_info.calculated.insuranceValue,
        } : null,
        warnings: dimension_info?.warnings || [],
      },
      order: {
        quantity: order?.quantity || null,
      },
    };

    console.log('[Shipping Quote Webhook] Sending payload to webhook:', WEBHOOK_URL);
    console.log('[Shipping Quote Webhook] Payload:', JSON.stringify(webhookPayload, null, 2));

    // Send to external webhook
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    const webhookResponseText = await webhookResponse.text();
    console.log('[Shipping Quote Webhook] External response status:', webhookResponse.status);
    console.log('[Shipping Quote Webhook] External response body:', webhookResponseText);

    // Log the webhook request
    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'shipping_quote_sent',
        payload: webhookPayload,
        response_status: webhookResponse.status,
        response_body: webhookResponseText,
        task_id: task_id,
      });

    if (logError) {
      console.error('[Shipping Quote Webhook] Error logging webhook:', logError);
    }

    // Add history entry
    const { error: historyError } = await supabase
      .from('design_task_history')
      .insert({
        task_id: task_id,
        action: 'shipping_quote_sent',
        notes: 'Link de seleção de frete enviado para o cliente',
      });

    if (historyError) {
      console.error('[Shipping Quote Webhook] Error adding history:', historyError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        webhook_status: webhookResponse.status,
        message: 'Webhook sent successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Shipping Quote Webhook] Error:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
