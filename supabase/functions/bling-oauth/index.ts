import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Usar service role para operações internas
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const action = body.action;

    console.log(`[Bling OAuth] Action: ${action}`);

    // Buscar credenciais OAuth do company_settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('company_settings')
      .select('bling_client_id, bling_client_secret')
      .single();

    switch (action) {
      case 'get_auth_url': {
        // Verificar autenticação
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          throw new Error('Não autorizado');
        }
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        if (!user) throw new Error('Não autorizado');

        const { redirect_uri } = body;
        
        if (!settings?.bling_client_id) {
          throw new Error('Client ID do Bling não configurado');
        }

        // Gerar state para segurança
        const state = crypto.randomUUID();
        
        // URL de autorização do Bling
        const authUrl = new URL('https://www.bling.com.br/Api/v3/oauth/authorize');
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', settings.bling_client_id);
        authUrl.searchParams.set('redirect_uri', redirect_uri);
        authUrl.searchParams.set('state', state);

        console.log('[Bling OAuth] Generated auth URL');

        return new Response(JSON.stringify({ 
          auth_url: authUrl.toString(),
          state 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'exchange_code': {
        // Verificar autenticação
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          throw new Error('Não autorizado');
        }
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        if (!user) throw new Error('Não autorizado');

        const { code, redirect_uri } = body;

        if (!settings?.bling_client_id || !settings?.bling_client_secret) {
          throw new Error('Credenciais OAuth do Bling não configuradas');
        }

        console.log('[Bling OAuth] Exchanging code for tokens...');

        // Trocar código por tokens
        const tokenResponse = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${settings.bling_client_id}:${settings.bling_client_secret}`)}`,
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri,
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('[Bling OAuth] Token exchange error:', errorText);
          throw new Error(`Erro ao obter tokens: ${errorText}`);
        }

        const tokenData = await tokenResponse.json();
        console.log('[Bling OAuth] Token exchange successful');

        // Calcular data de expiração
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

        // Deletar tokens antigos e inserir novos
        await supabaseAdmin
          .from('bling_oauth_tokens')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        const { error: insertError } = await supabaseAdmin
          .from('bling_oauth_tokens')
          .insert({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt.toISOString(),
            token_type: tokenData.token_type || 'Bearer',
            scope: tokenData.scope || null,
          });

        if (insertError) {
          console.error('[Bling OAuth] Error saving tokens:', insertError);
          throw new Error('Erro ao salvar tokens');
        }

        // Habilitar Bling automaticamente
        await supabaseAdmin
          .from('company_settings')
          .update({ bling_enabled: true })
          .neq('id', '00000000-0000-0000-0000-000000000000');

        console.log('[Bling OAuth] Tokens saved successfully');

        return new Response(JSON.stringify({ 
          success: true,
          expires_at: expiresAt.toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'refresh_token': {
        // Buscar refresh token atual
        const { data: tokenData, error: tokenError } = await supabaseAdmin
          .from('bling_oauth_tokens')
          .select('*')
          .single();

        if (tokenError || !tokenData?.refresh_token) {
          throw new Error('Nenhum token de refresh encontrado');
        }

        if (!settings?.bling_client_id || !settings?.bling_client_secret) {
          throw new Error('Credenciais OAuth do Bling não configuradas');
        }

        console.log('[Bling OAuth] Refreshing token...');

        const refreshResponse = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${settings.bling_client_id}:${settings.bling_client_secret}`)}`,
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: tokenData.refresh_token,
          }),
        });

        if (!refreshResponse.ok) {
          const errorText = await refreshResponse.text();
          console.error('[Bling OAuth] Refresh error:', errorText);
          
          // Se refresh falhou, deletar tokens inválidos
          await supabaseAdmin
            .from('bling_oauth_tokens')
            .delete()
            .eq('id', tokenData.id);
          
          throw new Error('Token expirado. Reconecte ao Bling.');
        }

        const newTokenData = await refreshResponse.json();
        console.log('[Bling OAuth] Token refreshed successfully');

        // Calcular nova data de expiração
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + newTokenData.expires_in);

        // Atualizar tokens
        await supabaseAdmin
          .from('bling_oauth_tokens')
          .update({
            access_token: newTokenData.access_token,
            refresh_token: newTokenData.refresh_token,
            expires_at: expiresAt.toISOString(),
            token_type: newTokenData.token_type || 'Bearer',
          })
          .eq('id', tokenData.id);

        return new Response(JSON.stringify({ 
          success: true,
          access_token: newTokenData.access_token,
          expires_at: expiresAt.toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_status': {
        // Verificar autenticação
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          throw new Error('Não autorizado');
        }
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        if (!user) throw new Error('Não autorizado');

        // Verificar se tem tokens válidos
        const { data: tokenData, error: tokenError } = await supabaseAdmin
          .from('bling_oauth_tokens')
          .select('expires_at')
          .single();

        const isConnected = !tokenError && tokenData?.expires_at;
        const isExpired = isConnected && new Date(tokenData.expires_at) < new Date();

        return new Response(JSON.stringify({ 
          connected: isConnected && !isExpired,
          expires_at: tokenData?.expires_at || null,
          has_credentials: !!settings?.bling_client_id && !!settings?.bling_client_secret
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'disconnect': {
        // Verificar autenticação
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          throw new Error('Não autorizado');
        }
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        if (!user) throw new Error('Não autorizado');

        // Deletar todos os tokens
        await supabaseAdmin
          .from('bling_oauth_tokens')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');

        // Desabilitar Bling
        await supabaseAdmin
          .from('company_settings')
          .update({ bling_enabled: false })
          .neq('id', '00000000-0000-0000-0000-000000000000');

        console.log('[Bling OAuth] Disconnected');

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Ação não suportada: ${action}`);
    }
  } catch (error) {
    console.error('[Bling OAuth] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
