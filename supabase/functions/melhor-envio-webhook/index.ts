import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Status mapping from Melhor Envio
const statusMap: Record<string, string> = {
  'pending': 'pending',
  'released': 'released',
  'posted': 'posted',
  'in_transit': 'in_transit',
  'delivered': 'delivered',
  'canceled': 'cancelled',
  'undelivered': 'undelivered',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    console.log('[Melhor Envio Webhook] Received:', JSON.stringify(payload));

    // Melhor Envio sends webhooks in this format:
    // { order_id: string, status: string, tracking?: string, ... }
    const { order_id, status, tracking, melhor_tracking } = payload;

    if (!order_id) {
      console.log('[Melhor Envio Webhook] No order_id in payload');
      return new Response(JSON.stringify({ success: true, message: 'No order_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mappedStatus = statusMap[status] || status;
    console.log(`[Melhor Envio Webhook] Updating order ${order_id} to status ${mappedStatus}`);

    // Update shipment history
    const updateData: Record<string, any> = {
      status: mappedStatus,
      status_history: payload.tracking_events || [],
    };

    if (tracking || melhor_tracking) {
      updateData.tracking_code = tracking || melhor_tracking;
    }

    if (mappedStatus === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    } else if (mappedStatus === 'posted') {
      updateData.posted_at = new Date().toISOString();
    } else if (mappedStatus === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { data: shipment, error } = await supabaseAdmin
      .from('shipment_history')
      .update(updateData)
      .eq('melhor_envio_id', order_id)
      .select('id, task_id')
      .single();

    if (error) {
      console.error('[Melhor Envio Webhook] Update error:', error);
    } else {
      console.log('[Melhor Envio Webhook] Updated shipment:', shipment);

      // Create notification for important status changes
      if (['delivered', 'undelivered', 'cancelled'].includes(mappedStatus) && shipment?.task_id) {
        const { data: task } = await supabaseAdmin
          .from('design_tasks')
          .select('created_by, orders(customer_name)')
          .eq('id', shipment.task_id)
          .single();

        if (task?.created_by) {
          const customerName = (task.orders as any)?.customer_name || 'Cliente';
          const title = mappedStatus === 'delivered' 
            ? '📦 Pedido Entregue!'
            : mappedStatus === 'undelivered'
            ? '⚠️ Entrega Não Realizada'
            : '❌ Envio Cancelado';
          
          const message = mappedStatus === 'delivered'
            ? `O pedido de ${customerName} foi entregue com sucesso!`
            : mappedStatus === 'undelivered'
            ? `A entrega do pedido de ${customerName} não foi realizada.`
            : `O envio do pedido de ${customerName} foi cancelado.`;

          await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: task.created_by,
              task_id: shipment.task_id,
              title,
              message,
              type: 'shipping_update',
              customer_name: customerName,
            });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Melhor Envio Webhook] Error:', error);
    // Always return 200 to acknowledge receipt
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
