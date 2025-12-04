import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShippingQuote {
  id: number;
  name: string;
  price: string;
  discount: string;
  currency: string;
  delivery_time: number;
  delivery_range: {
    min: number;
    max: number;
  };
  company: {
    id: number;
    name: string;
    picture: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Cliente para autenticação do usuário
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Cliente com service role para operações de banco de dados
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, data } = await req.json();

    // Buscar configurações da empresa (token Melhor Envio) usando service role
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('company_settings')
      .select('*')
      .single();

    console.log('[Melhor Envio] Settings fetch result:', { 
      hasSettings: !!settings, 
      hasToken: !!settings?.melhor_envio_token,
      error: settingsError?.message 
    });

    if (settingsError || !settings?.melhor_envio_token) {
      throw new Error('Token Melhor Envio não configurado');
    }

    const melhorEnvioToken = settings.melhor_envio_token;
    const environment = settings.melhor_envio_environment || 'production';
    const baseUrl = environment === 'sandbox' 
      ? 'https://sandbox.melhorenvio.com.br/api/v2'
      : 'https://melhorenvio.com.br/api/v2';

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${melhorEnvioToken}`,
      'Accept': 'application/json',
    };

    console.log(`[Melhor Envio] Action: ${action}, Environment: ${environment}`, data);

    switch (action) {
      case 'test_connection': {
        // Testar conexão com Melhor Envio
        const testResponse = await fetch(`${baseUrl}/me`, {
          method: 'GET',
          headers,
        });

        if (!testResponse.ok) {
          const error = await testResponse.text();
          console.error('[Melhor Envio] Test connection error:', error);
          throw new Error('Falha ao conectar com Melhor Envio. Verifique se o token está correto.');
        }

        const userData = await testResponse.json();
        
        return new Response(JSON.stringify({ 
          success: true, 
          data: {
            email: userData.email,
            name: `${userData.firstname} ${userData.lastname}`,
            document: userData.document,
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'calculate_shipping': {
        // Calcular frete
        const { task_id, customer_id } = data;
        
        console.log('[Melhor Envio] Calculating shipping for task:', task_id, 'customer:', customer_id);
        
        // Buscar task com layouts usando service role
        const { data: task, error: taskError } = await supabaseAdmin
          .from('design_tasks')
          .select(`
            *,
            orders (*),
            customers (*)
          `)
          .eq('id', task_id)
          .single();

        if (taskError) {
          console.error('[Melhor Envio] Task fetch error:', taskError);
          throw new Error(`Erro ao buscar pedido: ${taskError.message}`);
        }

        // Se não tem customer na task, buscar pelo customer_id passado
        let customer = task.customers;
        if (!customer && customer_id) {
          const { data: customerData, error: customerError } = await supabaseAdmin
            .from('customers')
            .select('*')
            .eq('id', customer_id)
            .single();
          
          if (customerError) {
            console.error('[Melhor Envio] Customer fetch error:', customerError);
          }
          customer = customerData;
        }

        if (!customer) {
          throw new Error('Cliente não encontrado. Vincule um cliente ao pedido primeiro.');
        }

        if (!customer.cep) {
          throw new Error('CEP do cliente não cadastrado.');
        }

        // Buscar layouts para pegar os modelos e calcular dimensões/peso totais
        const { data: layouts } = await supabaseAdmin
          .from('design_task_layouts')
          .select('*, shirt_models:model_id(*)')
          .eq('task_id', task_id);

        let totalWeight = 0;
        let maxWidth = 25;
        let maxHeight = 25;
        let maxLength = 5;
        let totalQuantity = 0;
        let insuranceValue = task.order_value || 100;

        if (layouts && layouts.length > 0) {
          for (const layout of layouts) {
            const model = layout.shirt_models;
            const qty = layout.quantity || 1;
            totalQuantity += qty;
            
            if (model) {
              totalWeight += (model.peso || 0.38) * qty;
              maxWidth = Math.max(maxWidth, model.largura || 25);
              maxHeight = Math.max(maxHeight, model.altura || 25);
              maxLength += (model.profundidade || 2) * qty;
            } else {
              // Dimensões padrão se não tiver modelo
              totalWeight += 0.38 * qty;
              maxLength += 2 * qty;
            }
          }
        } else if (task.orders) {
          // Fallback para order antigo
          const order = task.orders;
          totalQuantity = order.quantity || 1;
          totalWeight = 0.38 * totalQuantity;
          maxLength = 2 * totalQuantity;
        }

        // Garantir valores mínimos
        totalWeight = Math.max(totalWeight, 0.3);
        maxLength = Math.min(maxLength, 100); // Máximo 100cm

        const quotePayload = {
          from: {
            postal_code: settings.cep.replace(/\D/g, ''),
          },
          to: {
            postal_code: customer.cep.replace(/\D/g, ''),
          },
          products: [{
            id: task_id,
            width: maxWidth,
            height: maxHeight,
            length: maxLength,
            weight: totalWeight,
            insurance_value: insuranceValue,
            quantity: 1,
          }],
          options: {
            receipt: false,
            own_hand: false,
          },
        };

        console.log('[Melhor Envio] Calculating shipping:', quotePayload);

        const quoteResponse = await fetch(`${baseUrl}/me/shipment/calculate`, {
          method: 'POST',
          headers,
          body: JSON.stringify(quotePayload),
        });

        if (!quoteResponse.ok) {
          const error = await quoteResponse.text();
          console.error('[Melhor Envio] Quote error:', error);
          throw new Error(`Erro ao calcular frete: ${error}`);
        }

        const quotes: ShippingQuote[] = await quoteResponse.json();

        // Ordenar por preço
        quotes.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

        return new Response(JSON.stringify({ 
          success: true, 
          quotes: quotes.map(q => ({
            id: q.id,
            name: q.name,
            company: q.company.name,
            price: parseFloat(q.price),
            discount: parseFloat(q.discount),
            final_price: parseFloat(q.price) - parseFloat(q.discount),
            delivery_time: q.delivery_time,
            delivery_range: q.delivery_range,
          }))
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create_shipping': {
        // Criar etiqueta de envio
        const { task_id, shipping_option } = data;
        
        const { data: task, error: taskError } = await supabaseAdmin
          .from('design_tasks')
          .select(`
            *,
            orders (*),
            customers (*)
          `)
          .eq('id', task_id)
          .single();

        if (taskError) throw taskError;

        const order = task.orders;
        const customer = task.customers;

        // Buscar dados do produto
        const { data: model } = await supabaseAdmin
          .from('shirt_models')
          .select('*')
          .eq('id', order.model_id)
          .single();

        const orderPayload = {
          service: shipping_option.id,
          agency: null,
          from: {
            name: settings.razao_social,
            phone: settings.phone?.replace(/\D/g, ''),
            email: settings.email,
            document: settings.cnpj.replace(/\D/g, ''),
            company_document: settings.cnpj.replace(/\D/g, ''),
            state_register: settings.inscricao_estadual,
            address: settings.street,
            complement: settings.complement,
            number: settings.number,
            district: settings.neighborhood,
            city: settings.city,
            state_abbr: settings.state,
            country_id: 'BR',
            postal_code: settings.cep.replace(/\D/g, ''),
          },
          to: {
            name: customer.name,
            phone: customer.phone?.replace(/\D/g, ''),
            email: customer.email,
            document: customer.person_type === 'Física' 
              ? customer.cpf?.replace(/\D/g, '')
              : customer.cnpj?.replace(/\D/g, ''),
            address: customer.street,
            complement: customer.complement,
            number: customer.number,
            district: customer.neighborhood,
            city: customer.city,
            state_abbr: customer.state,
            country_id: 'BR',
            postal_code: customer.cep.replace(/\D/g, ''),
          },
          products: [{
            name: model.name,
            quantity: order.quantity,
            unitary_value: task.order_value / order.quantity,
          }],
          volumes: [{
            height: model.altura || 10,
            width: model.largura || 20,
            length: model.profundidade || 30,
            weight: model.peso || 0.5,
          }],
          options: {
            insurance_value: task.order_value,
            receipt: false,
            own_hand: false,
            reverse: false,
            non_commercial: false,
            invoice: {
              key: task.bling_order_number || task.order_number,
            },
          },
        };

        console.log('[Melhor Envio] Creating shipping:', orderPayload);

        const createResponse = await fetch(`${baseUrl}/me/cart`, {
          method: 'POST',
          headers,
          body: JSON.stringify(orderPayload),
        });

        if (!createResponse.ok) {
          const error = await createResponse.text();
          console.error('[Melhor Envio] Create error:', error);
          throw new Error(`Erro ao criar envio: ${error}`);
        }

        const result = await createResponse.json();

        // Adicionar ao carrinho e comprar
        const checkoutResponse = await fetch(`${baseUrl}/me/shipment/checkout`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            orders: [result.id],
          }),
        });

        if (!checkoutResponse.ok) {
          const error = await checkoutResponse.text();
          console.error('[Melhor Envio] Checkout error:', error);
          throw new Error(`Erro ao finalizar envio: ${error}`);
        }

        const checkout = await checkoutResponse.json();

        // Gerar etiqueta
        const labelResponse = await fetch(`${baseUrl}/me/shipment/generate`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            orders: [result.id],
          }),
        });

        if (!labelResponse.ok) {
          const error = await labelResponse.text();
          console.error('[Melhor Envio] Label error:', error);
          // Não falhar se a geração da etiqueta demorar
        }

        // Atualizar task com dados do envio
        await supabaseAdmin
          .from('design_tasks')
          .update({
            shipping_option: {
              service: shipping_option.name,
              company: shipping_option.company,
              price: shipping_option.final_price,
              delivery_time: shipping_option.delivery_time,
              melhor_envio_id: result.id,
            },
            shipping_value: shipping_option.final_price,
          })
          .eq('id', task_id);

        return new Response(JSON.stringify({ 
          success: true, 
          shipping_id: result.id,
          tracking: result.tracking,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_tracking': {
        // Buscar rastreamento
        const { task_id } = data;
        
        const { data: task, error: taskError } = await supabaseAdmin
          .from('design_tasks')
          .select('shipping_option')
          .eq('id', task_id)
          .single();

        if (taskError) throw taskError;

        const melhorEnvioId = task.shipping_option?.melhor_envio_id;
        
        if (!melhorEnvioId) {
          throw new Error('Envio não encontrado');
        }

        const trackingResponse = await fetch(`${baseUrl}/me/shipment/tracking?orders=${melhorEnvioId}`, {
          method: 'GET',
          headers,
        });

        if (!trackingResponse.ok) {
          const error = await trackingResponse.text();
          throw new Error(`Erro ao buscar rastreamento: ${error}`);
        }

        const tracking = await trackingResponse.json();

        return new Response(JSON.stringify({ 
          success: true, 
          tracking 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Ação não suportada: ${action}`);
    }
  } catch (error) {
    console.error('[Melhor Envio Integration] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    // Return 200 with error in body for better client handling
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
