import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://nwh.techspacesports.com.br/webhook/events_criacao';

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

    // Initialize Supabase client
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

    // Determine base URL for approval link
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || '';
    const defaultDomain = `https://${projectRef}.lovable.app`;
    const baseUrl = companySettings?.custom_domain 
      ? `https://${companySettings.custom_domain}` 
      : defaultDomain;

    console.log('📤 [SEND LAYOUT WEBHOOK] Base URL for approval:', baseUrl);

    // Generate unique token for approval link
    const approvalToken = generateToken(32);
    const taskId = payload.card_id;
    const layoutId = payload.layout_id || null;

    // Create approval link record in database
    const { error: linkError } = await supabase
      .from('layout_approval_links')
      .insert({
        task_id: taskId,
        layout_id: layoutId,
        token: approvalToken,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        created_by: payload.sent_by?.user_id || null
      });

    if (linkError) {
      console.error('❌ [SEND LAYOUT WEBHOOK] Error creating approval link:', linkError);
      throw new Error(`Failed to create approval link: ${linkError.message}`);
    }

    // Build the approval URL
    const approvalUrl = `${baseUrl}/approval/${approvalToken}`;
    console.log('📤 [SEND LAYOUT WEBHOOK] Generated approval URL:', approvalUrl);

    // Add approval link to payload before forwarding
    const enrichedPayload = {
      ...payload,
      approval_link: approvalUrl,
      approval_token: approvalToken
    };

    // Forward to external webhook
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enrichedPayload),
    });

    const responseText = await response.text();
    
    console.log('📥 [SEND LAYOUT WEBHOOK] External response status:', response.status);
    console.log('📥 [SEND LAYOUT WEBHOOK] External response body:', responseText);

    // Log in design_task_history
    await supabase
      .from('design_task_history')
      .insert({
        task_id: taskId,
        action: 'approval_link_generated',
        notes: `Link de aprovação gerado: ${approvalUrl}`
      });

    if (!response.ok) {
      console.error('❌ [SEND LAYOUT WEBHOOK] External webhook failed:', response.status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Webhook failed with status ${response.status}`,
          details: responseText,
          approval_link: approvalUrl // Still return the link even if webhook fails
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
        externalResponse: responseText,
        approval_link: approvalUrl
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
