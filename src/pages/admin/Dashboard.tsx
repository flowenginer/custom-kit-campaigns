import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Loader2, TrendingUp, Users, Target, Activity, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UtmBreakdownDialog } from "@/components/dashboard/UtmBreakdownDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// LocalStorage helpers for campaign selection persistence
const STORAGE_KEY = 'dashboard_selected_campaigns';

const loadSelectedCampaigns = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveSelectedCampaigns = (campaigns: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
  } catch (error) {
    console.error('Erro ao salvar seleção:', error);
  }
};

// Custom label component for bar charts
const CustomBarLabel = (props: any) => {
  const { x, y, width, value } = props;
  
  // Don't render if value is 0 or undefined
  if (!value || value === 0) return null;
  
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill="hsl(var(--foreground))"
      textAnchor="middle"
      fontSize="11"
      fontWeight="500"
      opacity="0.7"
    >
      {value}
    </text>
  );
};
interface Campaign {
  id: string;
  name: string;
}
interface FunnelData {
  campaignId: string;
  campaignName: string;
  visits: number;
  completed: number;
  [key: string]: string | number; // Para suportar step_1, step_2, step_3, etc. dinamicamente
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

interface DesignMetrics {
  tasksByStatus: {
    status: string;
    count: number;
    label: string;
    color: string;
  }[];
  avgTimeByStage: {
    stage: string;
    avgHours: number;
  }[];
  designerPerformance: {
    designer_id: string;
    designer_name: string;
    total_tasks: number;
    completed_tasks: number;
    approved_tasks: number;
    avg_completion_time: number;
    efficiency_score: number;
  }[];
}

interface DailyVisitsData {
  date: string;
  [campaignName: string]: string | number;
}

type DateFilterType = "today" | "7days" | "15days" | "30days" | "custom";

const CHART_COLORS = ["hsl(var(--chart-purple))", "hsl(var(--chart-green))", "hsl(var(--chart-orange))", "hsl(var(--chart-blue))", "hsl(var(--chart-pink))", "hsl(var(--chart-teal))", "hsl(var(--chart-indigo))", "hsl(var(--chart-cyan))", "hsl(var(--chart-amber))", "hsl(var(--chart-red))"];
const Dashboard = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(loadSelectedCampaigns());
  const [leadsMetrics, setLeadsMetrics] = useState<LeadsMetrics>({
    total: 0,
    converted: 0,
    conversionRate: 0,
    bySource: []
  });
  const [utmData, setUtmData] = useState<UTMData[]>([]);
  const [selectedUtmSource, setSelectedUtmSource] = useState<string>("all");
  const [selectedUtmMedium, setSelectedUtmMedium] = useState<string>("all");
  const [designMetrics, setDesignMetrics] = useState<DesignMetrics>({
    tasksByStatus: [],
    avgTimeByStage: [],
    designerPerformance: []
  });
  const [dailyVisitsData, setDailyVisitsData] = useState<DailyVisitsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [utmDialogOpen, setUtmDialogOpen] = useState(false);
  const [selectedUtmCampaign, setSelectedUtmCampaign] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterType>("30days");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case "today":
        return { start: today, end: now };
      case "7days":
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return { start: sevenDaysAgo, end: now };
      case "15days":
        const fifteenDaysAgo = new Date(today);
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        return { start: fifteenDaysAgo, end: now };
      case "30days":
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return { start: thirtyDaysAgo, end: now };
      case "custom":
        if (customStartDate && customEndDate) {
          return { start: customStartDate, end: customEndDate };
        }
        return { start: thirtyDaysAgo, end: now };
      default:
        const defaultThirtyDaysAgo = new Date(today);
        defaultThirtyDaysAgo.setDate(defaultThirtyDaysAgo.getDate() - 30);
        return { start: defaultThirtyDaysAgo, end: now };
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadDesignMetrics();
    loadDailyVisits();
  }, [dateFilter, customStartDate, customEndDate]);
  useEffect(() => {
    if (campaigns.length > 0) {
      const saved = loadSelectedCampaigns();
      
      // If no saved selection OR saved campaigns no longer exist
      if (saved.length === 0 || !saved.every(id => campaigns.find(c => c.id === id))) {
        // Select ALL campaigns by default
        const allCampaignIds = campaigns.map(c => c.id);
        setSelectedCampaigns(allCampaignIds);
        saveSelectedCampaigns(allCampaignIds);
      } else {
        // Use saved selection
        setSelectedCampaigns(saved);
      }
    }
  }, [campaigns]);
  const loadDashboardData = async () => {
    try {
      const dateRange = getDateRange();
      
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
          } = await supabase
            .from("funnel_events")
            .select("event_type")
            .eq("campaign_id", campaign.id)
            .gte("created_at", dateRange.start.toISOString())
            .lte("created_at", dateRange.end.toISOString());
          
          // Contar dinamicamente todos os tipos de eventos
          const counts: any = {
            campaignId: campaign.id,
            campaignName: campaign.name,
            visits: 0,
            completed: 0
          };
          
          events?.forEach(event => {
            if (event.event_type === "visit" || event.event_type === "campaign_visit") {
              counts.visits++;
            } else if (event.event_type === "completed") {
              counts.completed++;
            } else if (event.event_type.startsWith("step_")) {
              // Detectar automaticamente step_1, step_2, step_3, etc.
              counts[event.event_type] = (counts[event.event_type] || 0) + 1;
            }
          });
          
          return counts as FunnelData;
        });
        const funnelResults = await Promise.all(funnelPromises);
        setFunnelData(funnelResults);
      }

      // Carregar métricas de leads com UTMs
      const {
        data: leadsData
      } = await supabase
        .from("leads")
        .select("completed, utm_source, utm_medium, utm_campaign, utm_term, utm_content, campaign_id")
        .is("deleted_at", null)
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());
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
    // Detectar dinamicamente todas as etapas que existem nos dados
    const allStepKeys = new Set<string>();
    funnelData.forEach(campaign => {
      Object.keys(campaign).forEach(key => {
        if (key.startsWith("step_")) {
          allStepKeys.add(key);
        }
      });
    });
    
    // Ordenar as etapas numericamente (step_1, step_2, step_3, etc.)
    const sortedSteps = Array.from(allStepKeys).sort((a, b) => {
      const numA = parseInt(a.replace("step_", ""));
      const numB = parseInt(b.replace("step_", ""));
      return numA - numB;
    });
    
    // Criar array de stages: Visitas + Etapas dinâmicas + Concluído
    const stages = [
      "Visitas",
      ...sortedSteps.map(step => {
        const stepNumber = step.replace("step_", "");
        return `Etapa ${stepNumber}`;
      }),
      "Concluído"
    ];
    
    return stages.map(stage => {
      const dataPoint: any = {
        stage
      };
      
      selectedCampaigns.forEach(campaignId => {
        const campaign = funnelData.find(c => c.campaignId === campaignId);
        if (campaign) {
          let stageKey: string;
          
          if (stage === "Visitas") {
            stageKey = "visits";
          } else if (stage === "Concluído") {
            stageKey = "completed";
          } else {
            // Etapa 1 -> step_1, Etapa 2 -> step_2, etc.
            const stepNumber = stage.replace("Etapa ", "");
            stageKey = `step_${stepNumber}`;
          }
          
          dataPoint[campaign.campaignName] = campaign[stageKey] || 0;
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

  // Carregar métricas de criação
  const loadDesignMetrics = async () => {
    try {
      const dateRange = getDateRange();
      
      // 1. Buscar contagem de tarefas por status
    const { data: tasksData } = await supabase
      .from("design_tasks")
      .select("status, assigned_to, created_at, completed_at")
      .is("deleted_at", null)
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

      const statusLabels: Record<string, { label: string; color: string }> = {
        pending: { label: "Aguardando", color: "hsl(var(--chart-blue))" },
        in_progress: { label: "Em Progresso", color: "hsl(var(--chart-orange))" },
        awaiting_approval: { label: "Aguardando Aprovação", color: "hsl(var(--chart-purple))" },
        approved: { label: "Aprovado", color: "hsl(var(--chart-green))" },
        changes_requested: { label: "Revisão Necessária", color: "hsl(var(--chart-red))" },
        completed: { label: "Concluído", color: "hsl(var(--chart-teal))" }
      };

      const tasksByStatus = Object.entries(
        tasksData?.reduce((acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {}
      ).map(([status, count]) => ({
        status,
        count,
        ...statusLabels[status as keyof typeof statusLabels]
      }));

      // 2. Calcular tempo médio entre etapas
      const { data: historyData } = await supabase
        .from("design_task_history")
        .select("task_id, old_status, new_status, created_at")
        .eq("action", "status_changed")
        .order("created_at", { ascending: true });

      const timeByStage: Record<string, number[]> = {};
      
      historyData?.forEach((item, idx, arr) => {
        if (idx === 0) return;
        const prev = arr[idx - 1];
        if (prev.task_id === item.task_id && prev.new_status && item.new_status) {
          const key = `${prev.new_status} → ${item.new_status}`;
          const hours = (new Date(item.created_at).getTime() - new Date(prev.created_at).getTime()) / (1000 * 60 * 60);
          if (!timeByStage[key]) timeByStage[key] = [];
          timeByStage[key].push(hours);
        }
      });

      const avgTimeByStage = Object.entries(timeByStage).map(([stage, times]) => ({
        stage,
        avgHours: times.reduce((a, b) => a + b, 0) / times.length
      })).sort((a, b) => b.avgHours - a.avgHours).slice(0, 10);

      // 3. Performance dos designers
      const designerGroups = tasksData?.reduce((acc, task) => {
        const id = task.assigned_to;
        if (!id) return acc;
        
        if (!acc[id]) {
          acc[id] = {
            designer_id: id,
            designer_name: `Designer ${id.substring(0, 8)}`,
            total_tasks: 0,
            completed_tasks: 0,
            approved_tasks: 0,
            completion_times: []
          };
        }
        
        acc[id].total_tasks++;
        if (task.status === 'completed') {
          acc[id].completed_tasks++;
          if (task.completed_at && task.created_at) {
            const hours = (new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()) / (1000 * 60 * 60);
            acc[id].completion_times.push(hours);
          }
        }
        if (task.status === 'approved') acc[id].approved_tasks++;
        
        return acc;
      }, {} as Record<string, any>) || {};

      const designerPerformance = Object.values(designerGroups).map((designer: any) => {
        const avg_completion_time = designer.completion_times.length > 0
          ? designer.completion_times.reduce((a: number, b: number) => a + b, 0) / designer.completion_times.length
          : 0;
        
        const completion_rate = designer.total_tasks > 0 ? designer.completed_tasks / designer.total_tasks : 0;
        const approval_rate = designer.total_tasks > 0 ? designer.approved_tasks / designer.total_tasks : 0;
        const time_efficiency = avg_completion_time > 0 ? Math.max(0, 100 - avg_completion_time) / 100 : 0;
        
        const efficiency_score = (completion_rate * 40 + approval_rate * 40 + time_efficiency * 20) * 100;
        
        return {
          ...designer,
          avg_completion_time,
          efficiency_score: Math.round(efficiency_score)
        };
      }).sort((a: any, b: any) => b.efficiency_score - a.efficiency_score);

      setDesignMetrics({
        tasksByStatus,
        avgTimeByStage,
        designerPerformance
      });
    } catch (error) {
      console.error("Erro ao carregar métricas de criação:", error);
    }
  };

  const loadDailyVisits = async () => {
    try {
      const dateRange = getDateRange();

      const { data: visitsData, error } = await supabase
        .from("funnel_events")
        .select(`
          created_at,
          campaign_id,
          campaigns (
            id,
            name
          )
        `)
        .eq("event_type", "campaign_visit")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!visitsData) return;

      const visitsByDateAndCampaign: { [date: string]: { [campaignName: string]: number } } = {};
      
      visitsData.forEach((visit: any) => {
        const date = new Date(visit.created_at);
        const dateKey = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const campaignName = visit.campaigns?.name || 'Sem Campanha';
        
        if (!visitsByDateAndCampaign[dateKey]) {
          visitsByDateAndCampaign[dateKey] = {};
        }
        
        if (!visitsByDateAndCampaign[dateKey][campaignName]) {
          visitsByDateAndCampaign[dateKey][campaignName] = 0;
        }
        
        visitsByDateAndCampaign[dateKey][campaignName]++;
      });

      const formattedData: DailyVisitsData[] = Object.entries(visitsByDateAndCampaign).map(([date, campaigns]) => ({
        date,
        ...campaigns
      }));

      setDailyVisitsData(formattedData);
    } catch (error) {
      console.error("Erro ao carregar visitas diárias:", error);
    }
  };

  // Obter sources e mediums únicos para filtros
  const uniqueSources = ["all", ...Array.from(new Set(utmData.map(d => d.source)))];
  const uniqueMediums = ["all", ...Array.from(new Set(utmData.map(d => d.medium)))];
  
  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-64 mb-4" />
        
        {/* Metrics cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  const comparativeFunnelData = getComparativeFunnelData();
  const campaignComparisonData = getCampaignComparisonData();
  const topUtmSources = getTopUtmSources();
  const filteredUtmData = getFilteredUtmData();
  return <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-chart-purple bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visualize a performance de suas campanhas em tempo real
          </p>
        </div>
        
        {/* Filtro de Data */}
        <div className="flex items-center gap-3">
          <Select value={dateFilter} onValueChange={(value: DateFilterType) => setDateFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="15days">Últimos 15 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
              <SelectItem value="custom">Personalizar</SelectItem>
            </SelectContent>
          </Select>
          
          {dateFilter === "custom" && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !customStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Data início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              
              <span className="text-muted-foreground">até</span>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !customEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customEndDate ? format(customEndDate, "dd/MM/yyyy") : "Data fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
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
                const newSelection = selectedCampaigns.includes(campaign.id) 
                  ? selectedCampaigns.filter(id => id !== campaign.id) 
                  : [...selectedCampaigns, campaign.id];
                
                setSelectedCampaigns(newSelection);
                saveSelectedCampaigns(newSelection);
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
                  return campaign ? <Bar 
                    key={campaignId} 
                    dataKey={campaign.name} 
                    fill={`url(#barGradient-${idx})`} 
                    radius={[8, 8, 0, 0]}
                    label={<CustomBarLabel />}
                    style={{
                      filter: 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.15))'
                    }}
                    onClick={(data) => {
                      // Abrir dialog de UTMs apenas quando clicar em "Visitas"
                      if (data && data.stage === "Visitas") {
                        setSelectedUtmCampaign({
                          id: campaignId,
                          name: campaign.name,
                        });
                        setUtmDialogOpen(true);
                      }
                    }}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  /> : null;
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

          {/* Gráfico de Visitas Diárias por Campanha */}
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Visitas Diárias por Campanha
              </CardTitle>
              <CardDescription>
                Evolução de visitas nos últimos 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : dailyVisitsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={dailyVisitsData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: "20px" }}
                      iconType="line"
                    />
                    {campaigns
                      .filter(campaign => selectedCampaigns.includes(campaign.id))
                      .map((campaign, idx) => (
                        <Line
                          key={campaign.id}
                          type="monotone"
                          dataKey={campaign.name}
                          stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                          name={campaign.name}
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado de visitas disponível
                </div>
              )}
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

      {/* Seção 5: Métricas de Criação de Design */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">📐 Métricas de Criação</h2>
          <p className="text-muted-foreground">Acompanhe o desempenho da equipe de design</p>
        </div>

        {/* Cards de Status de Tarefas */}
        <div className="grid gap-4 md:grid-cols-6">
          {designMetrics.tasksByStatus.map((status) => (
            <Card key={status.status} style={{ borderColor: status.color, borderWidth: '2px' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {status.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: status.color }}>
                  {status.count}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gráfico de Tempo Médio por Etapa */}
        {designMetrics.avgTimeByStage.length > 0 && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>⏱️ Tempo Médio Entre Etapas</CardTitle>
              <CardDescription>
                Média de horas gastas em cada transição de status (Top 10)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={designMetrics.avgTimeByStage}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="stage" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    />
                    <YAxis 
                      label={{ value: 'Horas', angle: -90, position: 'insideLeft' }}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}h`, 'Tempo Médio']}
                    />
                    <Bar 
                      dataKey="avgHours" 
                      fill="hsl(var(--chart-orange))" 
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela de Performance dos Designers */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>🏆 Ranking de Designers</CardTitle>
            <CardDescription>
              Performance baseada em tarefas concluídas, aprovadas e tempo médio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {designMetrics.designerPerformance.map((designer, idx) => (
                <div 
                  key={designer.designer_id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 font-bold text-lg">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{designer.designer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {designer.total_tasks} tarefas • 
                        {designer.completed_tasks} concluídas • 
                        {designer.approved_tasks} aprovadas
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {designer.avg_completion_time > 0 
                          ? `${designer.avg_completion_time.toFixed(1)}h média`
                          : '-'}
                      </p>
                      <Badge 
                        variant={designer.efficiency_score >= 70 ? "default" : "secondary"}
                        className="mt-1"
                      >
                        Score: {designer.efficiency_score}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {designMetrics.designerPerformance.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum designer com tarefas atribuídas ainda
                </p>
              )}
            </div>
          </CardContent>
      </Card>
    </div>

    {/* Dialog de Breakdown de UTMs */}
    {selectedUtmCampaign && (
      <UtmBreakdownDialog
        open={utmDialogOpen}
        onOpenChange={setUtmDialogOpen}
        campaignId={selectedUtmCampaign.id}
        campaignName={selectedUtmCampaign.name}
      />
    )}
  </div>;
};
export default Dashboard;