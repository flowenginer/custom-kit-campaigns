import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Loader2, TrendingUp, Users, Target, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
interface Campaign {
  id: string;
  name: string;
}
interface FunnelData {
  campaignId: string;
  campaignName: string;
  visits: number;
  step1: number;
  step2: number;
  step3: number;
  step4: number;
  step5: number;
  completed: number;
}
interface LeadsMetrics {
  total: number;
  converted: number;
  conversionRate: number;
  bySource: {
    source: string;
    count: number;
  }[];
}
interface UTMData {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  total: number;
  completed: number;
  conversionRate: number;
}
interface CampaignComparisonData {
  name: string;
  value: number;
  percentage: number;
}
const CHART_COLORS = ["hsl(var(--chart-purple))", "hsl(var(--chart-green))", "hsl(var(--chart-orange))", "hsl(var(--chart-blue))", "hsl(var(--chart-pink))", "hsl(var(--chart-teal))", "hsl(var(--chart-indigo))", "hsl(var(--chart-cyan))", "hsl(var(--chart-amber))", "hsl(var(--chart-red))"];
const Dashboard = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [leadsMetrics, setLeadsMetrics] = useState<LeadsMetrics>({
    total: 0,
    converted: 0,
    conversionRate: 0,
    bySource: []
  });
  const [utmData, setUtmData] = useState<UTMData[]>([]);
  const [selectedUtmSource, setSelectedUtmSource] = useState<string>("all");
  const [selectedUtmMedium, setSelectedUtmMedium] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    loadDashboardData();
  }, []);
  useEffect(() => {
    if (campaigns.length > 0 && selectedCampaigns.length === 0) {
      setSelectedCampaigns([campaigns[0].id]);
    }
  }, [campaigns]);
  const loadDashboardData = async () => {
    try {
      // Carregar campanhas
      const {
        data: campaignsData
      } = await supabase.from("campaigns").select("id, name").order("created_at", {
        ascending: false
      });
      if (campaignsData) {
        setCampaigns(campaignsData);

        // Carregar dados de funil para cada campanha
        const funnelPromises = campaignsData.map(async campaign => {
          const {
            data: events
          } = await supabase.from("funnel_events").select("event_type").eq("campaign_id", campaign.id);
          const counts = {
            visits: 0,
            step1: 0,
            step2: 0,
            step3: 0,
            step4: 0,
            step5: 0,
            completed: 0
          };
          events?.forEach(event => {
            if (event.event_type === "visit") counts.visits++;else if (event.event_type === "step_1") counts.step1++;else if (event.event_type === "step_2") counts.step2++;else if (event.event_type === "step_3") counts.step3++;else if (event.event_type === "step_4") counts.step4++;else if (event.event_type === "step_5") counts.step5++;else if (event.event_type === "completed") counts.completed++;
          });
          return {
            campaignId: campaign.id,
            campaignName: campaign.name,
            ...counts
          };
        });
        const funnelResults = await Promise.all(funnelPromises);
        setFunnelData(funnelResults);
      }

      // Carregar métricas de leads com UTMs
      const {
        data: leadsData
      } = await supabase.from("leads").select("completed, utm_source, utm_medium, utm_campaign, utm_term, utm_content, campaign_id");
      if (leadsData) {
        const total = leadsData.length;
        const converted = leadsData.filter(l => l.completed).length;
        const conversionRate = total > 0 ? converted / total * 100 : 0;

        // Agrupar por utm_source
        const sourceGroups = leadsData.reduce((acc: any, lead) => {
          const source = lead.utm_source || 'Direto';
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {});
        const bySource = Object.entries(sourceGroups).map(([source, count]) => ({
          source,
          count: count as number
        })).sort((a, b) => b.count - a.count);
        setLeadsMetrics({
          total,
          converted,
          conversionRate,
          bySource
        });

        // Processar dados de UTM
        const utmGroups = leadsData.reduce((acc: any, lead) => {
          const key = `${lead.utm_source || 'Direto'}|${lead.utm_medium || '-'}|${lead.utm_campaign || '-'}|${lead.utm_term || '-'}|${lead.utm_content || '-'}`;
          if (!acc[key]) {
            acc[key] = {
              source: lead.utm_source || 'Direto',
              medium: lead.utm_medium || '-',
              campaign: lead.utm_campaign || '-',
              term: lead.utm_term || '-',
              content: lead.utm_content || '-',
              total: 0,
              completed: 0
            };
          }
          acc[key].total++;
          if (lead.completed) acc[key].completed++;
          return acc;
        }, {});
        const utmArray: UTMData[] = Object.values(utmGroups).map((item: any) => ({
          ...item,
          conversionRate: item.total > 0 ? item.completed / item.total * 100 : 0
        }));
        setUtmData(utmArray.sort((a, b) => b.total - a.total));
      }
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Preparar dados para o gráfico de funil comparativo
  const getComparativeFunnelData = () => {
    const stages = ["Visitas", "Etapa 1", "Etapa 2", "Etapa 3", "Etapa 4", "Etapa 5", "Concluído"];
    return stages.map(stage => {
      const dataPoint: any = {
        stage
      };
      selectedCampaigns.forEach(campaignId => {
        const campaign = funnelData.find(c => c.campaignId === campaignId);
        if (campaign) {
          const stageKey = stage === "Visitas" ? "visits" : stage === "Concluído" ? "completed" : `step${stage.split(" ")[1]}` as keyof FunnelData;
          dataPoint[campaign.campaignName] = campaign[stageKey as keyof FunnelData];
        }
      });
      return dataPoint;
    });
  };

  // Preparar dados para o gráfico de pizza comparativo
  const getCampaignComparisonData = (): CampaignComparisonData[] => {
    const totalCompleted = funnelData.reduce((sum, c) => sum + c.completed, 0);
    return funnelData.filter(c => c.completed > 0).map(campaign => ({
      name: campaign.campaignName,
      value: campaign.completed,
      percentage: totalCompleted > 0 ? campaign.completed / totalCompleted * 100 : 0
    })).sort((a, b) => b.value - a.value);
  };

  // Filtrar dados de UTM
  const getFilteredUtmData = () => {
    return utmData.filter(item => {
      const sourceMatch = selectedUtmSource === "all" || item.source === selectedUtmSource;
      const mediumMatch = selectedUtmMedium === "all" || item.medium === selectedUtmMedium;
      return sourceMatch && mediumMatch;
    });
  };

  // Obter top sources para gráfico de barras
  const getTopUtmSources = () => {
    const filteredData = getFilteredUtmData();
    const sourceGroups = filteredData.reduce((acc: any, item) => {
      if (!acc[item.source]) {
        acc[item.source] = {
          source: item.source,
          leads: 0
        };
      }
      acc[item.source].leads += item.total;
      return acc;
    }, {});
    return Object.values(sourceGroups).sort((a: any, b: any) => b.leads - a.leads).slice(0, 10);
  };

  // Obter sources e mediums únicos para filtros
  const uniqueSources = ["all", ...Array.from(new Set(utmData.map(d => d.source)))];
  const uniqueMediums = ["all", ...Array.from(new Set(utmData.map(d => d.medium)))];
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  const comparativeFunnelData = getComparativeFunnelData();
  const campaignComparisonData = getCampaignComparisonData();
  const topUtmSources = getTopUtmSources();
  const filteredUtmData = getFilteredUtmData();
  return <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-chart-purple bg-clip-text text-transparent">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Visualize a performance de suas campanhas em tempo real
        </p>
      </div>

      {/* Seção 1: Métricas Cards com Visual Moderno */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-chart-blue/5 border-primary/20 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Leads
              </CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{leadsMetrics.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Todos os períodos</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-chart-green/10 to-success/5 border-chart-green/20 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Leads Convertidos
              </CardTitle>
              <Target className="h-5 w-5 text-chart-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-chart-green">{leadsMetrics.converted}</div>
            <p className="text-xs text-muted-foreground mt-1">Concluíram o funil</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-chart-orange/10 to-chart-amber/5 border-chart-orange/20 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa de Conversão
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-chart-orange" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-chart-orange">{leadsMetrics.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Taxa média geral</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-chart-pink/10 to-chart-purple/5 border-chart-pink/20 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Principais Fontes
              </CardTitle>
              <Activity className="h-5 w-5 text-chart-pink" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {leadsMetrics.bySource.slice(0, 2).map((item, idx) => <div key={item.source} className="flex justify-between text-sm">
                  <span className="truncate mr-2 font-medium" style={{
                color: CHART_COLORS[idx]
              }}>
                    {item.source}
                  </span>
                  <Badge variant="secondary" className="font-semibold">{item.count}</Badge>
                </div>)}
            </div>
          </CardContent>
        </Card>
      </div>

      {funnelData.length === 0 ? <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Nenhuma campanha com dados ainda. Crie uma campanha para começar!
            </p>
          </CardContent>
        </Card> : <>
          {/* Seção 2: Gráfico de Funil Interativo com Filtro de Campanhas */}
          <Card className="shadow-xl">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">Funil Comparativo de Campanhas</CardTitle>
                  <CardDescription>
                    Selecione campanhas para comparar o desempenho em cada etapa
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {campaigns.map((campaign, idx) => <Badge key={campaign.id} variant={selectedCampaigns.includes(campaign.id) ? "default" : "outline"} className="cursor-pointer transition-all hover:scale-105" style={selectedCampaigns.includes(campaign.id) ? {
                backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                borderColor: CHART_COLORS[idx % CHART_COLORS.length]
              } : {}} onClick={() => {
                setSelectedCampaigns(prev => prev.includes(campaign.id) ? prev.filter(id => id !== campaign.id) : [...prev, campaign.id]);
              }}>
                      {campaign.name}
                    </Badge>)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparativeFunnelData}>
                    <defs>
                      {selectedCampaigns.map((_, idx) => <linearGradient key={`gradient-${idx}`} id={`barGradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.9} />
                          <stop offset="100%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.6} />
                        </linearGradient>)}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="stage" tick={{
                  fill: 'hsl(var(--muted-foreground))'
                }} />
                    <YAxis tick={{
                  fill: 'hsl(var(--muted-foreground))'
                }} />
                    <Tooltip contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }} />
                    <Legend />
                    {selectedCampaigns.map((campaignId, idx) => {
                  const campaign = campaigns.find(c => c.id === campaignId);
                  return campaign ? <Bar key={campaignId} dataKey={campaign.name} fill={`url(#barGradient-${idx})`} radius={[8, 8, 0, 0]} style={{
                    filter: 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.15))'
                  }} /> : null;
                })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Seção 3: Gráfico de Pizza - Comparativo de Campanhas Ativas */}
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Distribuição de Leads Completos por Campanha</CardTitle>
              <CardDescription>
                Visualização em pizza do desempenho relativo de cada campanha
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="h-[400px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {campaignComparisonData.map((_, idx) => <linearGradient key={`pieGradient-${idx}`} id={`pieGradient-${idx}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={1} />
                            <stop offset="100%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.7} />
                          </linearGradient>)}
                      </defs>
                      <Pie data={campaignComparisonData} cx="50%" cy="50%" labelLine={false} label={({
                    name,
                    percentage
                  }) => `${name}: ${percentage.toFixed(1)}%`} outerRadius={140} innerRadius={70} fill="#8884d8" dataKey="value" paddingAngle={3} animationDuration={800} style={{
                    filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.2))'
                  }}>
                        {campaignComparisonData.map((_, index) => <Cell key={`cell-${index}`} fill={`url(#pieGradient-${index})`} />)}
                      </Pie>
                      <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col justify-center space-y-3">
                  <h3 className="font-semibold text-lg mb-2">Ranking de Campanhas</h3>
                  {campaignComparisonData.map((item, idx) => <div key={item.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-4 h-4 rounded-full" style={{
                  backgroundColor: CHART_COLORS[idx % CHART_COLORS.length]
                }} />
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.value} leads completos</p>
                      </div>
                      <Badge variant="secondary" style={{
                  backgroundColor: `${CHART_COLORS[idx % CHART_COLORS.length]}20`,
                  color: CHART_COLORS[idx % CHART_COLORS.length]
                }}>
                        {item.percentage.toFixed(1)}%
                      </Badge>
                    </div>)}
                </div>
              </div>
            </CardContent>
          </Card>
        </>}

      {/* Seção 4: Análise de UTMs */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Análise de UTMs e Fontes de Tráfego</CardTitle>
          <CardDescription>
            Explore de onde seus leads estão vindo e qual criativo está performando melhor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filtros de UTM */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Fonte (Source)</label>
              <Select value={selectedUtmSource} onValueChange={setSelectedUtmSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as fontes" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueSources.map(source => <SelectItem key={source} value={source}>
                      {source === "all" ? "Todas as fontes" : source}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Meio (Medium)</label>
              <Select value={selectedUtmMedium} onValueChange={setSelectedUtmMedium}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os meios" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueMediums.map(medium => <SelectItem key={medium} value={medium}>
                      {medium === "all" ? "Todos os meios" : medium}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Gráfico de Barras - Top UTM Sources */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Top 10 Fontes de Tráfego</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topUtmSources} layout="vertical">
                  <defs>
                    <linearGradient id="sourceGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--chart-teal))" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(var(--chart-cyan))" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{
                  fill: 'hsl(var(--muted-foreground))'
                }} />
                  <YAxis dataKey="source" type="category" width={100} tick={{
                  fill: 'hsl(var(--muted-foreground))'
                }} />
                  <Tooltip contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }} />
                  <Bar dataKey="leads" fill="url(#sourceGradient)" radius={[0, 8, 8, 0]} style={{
                  filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.15))'
                }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela Detalhada de UTMs */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Detalhamento de UTMs</h3>
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Source</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Medium</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Campaign</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Term</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Content</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Leads</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Convertidos</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Taxa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUtmData.slice(0, 20).map((item, idx) => <tr key={idx} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{item.source}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{item.medium}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{item.campaign}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[150px]">{item.term}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[150px]">{item.content}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold">{item.total}</td>
                        <td className="px-4 py-3 text-sm text-right text-chart-green font-semibold">{item.completed}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          <Badge variant={item.conversionRate > 50 ? "default" : "secondary"} style={item.conversionRate > 50 ? {
                        backgroundColor: 'hsl(var(--chart-green))',
                        color: 'white'
                      } : {}}>
                            {item.conversionRate.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>
            </div>
            {filteredUtmData.length > 20 && <p className="text-sm text-muted-foreground mt-2 text-center">
                Mostrando 20 de {filteredUtmData.length} resultados
              </p>}
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default Dashboard;