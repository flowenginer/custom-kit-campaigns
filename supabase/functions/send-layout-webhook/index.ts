import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const payload = await req.json();
    
    console.log('📤 [SEND LAYOUT WEBHOOK] Received request');
    console.log('📤 [SEND LAYOUT WEBHOOK] Card ID:', payload.card_id);
    console.log('📤 [SEND LAYOUT WEBHOOK] Customer:', payload.card_data?.customer_name);
    console.log('📤 [SEND LAYOUT WEBHOOK] Mockups count:', payload.mockups?.length);

    // Forward to external webhook
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    
    console.log('📥 [SEND LAYOUT WEBHOOK] External response status:', response.status);
    console.log('📥 [SEND LAYOUT WEBHOOK] External response body:', responseText);

    if (!response.ok) {
      console.error('❌ [SEND LAYOUT WEBHOOK] External webhook failed:', response.status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Webhook failed with status ${response.status}`,
          details: responseText
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ [SEND LAYOUT WEBHOOK] Success!');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Layout enviado com sucesso',
        externalResponse: responseText
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [SEND LAYOUT WEBHOOK] Error:', errorMessage);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
