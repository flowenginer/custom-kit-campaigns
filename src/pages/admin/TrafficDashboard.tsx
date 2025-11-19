import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Target, TrendingUp, Download, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FunnelStage } from "@/components/dashboard/FunnelStage";
import { TrafficInsights } from "@/components/dashboard/TrafficInsights";
import { SankeyFlow } from "@/components/dashboard/SankeyFlow";
import { subDays } from "date-fns";
import { Input } from "@/components/ui/input";

interface Campaign {
  id: string;
  name: string;
}

interface UtmBreakdown {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  count: number;
}

interface TrafficFunnelData {
  campaignId: string;
  campaignName: string;
  totalVisits: number;
  visitsByUtm: UtmBreakdown[];
  totalLeads: number;
  leadsByUtm: UtmBreakdown[];
  totalConversions: number;
  conversionsByUtm: UtmBreakdown[];
  leadConversionRate: number;
  orderConversionRate: number;
}

interface TrafficMetrics {
  totalVisitors: number;
  totalLeads: number;
  totalConversions: number;
  conversionRate: number;
  leadConversionRate: number;
  previousPeriodVisitors?: number;
  previousPeriodLeads?: number;
  previousPeriodConversions?: number;
}

interface DetailedTrafficRow {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  visitors: number;
  leads: number;
  conversions: number;
  leadRate: number;
  conversionRate: number;
}

interface TrafficInsight {
  type: "success" | "warning" | "danger" | "info";
  title: string;
  description: string;
  recommendation?: string;
}

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
  const [funnelData, setFunnelData] = useState<TrafficFunnelData[]>([]);
  const [detailedTraffic, setDetailedTraffic] = useState<DetailedTrafficRow[]>([]);
  const [insights, setInsights] = useState<TrafficInsight[]>([]);
  const [sankeyData, setSankeyData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [searchFilter, setSearchFilter] = useState("");

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
      // Query para visitas com UTMs
      let visitQuery = supabase
        .from("funnel_events")
        .select("session_id, utm_source, utm_medium, utm_campaign, campaign_id, campaigns(name)")
        .eq("event_type", "visit")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (selectedCampaign !== "all") {
        visitQuery = visitQuery.eq("campaign_id", selectedCampaign);
      }

      const { data: visitData } = await visitQuery;

      // Query para leads com UTMs (via join com funnel_events)
      let leadsQuery = supabase
        .from("leads")
        .select("id, session_id, order_id, campaign_id, campaigns(name)")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (selectedCampaign !== "all") {
        leadsQuery = leadsQuery.eq("campaign_id", selectedCampaign);
      }

      const { data: leadsData } = await leadsQuery;

      if (!visitData || !leadsData) {
        setIsLoading(false);
        return;
      }

      // Criar mapa de session_id -> UTMs
      const sessionUtmMap = new Map();
      visitData.forEach((visit: any) => {
        if (!sessionUtmMap.has(visit.session_id)) {
          sessionUtmMap.set(visit.session_id, {
            utm_source: visit.utm_source || "direto",
            utm_medium: visit.utm_medium || "none",
            utm_campaign: visit.utm_campaign || "none",
            campaign_id: visit.campaign_id,
            campaign_name: visit.campaigns?.name || "Sem campanha",
          });
        }
      });

      // Calcular métricas gerais
      const uniqueVisitors = new Set(visitData.map((v: any) => v.session_id)).size;
      const totalLeads = leadsData.length;
      const totalConversions = leadsData.filter((l: any) => l.order_id).length;

      setMetrics({
        totalVisitors: uniqueVisitors,
        totalLeads,
        totalConversions,
        conversionRate: uniqueVisitors > 0 ? (totalConversions / uniqueVisitors) * 100 : 0,
        leadConversionRate: uniqueVisitors > 0 ? (totalLeads / uniqueVisitors) * 100 : 0,
      });

      // Processar funil por campanha com UTMs
      const campaignFunnels = new Map<string, TrafficFunnelData>();
      
      visitData.forEach((visit: any) => {
        const campaignId = visit.campaign_id || "no-campaign";
        const campaignName = visit.campaigns?.name || "Sem campanha";
        
        if (!campaignFunnels.has(campaignId)) {
          campaignFunnels.set(campaignId, {
            campaignId,
            campaignName,
            totalVisits: 0,
            visitsByUtm: [],
            totalLeads: 0,
            leadsByUtm: [],
            totalConversions: 0,
            conversionsByUtm: [],
            leadConversionRate: 0,
            orderConversionRate: 0,
          });
        }
      });

      // Count visits by UTM
      const visitUtmCounts = new Map<string, Map<string, number>>();
      visitData.forEach((visit: any) => {
        const campaignId = visit.campaign_id || "no-campaign";
        const utmKey = `${visit.utm_source || "direto"}|${visit.utm_medium || "none"}|${visit.utm_campaign || "none"}`;
        
        if (!visitUtmCounts.has(campaignId)) {
          visitUtmCounts.set(campaignId, new Map());
        }
        const campaignMap = visitUtmCounts.get(campaignId)!;
        campaignMap.set(utmKey, (campaignMap.get(utmKey) || 0) + 1);
      });

      // Count leads and conversions by UTM
      const leadUtmCounts = new Map<string, Map<string, number>>();
      const conversionUtmCounts = new Map<string, Map<string, number>>();
      
      leadsData.forEach((lead: any) => {
        const utmInfo = sessionUtmMap.get(lead.session_id);
        if (!utmInfo) return;
        
        const campaignId = lead.campaign_id || "no-campaign";
        const utmKey = `${utmInfo.utm_source}|${utmInfo.utm_medium}|${utmInfo.utm_campaign}`;
        
        // Leads
        if (!leadUtmCounts.has(campaignId)) {
          leadUtmCounts.set(campaignId, new Map());
        }
        const leadMap = leadUtmCounts.get(campaignId)!;
        leadMap.set(utmKey, (leadMap.get(utmKey) || 0) + 1);
        
        // Conversions
        if (lead.order_id) {
          if (!conversionUtmCounts.has(campaignId)) {
            conversionUtmCounts.set(campaignId, new Map());
          }
          const convMap = conversionUtmCounts.get(campaignId)!;
          convMap.set(utmKey, (convMap.get(utmKey) || 0) + 1);
        }
      });

      // Build funnel data
      campaignFunnels.forEach((funnel, campaignId) => {
        // Visits
        const visitMap = visitUtmCounts.get(campaignId);
        if (visitMap) {
          visitMap.forEach((count, utmKey) => {
            const [source, medium, campaign] = utmKey.split("|");
            funnel.visitsByUtm.push({ utm_source: source, utm_medium: medium, utm_campaign: campaign, count });
            funnel.totalVisits += count;
          });
        }

        // Leads
        const leadMap = leadUtmCounts.get(campaignId);
        if (leadMap) {
          leadMap.forEach((count, utmKey) => {
            const [source, medium, campaign] = utmKey.split("|");
            funnel.leadsByUtm.push({ utm_source: source, utm_medium: medium, utm_campaign: campaign, count });
            funnel.totalLeads += count;
          });
        }

        // Conversions
        const convMap = conversionUtmCounts.get(campaignId);
        if (convMap) {
          convMap.forEach((count, utmKey) => {
            const [source, medium, campaign] = utmKey.split("|");
            funnel.conversionsByUtm.push({ utm_source: source, utm_medium: medium, utm_campaign: campaign, count });
            funnel.totalConversions += count;
          });
        }

        // Calculate rates
        funnel.leadConversionRate = funnel.totalVisits > 0 ? (funnel.totalLeads / funnel.totalVisits) * 100 : 0;
        funnel.orderConversionRate = funnel.totalLeads > 0 ? (funnel.totalConversions / funnel.totalLeads) * 100 : 0;
      });

      setFunnelData(Array.from(campaignFunnels.values()));

      // Build detailed traffic table
      const detailedMap = new Map<string, DetailedTrafficRow>();
      
      visitData.forEach((visit: any) => {
        const key = `${visit.utm_source || "direto"}|${visit.utm_medium || "none"}|${visit.utm_campaign || "none"}`;
        if (!detailedMap.has(key)) {
          detailedMap.set(key, {
            utm_source: visit.utm_source || "direto",
            utm_medium: visit.utm_medium || "none",
            utm_campaign: visit.utm_campaign || "none",
            visitors: 0,
            leads: 0,
            conversions: 0,
            leadRate: 0,
            conversionRate: 0,
          });
        }
        detailedMap.get(key)!.visitors++;
      });

      leadsData.forEach((lead: any) => {
        const utmInfo = sessionUtmMap.get(lead.session_id);
        if (!utmInfo) return;
        
        const key = `${utmInfo.utm_source}|${utmInfo.utm_medium}|${utmInfo.utm_campaign}`;
        const row = detailedMap.get(key);
        if (row) {
          row.leads++;
          if (lead.order_id) row.conversions++;
        }
      });

      detailedMap.forEach((row) => {
        row.leadRate = row.visitors > 0 ? (row.leads / row.visitors) * 100 : 0;
        row.conversionRate = row.visitors > 0 ? (row.conversions / row.visitors) * 100 : 0;
      });

      const detailedRows = Array.from(detailedMap.values()).sort((a, b) => b.visitors - a.visitors);
      setDetailedTraffic(detailedRows);

      // Generate insights
      generateInsights(detailedRows, metrics);

      // Build Sankey data
      const sankeyLinks: any[] = [];
      detailedRows.slice(0, 5).forEach((row) => {
        const sourceLabel = `${row.utm_source}/${row.utm_medium}`;
        sankeyLinks.push({
          source: sourceLabel,
          target: "Leads",
          value: row.leads,
        });
      });
      setSankeyData(sankeyLinks);

    } catch (error) {
      console.error("Error loading traffic data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateInsights = (detailedRows: DetailedTrafficRow[], metrics: TrafficMetrics) => {
    const newInsights: TrafficInsight[] = [];

    // Best converter
    const bestConverter = detailedRows.reduce((best, row) => 
      row.conversionRate > best.conversionRate ? row : best
    , detailedRows[0]);

    if (bestConverter && bestConverter.conversionRate > 5) {
      newInsights.push({
        type: "success",
        title: "🚀 Melhor Fonte de Conversão",
        description: `${bestConverter.utm_source}/${bestConverter.utm_medium} está convertendo ${bestConverter.conversionRate.toFixed(1)}% dos visitantes, acima da média de ${metrics.conversionRate.toFixed(1)}%.`,
        recommendation: "Considere aumentar o investimento nesta fonte!",
      });
    }

    // High traffic, low conversion
    const poorPerformers = detailedRows.filter(row => row.visitors > 50 && row.conversionRate < 2);
    if (poorPerformers.length > 0) {
      const worst = poorPerformers[0];
      newInsights.push({
        type: "warning",
        title: "⚠️ Alto Tráfego, Baixa Conversão",
        description: `${worst.utm_source}/${worst.utm_medium} traz ${worst.visitors} visitas mas só ${worst.conversions} conversões (${worst.conversionRate.toFixed(1)}%).`,
        recommendation: "Analise a qualidade do tráfego e otimize a landing page.",
      });
    }

    // Lead conversion opportunity
    const highLeadLowOrder = detailedRows.filter(row => row.leadRate > 10 && row.conversions === 0);
    if (highLeadLowOrder.length > 0) {
      newInsights.push({
        type: "info",
        title: "💡 Oportunidade de Conversão",
        description: `Você tem ${highLeadLowOrder.reduce((sum, r) => sum + r.leads, 0)} leads que não converteram em pedidos.`,
        recommendation: "Implemente estratégias de follow-up e remarketing.",
      });
    }

    setInsights(newInsights);
  };

  const exportToCSV = () => {
    const headers = ["UTM Source", "UTM Medium", "UTM Campaign", "Visitantes", "Leads", "Conversões", "Taxa Lead %", "Taxa Conversão %"];
    const rows = detailedTraffic.map(row => [
      row.utm_source,
      row.utm_medium,
      row.utm_campaign,
      row.visitors,
      row.leads,
      row.conversions,
      row.leadRate.toFixed(2),
      row.conversionRate.toFixed(2),
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `traffic-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const filteredTraffic = detailedTraffic.filter(row => 
    row.utm_source.toLowerCase().includes(searchFilter.toLowerCase()) ||
    row.utm_medium.toLowerCase().includes(searchFilter.toLowerCase()) ||
    row.utm_campaign.toLowerCase().includes(searchFilter.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">📊 Dashboard de Tráfego</h1>
        <p className="text-muted-foreground">Análise completa de visitantes, leads e conversões com UTMs</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma campanha" />
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
            </div>
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onDateChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-chart-blue/10 to-chart-blue/5 border-chart-blue/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Visitantes</CardTitle>
            <Users className="h-5 w-5 text-chart-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{metrics.totalVisitors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Sessões únicas no período</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-chart-purple/10 to-chart-purple/5 border-chart-purple/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads Gerados</CardTitle>
            <Target className="h-5 w-5 text-chart-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{metrics.totalLeads.toLocaleString()}</div>
            <Badge variant="secondary" className="mt-2">
              {metrics.leadConversionRate.toFixed(1)}% dos visitantes
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-chart-green/10 to-chart-green/5 border-chart-green/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversões</CardTitle>
            <TrendingUp className="h-5 w-5 text-chart-green" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{metrics.totalConversions.toLocaleString()}</div>
            <Badge variant="secondary" className="mt-2">
              {metrics.conversionRate.toFixed(1)}% dos visitantes
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-chart-orange/10 to-chart-orange/5 border-chart-orange/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Fechamento</CardTitle>
            <Target className="h-5 w-5 text-chart-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {metrics.totalLeads > 0 ? ((metrics.totalConversions / metrics.totalLeads) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Leads → Pedidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {insights.length > 0 && <TrafficInsights insights={insights} />}

      {/* Sankey Flow */}
      {sankeyData.length > 0 && <SankeyFlow data={sankeyData} />}

      {/* Funnel by Campaign */}
      <Card>
        <CardHeader>
          <CardTitle>🎯 Funil Comparativo por Campanha</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {funnelData.map((funnel) => (
              <AccordionItem key={funnel.campaignId} value={funnel.campaignId}>
                <AccordionTrigger>
                  <div className="flex items-center gap-4 w-full">
                    <span className="font-semibold text-foreground">{funnel.campaignName}</span>
                    <div className="flex gap-2">
                      <Badge variant="outline">{funnel.totalVisits} visitas</Badge>
                      <Badge variant="secondary">{funnel.totalLeads} leads</Badge>
                      <Badge>{funnel.totalConversions} conversões</Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 md:grid-cols-3 mt-4">
                    <FunnelStage
                      title="Visitas"
                      total={funnel.totalVisits}
                      data={funnel.visitsByUtm}
                      color="blue"
                    />
                    <FunnelStage
                      title="Leads"
                      total={funnel.totalLeads}
                      data={funnel.leadsByUtm}
                      color="purple"
                      parentTotal={funnel.totalVisits}
                    />
                    <FunnelStage
                      title="Conversões"
                      total={funnel.totalConversions}
                      data={funnel.conversionsByUtm}
                      color="green"
                      parentTotal={funnel.totalLeads}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>📋 Análise Detalhada por UTM</CardTitle>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por source, medium ou campaign..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UTM Source</TableHead>
                  <TableHead>UTM Medium</TableHead>
                  <TableHead>UTM Campaign</TableHead>
                  <TableHead className="text-right">Visitantes</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Conversões</TableHead>
                  <TableHead className="text-right">Taxa Lead</TableHead>
                  <TableHead className="text-right">Taxa Conversão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTraffic.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.utm_source}</TableCell>
                    <TableCell>{row.utm_medium}</TableCell>
                    <TableCell>{row.utm_campaign}</TableCell>
                    <TableCell className="text-right">{row.visitors}</TableCell>
                    <TableCell className="text-right">{row.leads}</TableCell>
                    <TableCell className="text-right">{row.conversions}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={row.leadRate > 10 ? "default" : "secondary"}>
                        {row.leadRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={row.conversionRate > 5 ? "default" : "secondary"}>
                        {row.conversionRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrafficDashboard;
