import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event_type, session_id } = await req.json();

    if (!event_type || !session_id) {
      return new Response(
        JSON.stringify({ error: 'event_type and session_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing event: ${event_type} for session: ${session_id}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar webhooks configurados para este tipo de evento
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhook_configs')
      .select('*')
      .eq('event_type', event_type)
      .eq('is_active', true);

    if (webhooksError) {
      console.error('Error fetching webhooks:', webhooksError);
      throw webhooksError;
    }

    if (!webhooks || webhooks.length === 0) {
      console.log(`No active webhooks configured for event: ${event_type}`);
      return new Response(
        JSON.stringify({ success: true, message: 'No webhooks to trigger' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dados do lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        id,
        name,
        phone,
        email,
        current_step,
        quantity,
        custom_quantity,
        customization_summary,
        created_at,
        updated_at,
        last_seen,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        session_id,
        campaign_id,
        campaigns (
          id,
          name
        )
      `)
      .eq('session_id', session_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (leadError) {
      console.error('Error fetching lead:', leadError);
      throw leadError;
    }

    if (!lead) {
      console.log(`No lead found for session: ${session_id}`);
      return new Response(
        JSON.stringify({ success: false, message: 'Lead not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Contar visitas do session_id
    const { count: visitCount } = await supabase
      .from('funnel_events')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session_id)
      .in('event_type', ['visit', 'campaign_visit']);

    // Buscar primeiro e último evento
    const { data: events } = await supabase
      .from('funnel_events')
      .select('event_type, created_at')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true });

    const firstVisit = events?.[0]?.created_at || lead.created_at;
    const lastEvent = events?.[events.length - 1]?.event_type || 'unknown';

    // Construir payload
    const payload = {
      event: event_type,
      timestamp: new Date().toISOString(),
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        current_step: lead.current_step,
        quantity: lead.custom_quantity || lead.quantity,
        customization_summary: lead.customization_summary || null,
      },
      campaign: {
        id: lead.campaign_id,
        name: (lead.campaigns as any)?.name || 'N/A',
      },
      session: {
        id: session_id,
        visit_count: visitCount || 1,
        first_visit: firstVisit,
        last_event: lastEvent,
      },
      device: {
        type: (lead as any).device_type || 'unknown',
        os: (lead as any).device_os || 'unknown',
        browser: (lead as any).device_browser || 'unknown',
      },
      utm: {
        source: lead.utm_source,
        medium: lead.utm_medium,
        campaign: lead.utm_campaign,
        content: lead.utm_content,
        term: lead.utm_term,
      },
    };

    // Disparar webhooks
    const results = [];
    for (const webhook of webhooks) {
      console.log(`Triggering webhook: ${webhook.name} at ${webhook.webhook_url}`);
      
      try {
        const webhookPayload = webhook.include_customization 
          ? payload 
          : { ...payload, lead: { ...payload.lead, customization_summary: null } };

        const response = await fetch(webhook.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        });

        const success = response.ok;
        const responseBody = await response.text();

        // Logar resultado
        await supabase.from('webhook_logs').insert({
          webhook_url: webhook.webhook_url,
          payload: webhookPayload,
          response_status: response.status,
          response_body: responseBody.slice(0, 1000), // Limitar tamanho
          success,
          error_message: success ? null : `HTTP ${response.status}: ${responseBody}`,
        });

        results.push({
          webhook: webhook.name,
          success,
          status: response.status,
        });

        console.log(`Webhook ${webhook.name} ${success ? 'succeeded' : 'failed'}`);
      } catch (error) {
        console.error(`Error triggering webhook ${webhook.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Logar erro
        await supabase.from('webhook_logs').insert({
          webhook_url: webhook.webhook_url,
          payload,
          success: false,
          error_message: errorMessage,
        });

        results.push({
          webhook: webhook.name,
          success: false,
          error: errorMessage,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${webhooks.length} webhook(s)`,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhooks:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
