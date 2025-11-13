import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { RealtimeMetrics } from "@/components/dashboard/RealtimeMetrics";
import { CrossAnalysisTable } from "@/components/dashboard/CrossAnalysisTable";
import { SankeyFlow } from "@/components/dashboard/SankeyFlow";
import { Button } from "@/components/ui/button";
import { Download, FileText, Mail, Share2 } from "lucide-react";
import { subDays } from "date-fns";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CrossData {
  utm_source: string;
  utm_medium: string;
  segment_name: string;
  total_leads: number;
  total_orders: number;
  conversion_rate: number;
}

interface DailyData {
  date: string;
  total_leads: number;
  total_orders: number;
  conversion_rate: number;
}

interface FlowData {
  source: string;
  target: string;
  value: number;
}

interface MetricCard {
  title: string;
  value: string | number;
  subtitle: string;
}

export default function AdvancedDashboard() {
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [crossData, setCrossData] = useState<CrossData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [flowData, setFlowData] = useState<FlowData[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch cross-analysis data (UTM x Segment)
      const { data: leadsData } = await supabase
        .from("leads")
        .select(`
          utm_source,
          utm_medium,
          order_id,
          campaign_id,
          campaigns(segment_id, segments(name))
        `)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const grouped = (leadsData || []).reduce((acc: any, lead) => {
        const key = `${lead.utm_source || "unknown"}_${lead.utm_medium || "unknown"}_${
          (lead.campaigns as any)?.segments?.name || "Sem segmento"
        }`;
        if (!acc[key]) {
          acc[key] = {
            utm_source: lead.utm_source || "unknown",
            utm_medium: lead.utm_medium || "unknown",
            segment_name: (lead.campaigns as any)?.segments?.name || "Sem segmento",
            total_leads: 0,
            total_orders: 0,
            conversion_rate: 0,
          };
        }
        acc[key].total_leads++;
        if (lead.order_id) acc[key].total_orders++;
        return acc;
      }, {});

      const crossDataArray = Object.values(grouped).map((item: any) => ({
        ...item,
        conversion_rate: item.total_leads > 0 ? (item.total_orders / item.total_leads) * 100 : 0,
      }));

      setCrossData(crossDataArray);

      // Fetch daily evolution data - aggregate by date
      const { data: allLeadsForDaily } = await supabase
        .from("leads")
        .select("created_at, order_id")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const dailyGrouped = (allLeadsForDaily || []).reduce((acc: any, lead) => {
        const date = lead.created_at.split("T")[0];
        if (!acc[date]) {
          acc[date] = { date, total_leads: 0, total_orders: 0, conversion_rate: 0 };
        }
        acc[date].total_leads++;
        if (lead.order_id) acc[date].total_orders++;
        return acc;
      }, {});

      const dailyDataArray = Object.values(dailyGrouped)
        .map((item: any) => ({
          ...item,
          conversion_rate: item.total_leads > 0 ? (item.total_orders / item.total_leads) * 100 : 0,
        }))
        .sort((a: any, b: any) => a.date.localeCompare(b.date));

      setDailyData(dailyDataArray);

      // Fetch flow data for Sankey
      const { data: leadsForFlow } = await supabase
        .from("leads")
        .select(`
          utm_source,
          order_id,
          campaign_id,
          campaigns(segment_id, segments(name))
        `)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .not("utm_source", "is", null)
        .not("campaign_id", "is", null);

      const flowGrouped = (leadsForFlow || []).reduce((acc: any, lead) => {
        const source = lead.utm_source || "unknown";
        const target = (lead.campaigns as any)?.segments?.name || "Sem segmento";
        const key = `${source}_${target}`;
        
        if (!acc[key]) {
          acc[key] = { source, target, value: 0 };
        }
        if (lead.order_id) acc[key].value++;
        return acc;
      }, {});

      setFlowData(Object.values(flowGrouped));

      // Calculate summary metrics
      const totalLeads = crossData.reduce((sum, item) => sum + item.total_leads, 0);
      const totalOrders = crossData.reduce((sum, item) => sum + item.total_orders, 0);
      const overallConversion = totalLeads > 0 ? (totalOrders / totalLeads) * 100 : 0;

      // Best campaign
      const bestCampaign = crossData.reduce(
        (best, item) =>
          item.conversion_rate > (best?.conversion_rate || 0) ? item : best,
        crossData[0]
      );

      setMetrics([
        {
          title: "Total de Leads",
          value: totalLeads,
          subtitle: "no período selecionado",
        },
        {
          title: "Total de Conversões",
          value: totalOrders,
          subtitle: `${overallConversion.toFixed(1)}% taxa de conversão`,
        },
        {
          title: "Melhor Combinação",
          value: bestCampaign
            ? `${bestCampaign.utm_source} → ${bestCampaign.segment_name}`
            : "-",
          subtitle: bestCampaign
            ? `${bestCampaign.conversion_rate.toFixed(1)}% conversão`
            : "-",
        },
      ]);
    } catch (error) {
      console.error("Error in fetchData:", error);
      toast.error("Erro ao carregar dados da dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const handleDateChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleExport = () => {
    toast.success("Funcionalidade de exportação em desenvolvimento");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Avançada</h1>
          <p className="text-muted-foreground">
            Análise de cruzamentos e métricas em tempo real
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Mail className="mr-2 h-4 w-4" />
            Agendar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Share2 className="mr-2 h-4 w-4" />
            Compartilhar
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Período</CardTitle>
        </CardHeader>
        <CardContent>
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onDateChange={handleDateChange}
          />
        </CardContent>
      </Card>

      {/* Realtime Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">⚡ Métricas em Tempo Real</h2>
        <RealtimeMetrics />
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((metric, idx) => (
          <Card key={idx}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily Evolution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Diária</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">Carregando dados...</p>
            </div>
          ) : dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="total_leads"
                  stroke="hsl(var(--primary))"
                  name="Leads"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="total_orders"
                  stroke="hsl(var(--chart-2))"
                  name="Conversões"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="conversion_rate"
                  stroke="hsl(var(--chart-3))"
                  name="Taxa %"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">Nenhum dado disponível para o período</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sankey Flow */}
      <SankeyFlow data={flowData} />

      {/* Cross Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cruzamento: UTM × Segmento × Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Carregando dados...
            </div>
          ) : (
            <CrossAnalysisTable data={crossData} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
