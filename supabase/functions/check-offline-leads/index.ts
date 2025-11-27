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
    console.log('[Check Offline Leads] Starting offline detection...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar leads que estão "online" mas não enviaram heartbeat há mais de 30 segundos
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

    const { data: offlineLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, session_id, name, phone')
      .eq('is_online', true)
      .lt('last_seen', thirtySecondsAgo)
      .is('deleted_at', null);

    if (leadsError) {
      console.error('[Check Offline Leads] Error fetching leads:', leadsError);
      throw leadsError;
    }

    if (!offlineLeads || offlineLeads.length === 0) {
      console.log('[Check Offline Leads] No offline leads found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No offline leads to process',
          count: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Check Offline Leads] Found ${offlineLeads.length} offline leads`);

    // Marcar leads como offline
    const leadIds = offlineLeads.map(l => l.id);
    const { error: updateError } = await supabase
      .from('leads')
      .update({ is_online: false })
      .in('id', leadIds);

    if (updateError) {
      console.error('[Check Offline Leads] Error updating leads:', updateError);
      throw updateError;
    }

    console.log(`[Check Offline Leads] Marked ${leadIds.length} leads as offline`);

    // Disparar webhook lead_abandoned para cada lead offline
    const webhookResults = [];
    for (const lead of offlineLeads) {
      console.log(`[Check Offline Leads] Triggering webhook for lead: ${lead.name} (${lead.session_id})`);
      
      try {
        const { data: webhookData, error: webhookError } = await supabase.functions.invoke(
          'process-event-webhooks',
          {
            body: {
              event_type: 'lead_abandoned',
              session_id: lead.session_id,
            },
          }
        );

        if (webhookError) {
          console.error(`[Check Offline Leads] Webhook error for ${lead.session_id}:`, webhookError);
          webhookResults.push({
            lead_id: lead.id,
            session_id: lead.session_id,
            success: false,
            error: webhookError.message,
          });
        } else {
          console.log(`[Check Offline Leads] Webhook triggered for ${lead.session_id}`);
          webhookResults.push({
            lead_id: lead.id,
            session_id: lead.session_id,
            success: true,
          });
        }
      } catch (error) {
        console.error(`[Check Offline Leads] Exception for ${lead.session_id}:`, error);
        webhookResults.push({
          lead_id: lead.id,
          session_id: lead.session_id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${offlineLeads.length} offline leads`,
        count: offlineLeads.length,
        webhook_results: webhookResults,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Check Offline Leads] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
