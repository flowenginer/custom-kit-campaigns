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

    console.log('[Database Export] Starting full database export...');

    const exportData: Record<string, any> = {
      exported_at: new Date().toISOString(),
      tables: {}
    };

    // Lista de todas as tabelas para exportar
    const tables = [
      'ab_test_events',
      'ab_tests',
      'campaign_themes',
      'campaign_visual_overrides',
      'campaigns',
      'change_requests',
      'design_task_comments',
      'design_task_history',
      'design_tasks',
      'funnel_events',
      'global_settings',
      'leads',
      'notifications',
      'orders',
      'pending_urgent_requests',
      'profiles',
      'role_kanban_defaults',
      'role_menu_defaults',
      'segments',
      'shirt_models',
      'tags',
      'urgent_reasons',
      'user_roles',
      'webhook_configs',
      'webhook_logs',
      'workflow_templates'
    ];

    // Exportar cada tabela
    for (const table of tables) {
      console.log(`[Database Export] Exporting table: ${table}`);
      
      const { data, error, count } = await supabase
        .from(table as any)
        .select('*', { count: 'exact' });

      if (error) {
        console.error(`[Database Export] Error exporting ${table}:`, error);
        exportData.tables[table] = {
          error: error.message,
          data: []
        };
      } else {
        exportData.tables[table] = {
          count: count || 0,
          data: data || []
        };
        console.log(`[Database Export] Exported ${count} rows from ${table}`);
      }
    }

    // Calcular totais
    const totalRecords = Object.values(exportData.tables).reduce(
      (sum: number, table: any) => sum + (table.count || 0),
      0
    );

    exportData.summary = {
      total_tables: tables.length,
      total_records: totalRecords,
      tables_exported: Object.keys(exportData.tables).length
    };

    console.log('[Database Export] Export completed:', exportData.summary);

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="database-export-${Date.now()}.json"`
      }
    });

  } catch (error) {
    console.error('[Database Export] Fatal error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
