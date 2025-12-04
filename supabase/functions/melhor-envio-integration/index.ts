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

      case 'get_balance': {
        const balanceResponse = await fetch(`${baseUrl}/me/balance`, {
          method: 'GET',
          headers,
        });

        if (!balanceResponse.ok) {
          const error = await balanceResponse.text();
          console.error('[Melhor Envio] Balance error:', error);
          throw new Error('Erro ao consultar saldo');
        }

        const balanceData = await balanceResponse.json();
        console.log('[Melhor Envio] Balance:', balanceData);
        
        return new Response(JSON.stringify({ 
          success: true, 
          balance: balanceData.balance || 0,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'calculate_shipping': {
        const { task_id, customer_id } = data;
        
        console.log('[Melhor Envio] Calculating shipping for task:', task_id, 'customer:', customer_id);
        
        // Buscar transportadoras habilitadas
        const { data: enabledCarriers } = await supabaseAdmin
          .from('shipping_carriers')
          .select('code, name, services')
          .eq('enabled', true);
        
        console.log('[Melhor Envio] Enabled carriers:', enabledCarriers?.map(c => c.name));
        
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

        // Tabela de dimensões padrão por tipo de uniforme
        const defaultDimensionsByType: Record<string, { peso: number; largura: number; altura: number; profundidade: number }> = {
          'manga_curta': { peso: 0.30, largura: 20, altura: 2, profundidade: 20 },
          'manga_longa': { peso: 0.38, largura: 20, altura: 2.5, profundidade: 20 },
          'regata': { peso: 0.25, largura: 20, altura: 1.5, profundidade: 20 },
          'ziper': { peso: 0.45, largura: 25, altura: 3, profundidade: 25 },
          'ziper_manga_longa': { peso: 0.50, largura: 25, altura: 3.5, profundidade: 25 },
        };
        const defaultDimensions = { peso: 0.38, largura: 20, altura: 2, profundidade: 20 };

        let totalWeight = 0;
        let maxWidth = 0;
        let totalHeight = 0;
        let maxLength = 0;
        let totalQuantity = 0;
        
        // Buscar valor do orçamento aprovado se order_value for null
        let insuranceValue = task.order_value;
        if (!insuranceValue || insuranceValue <= 0) {
          const { data: quote } = await supabaseAdmin
            .from('quotes')
            .select('total_amount')
            .eq('task_id', task_id)
            .in('status', ['approved', 'sent'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          insuranceValue = quote?.total_amount || 100;
          console.log('[Melhor Envio] Using quote value for insurance:', insuranceValue, quote ? '(from quote)' : '(fallback)');
        } else {
          console.log('[Melhor Envio] Using order_value for insurance:', insuranceValue);
        }

        const dimensionWarnings: string[] = [];
        let layoutsWithoutModel = 0;
        let layoutsUsingUniformTypeFallback = 0;
        let modelsWithoutDimensions: string[] = [];

        if (layouts && layouts.length > 0) {
          for (const layout of layouts) {
            const model = layout.shirt_models;
            const qty = layout.quantity || 1;
            totalQuantity += qty;
            
            let dims = defaultDimensions;
            
            if (model) {
              const hasDimensions = model.peso && model.largura && model.altura && model.profundidade;
              
              if (hasDimensions) {
                dims = {
                  peso: model.peso,
                  largura: model.largura,
                  altura: model.altura,
                  profundidade: model.profundidade,
                };
              } else {
                if (!modelsWithoutDimensions.includes(model.name)) {
                  modelsWithoutDimensions.push(model.name);
                }
                if (layout.uniform_type && defaultDimensionsByType[layout.uniform_type]) {
                  dims = defaultDimensionsByType[layout.uniform_type];
                }
              }
            } else {
              layoutsWithoutModel++;
              
              if (layout.uniform_type && defaultDimensionsByType[layout.uniform_type]) {
                dims = defaultDimensionsByType[layout.uniform_type];
                layoutsUsingUniformTypeFallback++;
              }
            }
            
            totalWeight += dims.peso * qty;
            totalHeight += dims.altura * qty;
            maxWidth = Math.max(maxWidth, dims.largura);
            maxLength = Math.max(maxLength, dims.profundidade);
          }
        } else if (task.orders) {
          const order = task.orders;
          totalQuantity = order.quantity || 1;
          totalWeight = defaultDimensions.peso * totalQuantity;
          totalHeight = defaultDimensions.altura * totalQuantity;
          maxWidth = defaultDimensions.largura;
          maxLength = defaultDimensions.profundidade;
          dimensionWarnings.push('Pedido sem layouts - usando dimensões padrão estimadas');
        }

        if (layoutsWithoutModel > 0) {
          if (layoutsUsingUniformTypeFallback > 0) {
            dimensionWarnings.push(`${layoutsWithoutModel} layout(s) "do zero" - usando dimensões padrão por tipo de uniforme`);
          } else {
            dimensionWarnings.push(`${layoutsWithoutModel} layout(s) sem modelo vinculado - usando dimensões padrão genéricas`);
          }
        }
        
        if (modelsWithoutDimensions.length > 0) {
          dimensionWarnings.push(`Modelo(s) sem dimensões cadastradas: ${modelsWithoutDimensions.join(', ')} - cadastre em Produtos → Preços`);
        }

        const finalWidth = Math.max(maxWidth || 20, 11);
        const finalHeight = Math.max(totalHeight || 10, 2);
        const finalLength = Math.max(maxLength || 20, 16);
        const finalWeight = Math.max(totalWeight, 0.3);

        const cappedLength = Math.min(finalLength, 100);
        const cappedWidth = Math.min(finalWidth, 100);
        const cappedHeight = Math.min(finalHeight, 100);

        const dimensionInfo = {
          calculated: {
            weight: Number(finalWeight.toFixed(2)),
            width: finalWidth,
            height: cappedHeight,
            length: cappedLength,
            quantity: totalQuantity,
            insuranceValue: insuranceValue,
          },
          warnings: dimensionWarnings,
          usingDefaults: dimensionWarnings.length > 0,
        };

        console.log('[Melhor Envio] Dimension validation:', dimensionInfo);

        const quotePayload = {
          from: {
            postal_code: settings.cep.replace(/\D/g, ''),
          },
          to: {
            postal_code: customer.cep.replace(/\D/g, ''),
          },
          products: [{
            id: task_id,
            width: cappedWidth,
            height: cappedHeight,
            length: cappedLength,
            weight: finalWeight,
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

        // Filtrar por transportadoras habilitadas
        let filteredQuotes = quotes;
        if (enabledCarriers && enabledCarriers.length > 0) {
          const carrierNameMap: Record<string, string> = {
            'Correios': 'correios',
            'JadLog': 'jadlog', 
            'Jadlog': 'jadlog',
            'JeT': 'jet',
            'Loggi': 'loggi',
            'Buslog': 'buslog',
            'Azul Cargo': 'azul',
            'Latam Cargo': 'latam',
          };

          const enabledServices = new Set<string>();
          for (const carrier of enabledCarriers) {
            const services = carrier.services as Array<{code: string; name: string; enabled: boolean}>;
            for (const service of services) {
              if (service.enabled) {
                const serviceName = service.name.toLowerCase();
                enabledServices.add(`${carrier.code}:${serviceName}`);
              }
            }
          }

          console.log('[Melhor Envio] Enabled services:', Array.from(enabledServices));

          filteredQuotes = quotes.filter(q => {
            const carrierCode = carrierNameMap[q.company.name] || q.company.name.toLowerCase();
            const serviceName = q.name.toLowerCase();
            
            const carrierEnabled = enabledCarriers.some(c => c.code === carrierCode);
            if (!carrierEnabled) {
              console.log(`[Melhor Envio] Filtering out ${q.name} - carrier ${q.company.name} not enabled`);
              return false;
            }
            
            const carrier = enabledCarriers.find(c => c.code === carrierCode);
            if (carrier) {
              const services = carrier.services as Array<{code: string; name: string; enabled: boolean}>;
              const serviceEnabled = services.some(s => 
                s.enabled && (
                  serviceName.includes(s.name.toLowerCase()) ||
                  s.name.toLowerCase().includes(serviceName) ||
                  s.code === serviceName
                )
              );
              if (!serviceEnabled) {
                console.log(`[Melhor Envio] Filtering out ${q.name} - service not enabled for ${q.company.name}`);
                return false;
              }
            }
            
            return true;
          });

          console.log(`[Melhor Envio] Filtered ${quotes.length} quotes to ${filteredQuotes.length}`);
        }

        filteredQuotes.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

        // Aplicar markup de preço se configurado
        const markupType = settings.shipping_markup_type || 'fixed';
        const markupValue = settings.shipping_markup_value || 0;
        console.log(`[Melhor Envio] Applying markup: ${markupType} = ${markupValue}`);

        const applyMarkup = (price: number): number => {
          if (markupValue <= 0) return price;
          if (markupType === 'percentage') {
            return price * (1 + markupValue / 100);
          }
          return price + markupValue;
        };

        return new Response(JSON.stringify({ 
          success: true, 
          quotes: filteredQuotes.map(q => {
            const originalPrice = parseFloat(q.price) - parseFloat(q.discount);
            const finalPrice = applyMarkup(originalPrice);
            return {
              id: q.id,
              name: q.name,
              company: q.company.name,
              price: parseFloat(q.price),
              discount: parseFloat(q.discount),
              final_price: Number(finalPrice.toFixed(2)),
              delivery_time: q.delivery_time,
              delivery_range: q.delivery_range,
            };
          }),
          dimensions: dimensionInfo,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create_shipping': {
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

        // Buscar valor do orçamento se order_value for null
        let orderValue = task.order_value;
        if (!orderValue || orderValue <= 0) {
          const { data: quote } = await supabaseAdmin
            .from('quotes')
            .select('total_amount')
            .eq('task_id', task_id)
            .in('status', ['approved', 'sent'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          orderValue = quote?.total_amount || 100;
        }

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
            name: model?.name || 'Uniforme personalizado',
            quantity: order.quantity,
            unitary_value: orderValue / order.quantity,
          }],
          volumes: [{
            height: model?.altura || 10,
            width: model?.largura || 20,
            length: model?.profundidade || 30,
            weight: model?.peso || 0.5,
          }],
          options: {
            insurance_value: orderValue,
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

        // Criar registro no histórico de envios
        await supabaseAdmin
          .from('shipment_history')
          .insert({
            task_id: task_id,
            melhor_envio_id: result.id,
            service_name: shipping_option.name,
            carrier_name: shipping_option.company,
            price: shipping_option.final_price,
            tracking_code: result.tracking || null,
            status: 'pending',
            created_by: user.id,
          });

        return new Response(JSON.stringify({ 
          success: true, 
          shipping_id: result.id,
          tracking: result.tracking,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'print_label': {
        const { melhor_envio_id } = data;
        
        console.log('[Melhor Envio] Printing label for:', melhor_envio_id);

        const printResponse = await fetch(`${baseUrl}/me/shipment/print`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            mode: 'public',
            orders: [melhor_envio_id],
          }),
        });

        if (!printResponse.ok) {
          const error = await printResponse.text();
          console.error('[Melhor Envio] Print error:', error);
          throw new Error(`Erro ao imprimir etiqueta: ${error}`);
        }

        const printResult = await printResponse.json();
        console.log('[Melhor Envio] Print result:', printResult);

        // Atualizar histórico com URL da etiqueta
        if (printResult.url) {
          await supabaseAdmin
            .from('shipment_history')
            .update({ label_url: printResult.url })
            .eq('melhor_envio_id', melhor_envio_id);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          label_url: printResult.url,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'cancel_label': {
        const { melhor_envio_id, reason } = data;
        
        console.log('[Melhor Envio] Canceling label:', melhor_envio_id);

        const cancelResponse = await fetch(`${baseUrl}/me/shipment/cancel`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            order: {
              id: melhor_envio_id,
              reason_id: reason || '2',
              description: 'Cancelamento solicitado pelo usuário',
            },
          }),
        });

        if (!cancelResponse.ok) {
          const error = await cancelResponse.text();
          console.error('[Melhor Envio] Cancel error:', error);
          throw new Error(`Erro ao cancelar etiqueta: ${error}`);
        }

        const cancelResult = await cancelResponse.json();
        console.log('[Melhor Envio] Cancel result:', cancelResult);

        // Atualizar histórico
        await supabaseAdmin
          .from('shipment_history')
          .update({ 
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          })
          .eq('melhor_envio_id', melhor_envio_id);

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Etiqueta cancelada com sucesso',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_tracking': {
        const { task_id, melhor_envio_id } = data;
        
        let trackingId = melhor_envio_id;
        
        // Se não passou melhor_envio_id, buscar da task
        if (!trackingId && task_id) {
          const { data: task } = await supabaseAdmin
            .from('design_tasks')
            .select('shipping_option')
            .eq('id', task_id)
            .single();

          trackingId = task?.shipping_option?.melhor_envio_id;
        }
        
        if (!trackingId) {
          throw new Error('Envio não encontrado');
        }

        const trackingResponse = await fetch(`${baseUrl}/me/shipment/tracking`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            orders: [trackingId],
          }),
        });

        if (!trackingResponse.ok) {
          const error = await trackingResponse.text();
          throw new Error(`Erro ao buscar rastreamento: ${error}`);
        }

        const trackingData = await trackingResponse.json();
        console.log('[Melhor Envio] Tracking data:', trackingData);

        // Atualizar status no histórico se houver mudança
        const tracking = trackingData[trackingId];
        if (tracking) {
          const newStatus = tracking.status || 'pending';
          await supabaseAdmin
            .from('shipment_history')
            .update({
              status: newStatus,
              tracking_code: tracking.tracking || null,
              status_history: tracking.tracking_events || [],
              ...(newStatus === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
              ...(newStatus === 'posted' ? { posted_at: new Date().toISOString() } : {}),
            })
            .eq('melhor_envio_id', trackingId);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          tracking: trackingData,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'list_shipments': {
        const { status, limit = 50 } = data;
        
        let query = supabaseAdmin
          .from('shipment_history')
          .select(`
            *,
            design_tasks (
              id,
              order_number,
              orders (customer_name)
            )
          `)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (status) {
          query = query.eq('status', status);
        }

        const { data: shipments, error } = await query;

        if (error) throw error;

        return new Response(JSON.stringify({ 
          success: true, 
          shipments,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'list_agencies': {
        const { company_id, state, city } = data;
        
        let url = `${baseUrl}/me/shipment/agencies?`;
        if (company_id) url += `company=${company_id}&`;
        if (state) url += `state=${state}&`;
        if (city) url += `city=${encodeURIComponent(city)}`;

        const agenciesResponse = await fetch(url, {
          method: 'GET',
          headers,
        });

        if (!agenciesResponse.ok) {
          const error = await agenciesResponse.text();
          throw new Error(`Erro ao buscar agências: ${error}`);
        }

        const agencies = await agenciesResponse.json();

        return new Response(JSON.stringify({ 
          success: true, 
          agencies,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'sync_status': {
        // Sincronizar status de todos os envios pendentes
        const { data: pendingShipments } = await supabaseAdmin
          .from('shipment_history')
          .select('melhor_envio_id')
          .not('status', 'in', '("delivered","cancelled")')
          .limit(100);

        if (!pendingShipments || pendingShipments.length === 0) {
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Nenhum envio pendente para sincronizar',
            synced: 0,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const orderIds = pendingShipments.map(s => s.melhor_envio_id);
        
        const trackingResponse = await fetch(`${baseUrl}/me/shipment/tracking`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            orders: orderIds,
          }),
        });

        if (!trackingResponse.ok) {
          const error = await trackingResponse.text();
          throw new Error(`Erro ao sincronizar: ${error}`);
        }

        const trackingData = await trackingResponse.json();
        let synced = 0;

        for (const [orderId, tracking] of Object.entries(trackingData)) {
          const t = tracking as any;
          if (t && t.status) {
            await supabaseAdmin
              .from('shipment_history')
              .update({
                status: t.status,
                tracking_code: t.tracking || null,
                status_history: t.tracking_events || [],
                ...(t.status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
                ...(t.status === 'posted' ? { posted_at: new Date().toISOString() } : {}),
              })
              .eq('melhor_envio_id', orderId);
            synced++;
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: `${synced} envios sincronizados`,
          synced,
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
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
