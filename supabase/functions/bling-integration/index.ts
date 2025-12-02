import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BlingProduct {
  id: string;
  codigo: string;
  descricao: string;
  preco: number;
  tipo: string;
  situacao: string;
  formato: string;
  descricaoCurta: string;
  unidade: string;
  pesoLiquido: number;
  pesoBruto: number;
  volumes: number;
  itensPorCaixa: number;
  gtin: string;
  gtinEmbalagem: string;
  tipoProducao: string;
  condicao: number;
  freteGratis: boolean;
  marca: string;
  descricaoComplementar: string;
  linkExterno: string;
  observacoes: string;
  dataInclusao: string;
  dataAlteracao: string;
  imageThumbnail: string;
  urlVideo: string;
  nomeFornecedor: string;
  codigoFabricante: string;
}

interface BlingOrder {
  numero: string;
  numeroLoja: string;
  data: string;
  dataSaida: string;
  dataPrevista: string;
  totalProdutos: number;
  total: number;
  situacao: string;
  cliente: {
    nome: string;
    tipoPessoa: string;
    cpf_cnpj: string;
    ie_rg: string;
    telefone: string;
    celular: string;
    email: string;
    endereco: string;
    numero: string;
    complemento: string;
    bairro: string;
    cep: string;
    cidade: string;
    uf: string;
  };
  itens: Array<{
    codigo: string;
    descricao: string;
    quantidade: number;
    valorunidade: number;
    precocusto: number;
    descontoItem: number;
    un: string;
    pesoBruto: number;
    largura: number;
    altura: number;
    profundidade: number;
  }>;
  parcelas: Array<{
    data: string;
    vlr: number;
    obs: string;
    forma_pagamento: {
      id: number;
      descricao: string;
    };
  }>;
  transporte: {
    transportadora: string;
    tipo_frete: string;
    servico_correios: string;
    dados_etiqueta: {
      nome: string;
      endereco: string;
      numero: string;
      complemento: string;
      municipio: string;
      uf: string;
      cep: string;
      bairro: string;
    };
    volumes: Array<{
      volume: {
        servico: string;
      };
    }>;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const action = body.action;
    const data = body.data || body;
    
    // Buscar configurações do Bling (usando admin para bypass de RLS)
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('company_settings')
      .select('bling_enabled, bling_client_id, bling_client_secret')
      .maybeSingle();

    if (settingsError) {
      console.error('[Bling] Error fetching settings:', settingsError);
      throw new Error('Erro ao buscar configurações do Bling');
    }

    if (!settings) {
      throw new Error('Configure as credenciais do Bling em Configurações > Empresa.');
    }

    if (!settings?.bling_enabled) {
      throw new Error('Integração com Bling está desativada. Conecte ao Bling em Configurações da Empresa.');
    }

    // Buscar access token da tabela OAuth
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('bling_oauth_tokens')
      .select('*')
      .maybeSingle();

    if (tokenError || !tokenData?.access_token) {
      throw new Error('Bling não conectado. Conecte ao Bling em Configurações da Empresa.');
    }

    let accessToken = tokenData.access_token;

    // Verificar se token expirou
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log('[Bling] Token expired, refreshing...');
      
      // Tentar renovar o token
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
        // Token inválido, deletar e pedir reconexão
        await supabaseAdmin
          .from('bling_oauth_tokens')
          .delete()
          .eq('id', tokenData.id);
        
        throw new Error('Token do Bling expirou. Reconecte ao Bling em Configurações da Empresa.');
      }

      const newTokenData = await refreshResponse.json();
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + newTokenData.expires_in);

      // Atualizar tokens
      await supabaseAdmin
        .from('bling_oauth_tokens')
        .update({
          access_token: newTokenData.access_token,
          refresh_token: newTokenData.refresh_token,
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', tokenData.id);

      accessToken = newTokenData.access_token;
      console.log('[Bling] Token refreshed successfully');
    }

    const blingBaseUrl = 'https://api.bling.com.br/Api/v3';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    };

    console.log(`[Bling Integration] Action: ${action}`, data);

    switch (action) {
      case 'sync_product': {
        // Sincronizar produto do shirt_models para Bling
        const model_id = data.model_id || data.product_id || body.product_id;
        
        const { data: model, error: modelError } = await supabaseClient
          .from('shirt_models')
          .select('*')
          .eq('id', model_id)
          .single();

        if (modelError) throw modelError;

        // Buscar variações ativas do produto
        const { data: variations } = await supabaseClient
          .from('shirt_model_variations')
          .select('*')
          .eq('model_id', model_id)
          .eq('is_active', true);

        // Buscar preço do produto
        const { data: pricing } = await supabaseClient
          .from('product_prices')
          .select('*')
          .eq('model_tag', model.model_tag)
          .eq('is_active', true)
          .single();

        const basePrice = pricing?.base_price || model.base_price || 0;
        const hasVariations = variations && variations.length > 0;

        const productPayload: any = {
          nome: model.name,
          codigo: model.sku || model.model_tag,
          preco: basePrice,
          tipo: 'P', // Produto
          situacao: 'A', // Ativo
          formato: hasVariations ? 'V' : 'S', // V = Com Variação, S = Simples
          descricaoComplementar: `Modelo: ${model.name}`,
          unidade: model.unidade || 'UN',
          pesoLiquido: model.peso || 0,
          pesoBruto: model.peso || 0,
          volumes: model.volumes || 1,
          estrutura: {
            tipoEstoque: 'F' // Físico
          },
          dimensoes: {
            largura: model.largura || 0,
            altura: model.altura || 0,
            profundidade: model.profundidade || 0,
            unidadeMedida: 1 // Centímetros
          }
        };

        // Adicionar imagem do produto
        if (model.photo_main) {
          productPayload.midia = {
            imagens: {
              externas: [
                { link: model.photo_main }
              ]
            }
          };
          console.log('[Bling] Adding product image:', model.photo_main);
        }

        // Adicionar variações se existirem
        if (hasVariations) {
          // Filtrar variações válidas (com SKU e tamanho)
          const validVariations = variations.filter((v: any) => v.sku_suffix && v.size);
          
          console.log(`[Bling] Processing ${validVariations.length} valid variations out of ${variations.length} total`);
          
          productPayload.variacoes = validVariations.map((v: any) => {
            // Calcular preço da variação (ajuste substitui base, não soma)
            let variationPrice = basePrice;
            if (v.promotional_price && v.promotional_price > 0) {
              variationPrice = v.promotional_price;
            } else if (v.price_adjustment && v.price_adjustment > 0) {
              variationPrice = v.price_adjustment;
            }

            // Corrigir mapeamento de gênero (banco pode ter 'masculino', 'feminino', 'infantil', 'male', 'female')
            const genderLower = (v.gender || '').toLowerCase();
            const genderLabel = (genderLower === 'masculino' || genderLower === 'male') ? 'Masculino' : 
                               (genderLower === 'feminino' || genderLower === 'female') ? 'Feminino' : 'Infantil';

            // IMPORTANTE: Cada variação PRECISA de tipo e formato próprios
            // tipo: 'P' = Produto (obrigatório)
            // formato: 'S' = Simples (variação não tem sub-variações)
            return {
              nome: `${v.size} - ${genderLabel}`,
              codigo: v.sku_suffix,
              preco: variationPrice,
              tipo: 'P',      // Obrigatório para variação
              formato: 'S',   // Simples (variação é um produto simples)
              situacao: 'A',
              unidade: 'UN'
            };
          });
          
          console.log(`[Bling] Adding ${validVariations.length} variations to product`);
          console.log('[Bling] Sample variation:', JSON.stringify(productPayload.variacoes[0], null, 2));
        }

        console.log('[Bling] Creating/updating product:', JSON.stringify(productPayload, null, 2));

        // Verificar se produto já existe
        let blingProductId = model.bling_product_id;
        
        if (blingProductId) {
          // Atualizar produto existente
          const updateResponse = await fetch(`${blingBaseUrl}/produtos/${blingProductId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(productPayload),
          });

          if (!updateResponse.ok) {
            const error = await updateResponse.text();
            console.error('[Bling] Update error:', error);
            throw new Error(`Erro ao atualizar produto no Bling: ${error}`);
          }
          console.log('[Bling] Product updated successfully');
        } else {
          // Criar novo produto
          const createResponse = await fetch(`${blingBaseUrl}/produtos`, {
            method: 'POST',
            headers,
            body: JSON.stringify(productPayload),
          });

          if (!createResponse.ok) {
            const error = await createResponse.text();
            console.error('[Bling] Create error:', error);
            throw new Error(`Erro ao criar produto no Bling: ${error}`);
          }

          const result = await createResponse.json();
          blingProductId = result.data.id;
          console.log('[Bling] Product created successfully with ID:', blingProductId);
        }

        // Atualizar shirt_models com ID do Bling
        await supabaseClient
          .from('shirt_models')
          .update({
            bling_product_id: blingProductId,
            bling_synced_at: new Date().toISOString(),
          })
          .eq('id', model_id);

        // Registrar exportação
        await supabaseClient
          .from('erp_exports')
          .insert({
            integration_type: 'bling',
            export_type: 'product',
            entity_id: model_id,
            external_id: blingProductId?.toString(),
            status: 'success',
            payload: productPayload,
            exported_by: user.id,
          });

        return new Response(JSON.stringify({ 
          success: true, 
          bling_product_id: blingProductId,
          variations_count: hasVariations ? variations.length : 0,
          has_image: !!model.photo_main
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'export_order': {
        // Exportar pedido para Bling
        const { task_id } = data;
        
        const { data: task, error: taskError } = await supabaseClient
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
        const customization = order.customization_data;

        // Preparar dados do cliente
        const clienteData = {
          nome: customer.name,
          tipoPessoa: customer.person_type === 'Física' ? 'F' : 'J',
          contribuinte: 9, // Não contribuinte
          cpf_cnpj: customer.person_type === 'Física' ? customer.cpf : customer.cnpj,
          ie_rg: customer.state_registration || '',
          telefone: customer.phone,
          email: customer.email || '',
          endereco: customer.street,
          numero: customer.number,
          complemento: customer.complement || '',
          bairro: customer.neighborhood,
          cep: customer.cep,
          cidade: customer.city,
          uf: customer.state,
        };

        // Buscar produto/modelo
        const { data: model } = await supabaseClient
          .from('shirt_models')
          .select('*')
          .eq('id', order.model_id)
          .single();

        if (!model?.bling_product_id) {
          throw new Error('Produto não sincronizado com Bling. Sincronize primeiro.');
        }

        // Preparar itens do pedido
        const items = [{
          codigo: model.sku || model.model_tag,
          descricao: `${model.name} - ${customization.model}`,
          quantidade: order.quantity,
          valorunidade: task.order_value / order.quantity,
          unidade: model.unidade || 'UN',
        }];

        const orderPayload = {
          data: new Date().toISOString().split('T')[0],
          numero: task.order_number || task.id.slice(0, 8),
          cliente: clienteData,
          itens: items,
          parcelas: [{
            data: new Date().toISOString().split('T')[0],
            vlr: task.order_value,
            forma_pagamento: {
              id: 1, // Dinheiro
            }
          }],
          transporte: {
            volumes: [{
              servico: 'SEDEX'
            }]
          }
        };

        console.log('[Bling] Creating order:', orderPayload);

        const createOrderResponse = await fetch(`${blingBaseUrl}/pedidos/vendas`, {
          method: 'POST',
          headers,
          body: JSON.stringify(orderPayload),
        });

        if (!createOrderResponse.ok) {
          const error = await createOrderResponse.text();
          console.error('[Bling] Order creation error:', error);
          throw new Error(`Erro ao criar pedido no Bling: ${error}`);
        }

        const orderResult = await createOrderResponse.json();
        const blingOrderId = orderResult.data.id;
        const blingOrderNumber = orderResult.data.numero;

        // Atualizar task com dados do Bling
        await supabaseClient
          .from('design_tasks')
          .update({
            bling_order_id: blingOrderId,
            bling_order_number: blingOrderNumber,
          })
          .eq('id', task_id);

        // Registrar exportação
        await supabaseClient
          .from('erp_exports')
          .insert({
            integration_type: 'bling',
            export_type: 'order',
            entity_id: task_id,
            external_id: blingOrderId?.toString(),
            external_number: blingOrderNumber,
            status: 'success',
            payload: orderPayload,
            response: orderResult,
            exported_by: user.id,
          });

        return new Response(JSON.stringify({ 
          success: true, 
          bling_order_id: blingOrderId,
          bling_order_number: blingOrderNumber 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Ação não suportada: ${action}`);
    }
  } catch (error) {
    console.error('[Bling Integration] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
