import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Nomes brasileiros para gerar leads realistas
const firstNames = [
  'João', 'Maria', 'Pedro', 'Ana', 'Lucas', 'Julia', 'Carlos', 'Beatriz',
  'Fernando', 'Patricia', 'Rafael', 'Camila', 'Rodrigo', 'Fernanda', 'Bruno',
  'Mariana', 'Gustavo', 'Juliana', 'Diego', 'Amanda', 'Thiago', 'Gabriela',
  'Felipe', 'Larissa', 'Ricardo', 'Carla', 'Marcelo', 'Renata', 'Anderson',
  'Bruna', 'Eduardo', 'Tatiana', 'Vinicius', 'Priscila', 'Leonardo', 'Vanessa',
];

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Rodrigues',
  'Almeida', 'Nascimento', 'Carvalho', 'Ferreira', 'Gomes', 'Martins', 'Rocha',
  'Ribeiro', 'Barbosa', 'Araujo', 'Castro', 'Monteiro', 'Cardoso', 'Dias',
];

const utmSources = ['Meta', 'Google', 'TikTok', 'Instagram', 'Indicacao', 'Organico'];
const utmMediums = ['cpc', 'social', 'email', 'referral', 'organic'];
const utmCampaigns = ['black-friday', 'lancamento', 'remarketing', 'branding', 'promo-verao'];

const statusDistribution = [
  { status: 'pending', weight: 0.20 },
  { status: 'in_progress', weight: 0.25 },
  { status: 'awaiting_approval', weight: 0.15 },
  { status: 'changes_requested', weight: 0.10 },
  { status: 'approved', weight: 0.15 },
  { status: 'completed', weight: 0.15 },
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateInLast30Days(): string {
  const now = new Date();
  const daysAgo = randomInt(0, 30);
  const hoursAgo = randomInt(0, 23);
  const minutesAgo = randomInt(0, 59);
  
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(date.getHours() - hoursAgo);
  date.setMinutes(date.getMinutes() - minutesAgo);
  
  return date.toISOString();
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br'];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomItem(domains)}`;
}

function generatePhone(): string {
  const ddd = randomInt(11, 99);
  const prefix = randomInt(90000, 99999);
  const suffix = randomInt(1000, 9999);
  return `(${ddd}) ${prefix}-${suffix}`;
}

function selectWeightedStatus(): string {
  const random = Math.random();
  let cumulative = 0;
  
  for (const { status, weight } of statusDistribution) {
    cumulative += weight;
    if (random <= cumulative) {
      return status;
    }
  }
  
  return 'pending';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🌱 Iniciando geração de dados fictícios...');

    // Buscar primeira campanha disponível
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, segment_tag')
      .limit(1)
      .single();

    const campaignId = campaigns?.id;
    const segmentTag = campaigns?.segment_tag || 'futebol';

    if (!campaignId) {
      throw new Error('Nenhuma campanha encontrada. Crie ao menos uma campanha primeiro.');
    }

    console.log(`📋 Usando campanha: ${campaignId}`);

    // Buscar primeiro modelo disponível
    const { data: models } = await supabase
      .from('shirt_models')
      .select('id')
      .limit(1)
      .single();

    const modelId = models?.id;

    // 1. GERAR LEADS
    console.log('👥 Gerando 60 leads...');
    const leadsData = [];
    for (let i = 0; i < 60; i++) {
      const firstName = randomItem(firstNames);
      const lastName = randomItem(lastNames);
      const sessionId = `session_${Date.now()}_${i}`;
      
      leadsData.push({
        session_id: sessionId,
        name: `${firstName} ${lastName}`,
        email: generateEmail(firstName, lastName),
        phone: generatePhone(),
        quantity: randomItem(['10-30', '30-50', '50-100', '100+']),
        campaign_id: campaignId,
        utm_source: randomItem(utmSources),
        utm_medium: randomItem(utmMediums),
        utm_campaign: randomItem(utmCampaigns),
        completed: Math.random() > 0.3,
        current_step: randomInt(0, 5),
        created_at: randomDateInLast30Days(),
        customization_summary: {
          primaryColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
          secondaryColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        },
      });
    }

    const { data: insertedLeads, error: leadsError } = await supabase
      .from('leads')
      .insert(leadsData)
      .select('id, session_id, name, created_at');

    if (leadsError) throw leadsError;
    console.log(`✅ ${insertedLeads?.length} leads criadas`);

    // 2. GERAR ORDERS
    console.log('📦 Gerando 50 orders...');
    const ordersData = insertedLeads?.slice(0, 50).map((lead) => ({
      session_id: lead.session_id,
      customer_name: lead.name,
      customer_email: generateEmail('test', 'user'),
      customer_phone: generatePhone(),
      campaign_id: campaignId,
      model_id: modelId,
      quantity: randomInt(10, 100),
      customization_data: {
        primaryColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        secondaryColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        logoPosition: randomItem(['center', 'left', 'right']),
      },
      created_at: lead.created_at,
    }));

    const { data: insertedOrders, error: ordersError } = await supabase
      .from('orders')
      .insert(ordersData)
      .select('id, session_id, created_at');

    if (ordersError) throw ordersError;
    console.log(`✅ ${insertedOrders?.length} orders criados`);

    // Atualizar leads com order_id
    for (const order of insertedOrders || []) {
      const lead = insertedLeads?.find(l => l.session_id === order.session_id);
      if (lead) {
        await supabase
          .from('leads')
          .update({ order_id: order.id })
          .eq('id', lead.id);
      }
    }

    // 3. GERAR DESIGN_TASKS
    console.log('🎨 Gerando 50 design tasks...');
    const tasksData = insertedOrders?.map((order) => {
      const lead = insertedLeads?.find(l => l.session_id === order.session_id);
      const status = selectWeightedStatus();
      const createdAt = new Date(order.created_at);
      
      return {
        order_id: order.id,
        lead_id: lead?.id,
        campaign_id: campaignId,
        status,
        priority: Math.random() > 0.85 ? 'urgent' : 'normal',
        current_version: status === 'completed' ? randomInt(1, 3) : 0,
        created_at: createdAt.toISOString(),
        status_changed_at: createdAt.toISOString(),
      };
    });

    const { data: insertedTasks, error: tasksError } = await supabase
      .from('design_tasks')
      .insert(tasksData)
      .select('id, status, created_at');

    if (tasksError) throw tasksError;
    console.log(`✅ ${insertedTasks?.length} design tasks criadas`);

    // 4. GERAR FUNNEL_EVENTS
    console.log('🔄 Gerando 500 eventos de funil...');
    const funnelEvents = [];
    const eventTypes = ['visit', 'step_1', 'step_2', 'step_3', 'step_4', 'completed'];
    
    for (const lead of insertedLeads || []) {
      const sessionId = lead.session_id;
      const baseTime = new Date(lead.created_at);
      
      // Cada lead gera uma sequência de eventos
      const numEvents = randomInt(2, 6);
      for (let i = 0; i < numEvents; i++) {
        const eventTime = new Date(baseTime);
        eventTime.setMinutes(eventTime.getMinutes() + i * randomInt(1, 5));
        
        funnelEvents.push({
          session_id: sessionId,
          campaign_id: campaignId,
          event_type: eventTypes[i],
          utm_source: randomItem(utmSources),
          utm_medium: randomItem(utmMediums),
          utm_campaign: randomItem(utmCampaigns),
          created_at: eventTime.toISOString(),
        });
      }
    }

    const { error: eventsError } = await supabase
      .from('funnel_events')
      .insert(funnelEvents.slice(0, 500));

    if (eventsError) throw eventsError;
    console.log(`✅ ${Math.min(funnelEvents.length, 500)} eventos de funil criados`);

    // 5. GERAR DESIGN_TASK_HISTORY
    console.log('📜 Gerando 100 históricos de movimentação...');
    const historyData = [];
    const statusSequences = [
      ['pending', 'in_progress'],
      ['in_progress', 'awaiting_approval'],
      ['awaiting_approval', 'approved'],
      ['awaiting_approval', 'changes_requested'],
      ['changes_requested', 'in_progress'],
      ['approved', 'completed'],
    ];

    for (const task of insertedTasks?.slice(0, 50) || []) {
      const sequence = randomItem(statusSequences);
      const baseTime = new Date(task.created_at);
      
      for (let i = 0; i < sequence.length; i++) {
        const actionTime = new Date(baseTime);
        actionTime.setHours(actionTime.getHours() + (i + 1) * randomInt(1, 12));
        
        historyData.push({
          task_id: task.id,
          action: 'status_changed',
          old_status: i === 0 ? 'pending' : sequence[i - 1],
          new_status: sequence[i],
          notes: `Movido automaticamente para ${sequence[i]}`,
          created_at: actionTime.toISOString(),
        });
      }
    }

    const { error: historyError } = await supabase
      .from('design_task_history')
      .insert(historyData.slice(0, 100));

    if (historyError) throw historyError;
    console.log(`✅ ${Math.min(historyData.length, 100)} históricos criados`);

    console.log('🎉 Dados fictícios gerados com sucesso!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Dados fictícios gerados com sucesso',
        summary: {
          leads: insertedLeads?.length || 0,
          orders: insertedOrders?.length || 0,
          tasks: insertedTasks?.length || 0,
          events: Math.min(funnelEvents.length, 500),
          history: Math.min(historyData.length, 100),
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Erro ao gerar dados:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar dados',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
