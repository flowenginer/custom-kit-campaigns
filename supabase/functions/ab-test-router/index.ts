import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { testLink } = await req.json();
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log('[AB Test Router] Processing request for test:', testLink);

    // 1. Buscar teste A/B
    const { data: test, error: testError } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('unique_link', testLink)
      .eq('status', 'active')
      .single();

    if (testError || !test) {
      console.error('[AB Test Router] Test not found:', testError);
      return new Response(JSON.stringify({ error: 'Teste não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[AB Test Router] Test found:', test.name);

    // 2. Algoritmo de distribuição ponderada
    const campaigns = test.campaigns as Array<{ campaign_id: string, percentage: number }>;
    
    let random = Math.random() * 100;
    let selectedCampaign = campaigns[0].campaign_id;
    
    for (const campaign of campaigns) {
      if (random < campaign.percentage) {
        selectedCampaign = campaign.campaign_id;
        break;
      }
      random -= campaign.percentage;
    }

    console.log('[AB Test Router] Selected campaign:', selectedCampaign);

    // 3. Buscar unique_link da campanha escolhida
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('unique_link')
      .eq('id', selectedCampaign)
      .single();

    if (campaignError || !campaign) {
      console.error('[AB Test Router] Campaign not found:', campaignError);
      return new Response(JSON.stringify({ error: 'Campanha não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Atualizar métricas do teste
    const { error: incrementError } = await supabase.rpc('increment_ab_test_visit', {
      test_id: test.id,
      variant_id: selectedCampaign
    });

    if (incrementError) {
      console.error('[AB Test Router] Failed to increment visit:', incrementError);
    }

    // 5. Registrar evento
    const { error: eventError } = await supabase.from('ab_test_events').insert({
      ab_test_id: test.id,
      event_type: 'visit',
      campaign_id: selectedCampaign,
      session_id: sessionId,
      metadata: {
        user_agent: req.headers.get('user-agent'),
        referer: req.headers.get('referer')
      }
    });

    if (eventError) {
      console.error('[AB Test Router] Failed to log event:', eventError);
    }

    // 6. Retornar redirect URL
    const redirectUrl = `/c/${campaign.unique_link}?ab_test=${test.id}&ab_variant=${selectedCampaign}&session=${sessionId}`;
    
    console.log('[AB Test Router] Redirecting to:', redirectUrl);

    return new Response(JSON.stringify({ redirect: redirectUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[AB Test Router] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
