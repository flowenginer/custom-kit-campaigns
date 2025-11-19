import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Loader2, TrendingUp, Users, Target, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { subDays } from "date-fns";

interface Campaign {
  id: string;
  name: string;
}

interface TrafficMetrics {
  totalVisitors: number;
  totalLeads: number;
  totalConversions: number;
  conversionRate: number;
  leadConversionRate: number;
}

interface TrafficBySource {
  source: string;
  visitors: number;
  leads: number;
  conversions: number;
  conversionRate: number;
}

interface TrafficByCampaign {
  campaignId: string;
  campaignName: string;
  visitors: number;
  leads: number;
  conversions: number;
}

const CHART_COLORS = [
  "hsl(var(--chart-purple))",
  "hsl(var(--chart-green))",
  "hsl(var(--chart-orange))",
  "hsl(var(--chart-blue))",
  "hsl(var(--chart-pink))",
  "hsl(var(--chart-teal))",
  "hsl(var(--chart-indigo))",
  "hsl(var(--chart-cyan))",
  "hsl(var(--chart-amber))",
  "hsl(var(--chart-red))",
];

const TrafficDashboard = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [metrics, setMetrics] = useState<TrafficMetrics>({
    totalVisitors: 0,
    totalLeads: 0,
    totalConversions: 0,
    conversionRate: 0,
    leadConversionRate: 0,
  });
  const [trafficBySource, setTrafficBySource] = useState<TrafficBySource[]>([]);
  const [trafficByCampaign, setTrafficByCampaign] = useState<TrafficByCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    loadTrafficData();
  }, [selectedCampaign, startDate, endDate]);

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("id, name")
      .order("created_at", { ascending: false });
    
    if (data) setCampaigns(data);
  };

  const loadTrafficData = async () => {
    setIsLoading(true);
    try {
      // Query base para funnel_events
      let visitQuery = supabase
        .from("funnel_events")
        .select("session_id, utm_source, campaign_id, campaigns(name)")
        .eq("event_type", "visit");

      if (selectedCampaign !== "all") {
        visitQuery = visitQuery.eq("campaign_id", selectedCampaign);
      }

      visitQuery = visitQuery
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const { data: visitData } = await visitQuery;

      // Query para leads
      let leadsQuery = supabase
        .from("leads")
        .select("session_id, order_id, campaign_id");

      if (selectedCampaign !== "all") {
        leadsQuery = leadsQuery.eq("campaign_id", selectedCampaign);
      }

      leadsQuery = leadsQuery
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const { data: leadsData } = await leadsQuery;

      if (!visitData || !leadsData) return;

      // Calcular visitantes únicos
      const uniqueVisitors = new Set(visitData.map(v => v.session_id));
      const totalVisitors = uniqueVisitors.size;
      const totalLeads = leadsData.length;
      const totalConversions = leadsData.filter(l => l.order_id).length;

      setMetrics({
        totalVisitors,
        totalLeads,
        totalConversions,
        conversionRate: totalVisitors > 0 ? (totalConversions / totalVisitors) * 100 : 0,
        leadConversionRate: totalVisitors > 0 ? (totalLeads / totalVisitors) * 100 : 0,
      });

      // Agrupar por UTM source
      const sourceMap = new Map<string, { visitors: Set<string>; leads: number; conversions: number }>();
      
      visitData.forEach(visit => {
        const source = visit.utm_source || "Direto";
        if (!sourceMap.has(source)) {
          sourceMap.set(source, { visitors: new Set(), leads: 0, conversions: 0 });
        }
        sourceMap.get(source)!.visitors.add(visit.session_id);
      });

      leadsData.forEach(lead => {
        const visit = visitData.find(v => v.session_id === lead.session_id);
        const source = visit?.utm_source || "Direto";
        const sourceData = sourceMap.get(source);
        if (sourceData) {
          sourceData.leads++;
          if (lead.order_id) sourceData.conversions++;
        }
      });

      const sourceArray = Array.from(sourceMap.entries())
        .map(([source, data]) => ({
          source,
          visitors: data.visitors.size,
          leads: data.leads,
          conversions: data.conversions,
          conversionRate: data.visitors.size > 0 ? (data.conversions / data.visitors.size) * 100 : 0,
        }))
        .sort((a, b) => b.visitors - a.visitors);

      setTrafficBySource(sourceArray);

      // Agrupar por campanha
      const campaignMap = new Map<string, { name: string; visitors: Set<string>; leads: number; conversions: number }>();
      
      visitData.forEach(visit => {
        const campaignId = visit.campaign_id || "unknown";
        const campaignName = (visit.campaigns as any)?.name || "Sem campanha";
        if (!campaignMap.has(campaignId)) {
          campaignMap.set(campaignId, { name: campaignName, visitors: new Set(), leads: 0, conversions: 0 });
        }
        campaignMap.get(campaignId)!.visitors.add(visit.session_id);
      });

      leadsData.forEach(lead => {
        const campaignId = lead.campaign_id || "unknown";
        const campaignData = campaignMap.get(campaignId);
        if (campaignData) {
          campaignData.leads++;
          if (lead.order_id) campaignData.conversions++;
        }
      });

      const campaignArray = Array.from(campaignMap.entries())
        .map(([campaignId, data]) => ({
          campaignId,
          campaignName: data.name,
          visitors: data.visitors.size,
          leads: data.leads,
          conversions: data.conversions,
        }))
        .sort((a, b) => b.visitors - a.visitors);

      setTrafficByCampaign(campaignArray);

    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && campaigns.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Análise de Tráfego</h1>
        <p className="text-muted-foreground">
          Rastreamento completo de visitantes, leads e conversões
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Selecionar Campanha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Campanhas</SelectItem>
            {campaigns.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangeFilter 
          startDate={startDate} 
          endDate={endDate} 
          onDateChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }} 
        />
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-chart-purple" />
              Visitantes Únicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{metrics.totalVisitors.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-chart-blue" />
              Leads Gerados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics.totalLeads.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.leadConversionRate.toFixed(1)}% dos visitantes
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-chart-green" />
              Conversões
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics.totalConversions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.conversionRate.toFixed(1)}% dos visitantes
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Taxa Lead</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-chart-blue">
                {metrics.leadConversionRate.toFixed(1)}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-chart-green">
                {metrics.conversionRate.toFixed(1)}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tráfego por Fonte */}
        <Card>
          <CardHeader>
            <CardTitle>Tráfego por Fonte (UTM Source)</CardTitle>
            <CardDescription>Visitantes únicos por origem</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : trafficBySource.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trafficBySource}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="source" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="visitors" fill={CHART_COLORS[0]} name="Visitantes" />
                  <Bar dataKey="leads" fill={CHART_COLORS[1]} name="Leads" />
                  <Bar dataKey="conversions" fill={CHART_COLORS[2]} name="Conversões" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tráfego por Campanha */}
        <Card>
          <CardHeader>
            <CardTitle>Tráfego por Campanha</CardTitle>
            <CardDescription>Performance de cada campanha</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : trafficByCampaign.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trafficByCampaign.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="campaignName" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="visitors" fill={CHART_COLORS[3]} name="Visitantes" />
                  <Bar dataKey="leads" fill={CHART_COLORS[4]} name="Leads" />
                  <Bar dataKey="conversions" fill={CHART_COLORS[5]} name="Conversões" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Fonte de Tráfego</CardTitle>
          <CardDescription>Métricas completas de cada origem</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[200px]" />
          ) : trafficBySource.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhum dado disponível
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Fonte (UTM Source)</th>
                    <th className="text-right py-3 px-4 font-medium">Visitantes</th>
                    <th className="text-right py-3 px-4 font-medium">Leads</th>
                    <th className="text-right py-3 px-4 font-medium">Conversões</th>
                    <th className="text-right py-3 px-4 font-medium">Taxa Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {trafficBySource.map((source, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <Badge variant="outline">{source.source}</Badge>
                      </td>
                      <td className="text-right py-3 px-4">{source.visitors.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">{source.leads.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">{source.conversions.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">
                        <span className={source.conversionRate >= 5 ? "text-chart-green font-medium" : ""}>
                          {source.conversionRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrafficDashboard;
