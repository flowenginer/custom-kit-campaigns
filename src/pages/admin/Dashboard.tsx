import { useEffect, useState, useCallback, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshIndicator } from "@/components/dashboard/RefreshIndicator";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useUserRole } from "@/hooks/useUserRole";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Loader2, TrendingUp, TrendingDown, Users, Target, Activity, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UtmBreakdownDialog } from "@/components/dashboard/UtmBreakdownDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// LocalStorage helpers for campaign and workflow selection persistence
const STORAGE_KEY = 'dashboard_selected_campaigns';
const WORKFLOW_STORAGE_KEY = 'dashboard_selected_workflow';

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

const loadSelectedWorkflow = (): string => {
  try {
    const saved = localStorage.getItem(WORKFLOW_STORAGE_KEY);
    return saved || 'all';
  } catch {
    return 'all';
  }
};

const saveSelectedWorkflow = (workflowId: string) => {
  try {
    localStorage.setItem(WORKFLOW_STORAGE_KEY, workflowId);
  } catch (error) {
    console.error('Erro ao salvar workflow:', error);
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

// Custom axis tick para mostrar etapa e total (apenas última palavra)
const CustomAxisTick = (props: any) => {
  const { x, y, payload, data } = props;
  
  // Função para extrair a última palavra de uma string
  const getLastWord = (text: string): string => {
    const words = text.trim().split(' ');
    return words[words.length - 1];
  };
  
  // Encontrar o datapoint correspondente a esta etapa
  const dataPoint = data?.find((d: any) => d.stage === payload.value);
  
  // Calcular o total somando todos os valores numéricos (excluindo 'stage')
  let total = 0;
  if (dataPoint) {
    Object.keys(dataPoint).forEach(key => {
      if (key !== 'stage' && typeof dataPoint[key] === 'number') {
        total += dataPoint[key];
      }
    });
  }
  
  // Extrair apenas a última palavra do label
  const shortLabel = getLastWord(payload.value);
  
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Nome da etapa (apenas última palavra) */}
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        fontSize="10"
      >
        {shortLabel}
      </text>
      {/* Total da etapa */}
      <text
        x={0}
        y={0}
        dy={32}
        textAnchor="middle"
        fill="hsl(var(--foreground))"
        fontSize="11"
        fontWeight="600"
      >
        {total}
      </text>
    </g>
  );
};

interface Campaign {
  id: string;
  name: string;
  workflow_config?: any;
  workflow_template_id?: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
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

interface EngagementMetrics {
  avgTimeToConversion: number; // em segundos
  avgEngagementTime: number; // em segundos
  totalSessions: number;
  convertedSessions: number;
}

interface DailyVisitsData {
  date: string;
  [campaignName: string]: string | number;
}

type DateFilterType = "today" | "yesterday" | "7days" | "15days" | "30days" | "month" | "lastMonth" | "custom";
type ComparisonMode = "single" | "comparison";

const CHART_COLORS = ["hsl(var(--chart-purple))", "hsl(var(--chart-green))", "hsl(var(--chart-orange))", "hsl(var(--chart-blue))", "hsl(var(--chart-pink))", "hsl(var(--chart-teal))", "hsl(var(--chart-indigo))", "hsl(var(--chart-cyan))", "hsl(var(--chart-amber))", "hsl(var(--chart-red))"];

// Função para formatar tempo em formato legível
const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}min ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}min`;
  }
};

const Dashboard = () => {
  const { isDesigner, isLoading: isLoadingRole } = useUserRole();
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(loadSelectedWorkflow());
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
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics>({
    avgTimeToConversion: 0,
    avgEngagementTime: 0,
    totalSessions: 0,
    convertedSessions: 0,
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
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);
  
  // Estados para modo de comparação
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("single");
  const [period1, setPeriod1] = useState<DateFilterType>("month");
  const [period2, setPeriod2] = useState<DateFilterType>("lastMonth");
  const [customStartDateP1, setCustomStartDateP1] = useState<Date | undefined>();
  const [customEndDateP1, setCustomEndDateP1] = useState<Date | undefined>();
  const [customStartDateP2, setCustomStartDateP2] = useState<Date | undefined>();
  const [customEndDateP2, setCustomEndDateP2] = useState<Date | undefined>();
  
  // Dados dos dois períodos para comparação
  const [leadsMetricsP1, setLeadsMetricsP1] = useState<LeadsMetrics>({ total: 0, converted: 0, conversionRate: 0, bySource: [] });
  const [leadsMetricsP2, setLeadsMetricsP2] = useState<LeadsMetrics>({ total: 0, converted: 0, conversionRate: 0, bySource: [] });
  const [funnelDataP1, setFunnelDataP1] = useState<FunnelData[]>([]);
  const [funnelDataP2, setFunnelDataP2] = useState<FunnelData[]>([]);
  const [dailyVisitsDataP1, setDailyVisitsDataP1] = useState<DailyVisitsData[]>([]);
  const [dailyVisitsDataP2, setDailyVisitsDataP2] = useState<DailyVisitsData[]>([]);
  const [campaignComparisonDataP1, setCampaignComparisonDataP1] = useState<CampaignComparisonData[]>([]);
  const [campaignComparisonDataP2, setCampaignComparisonDataP2] = useState<CampaignComparisonData[]>([]);
  const [topUtmSourcesP1, setTopUtmSourcesP1] = useState<any[]>([]);
  const [topUtmSourcesP2, setTopUtmSourcesP2] = useState<any[]>([]);
  const [designMetricsP1, setDesignMetricsP1] = useState<DesignMetrics>({ tasksByStatus: [], avgTimeByStage: [], designerPerformance: [] });
  const [designMetricsP2, setDesignMetricsP2] = useState<DesignMetrics>({ tasksByStatus: [], avgTimeByStage: [], designerPerformance: [] });
  const getDateRangeForPeriod = (period: DateFilterType, customStart?: Date, customEnd?: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case "today":
        return { start: today, end: now };
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);
        return { start: yesterday, end: endOfYesterday };
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
      case "month":
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: startOfCurrentMonth, end: now };
      case "lastMonth":
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return { start: startOfLastMonth, end: endOfLastMonth };
      case "custom":
        if (customStart && customEnd) {
          return { start: customStart, end: customEnd };
        }
        const fallbackThirtyDaysAgo = new Date(today);
        fallbackThirtyDaysAgo.setDate(fallbackThirtyDaysAgo.getDate() - 30);
        return { start: fallbackThirtyDaysAgo, end: now };
      default:
        const defaultThirtyDaysAgo = new Date(today);
        defaultThirtyDaysAgo.setDate(defaultThirtyDaysAgo.getDate() - 30);
        return { start: defaultThirtyDaysAgo, end: now };
    }
  };

  const getDateRange = () => {
    return getDateRangeForPeriod(dateFilter, customStartDate, customEndDate);
  };

  const getPeriodLabel = (period: DateFilterType): string => {
    const labels: Record<DateFilterType, string> = {
      today: "Hoje",
      yesterday: "Ontem",
      "7days": "Últimos 7 dias",
      "15days": "Últimos 15 dias",
      "30days": "Últimos 30 dias",
      month: "Este mês",
      lastMonth: "Mês passado",
      custom: "Período personalizado"
    };
    return labels[period] || "Período";
  };

  const calculateVariation = (period1Value: number, period2Value: number): number => {
    if (period2Value === 0) return period1Value > 0 ? 100 : 0;
    return ((period1Value - period2Value) / period2Value) * 100;
  };

  const refreshDashboard = useCallback(async () => {
    // Designers sempre precisam das métricas de design
    if (isDesigner) {
      await loadDesignMetrics();
      return;
    }
    
    if (comparisonMode === "comparison") {
      await Promise.all([
        loadComparisonData(),
      ]);
    } else {
      await Promise.all([
        loadDashboardData(),
        loadDesignMetrics(),
        loadDailyVisits()
      ]);
    }
  }, [isDesigner, comparisonMode, dateFilter, customStartDate, customEndDate, period1, period2, customStartDateP1, customEndDateP1, customStartDateP2, customEndDateP2, selectedCampaigns, selectedWorkflowId]);

  const { lastUpdated, isRefreshing, refresh } = useAutoRefresh(
    refreshDashboard,
    { interval: 60000, enabled: true }
  );

  useEffect(() => {
    loadWorkflows();
  }, []);

  useEffect(() => {
    // Designers sempre precisam das métricas de design
    if (isDesigner) {
      loadDesignMetrics();
      return;
    }
    
    if (comparisonMode === "comparison") {
      loadComparisonData();
    } else {
      loadDashboardData();
      loadDesignMetrics();
      loadDailyVisits();
    }
  }, [isDesigner, comparisonMode, dateFilter, customStartDate, customEndDate, period1, period2, customStartDateP1, customEndDateP1, customStartDateP2, customEndDateP2, selectedWorkflowId]);
  
  useEffect(() => {
    if (campaigns.length > 0) {
      const saved = loadSelectedCampaigns();
      
      // Filter campaigns based on selected workflow
      const filteredCampaigns = getFilteredCampaigns();
      
      // If no saved selection OR saved campaigns no longer exist in filtered list
      if (saved.length === 0 || !saved.every(id => filteredCampaigns.find(c => c.id === id))) {
        // Select ALL filtered campaigns by default
        const allCampaignIds = filteredCampaigns.map(c => c.id);
        setSelectedCampaigns(allCampaignIds);
        saveSelectedCampaigns(allCampaignIds);
      } else {
        // Use saved selection but filter by workflow
        const validSelection = saved.filter(id => filteredCampaigns.find(c => c.id === id));
        setSelectedCampaigns(validSelection);
        if (validSelection.length !== saved.length) {
          saveSelectedCampaigns(validSelection);
        }
      }
    }
  }, [campaigns, selectedWorkflowId]);

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          console.log('Lead atualizado:', payload);
          loadDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order atualizado:', payload);
          loadDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'design_tasks'
        },
        (payload) => {
          console.log('Task atualizada:', payload);
          loadDesignMetrics();
        }
      )
      .subscribe();

    setRealtimeChannel(channel);

    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, []);
  const loadWorkflows = async () => {
    try {
      const { data: workflowsData } = await supabase
        .from("workflow_templates")
        .select("id, name, description")
        .is('deleted_at', null)
        .order("name", { ascending: true });
      
      if (workflowsData) {
        setWorkflows(workflowsData);
      }
    } catch (error) {
      console.error("Erro ao carregar workflows:", error);
    }
  };

  const getFilteredCampaigns = (): Campaign[] => {
    if (selectedWorkflowId === 'all') {
      return campaigns;
    }
    return campaigns.filter(c => c.workflow_template_id === selectedWorkflowId);
  };

  const loadComparisonData = async () => {
    setIsLoading(true);
    try {
      const range1 = getDateRangeForPeriod(period1, customStartDateP1, customEndDateP1);
      const range2 = getDateRangeForPeriod(period2, customStartDateP2, customEndDateP2);
      
      await Promise.all([
        loadDataForPeriod(range1, setLeadsMetricsP1, setFunnelDataP1, setDailyVisitsDataP1, setTopUtmSourcesP1, setDesignMetricsP1),
        loadDataForPeriod(range2, setLeadsMetricsP2, setFunnelDataP2, setDailyVisitsDataP2, setTopUtmSourcesP2, setDesignMetricsP2)
      ]);
    } catch (error) {
      console.error("Erro ao carregar dados de comparação:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDataForPeriod = async (
    dateRange: { start: Date; end: Date },
    setMetrics: (m: LeadsMetrics) => void,
    setFunnel: (f: FunnelData[]) => void,
    setVisits: (v: DailyVisitsData[]) => void,
    setTopUtm: (u: any[]) => void,
    setDesign: (d: DesignMetrics) => void
  ) => {
    try {
      // Carregar campanhas
      let campaignQuery = supabase
        .from("campaigns")
        .select("id, name, workflow_config, workflow_template_id")
        .is('deleted_at', null)
        .order("created_at", { ascending: false });
      
      if (selectedWorkflowId !== 'all') {
        campaignQuery = campaignQuery.eq("workflow_template_id", selectedWorkflowId);
      }
      
      const { data: campaignsData } = await campaignQuery;
      if (campaignsData) {
        if (campaigns.length === 0) {
          setCampaigns(campaignsData);
        }

        // Carregar dados de funil
        const funnelPromises = campaignsData.map(async campaign => {
          const { data: events } = await supabase
            .from("funnel_events")
            .select("event_type")
            .eq("campaign_id", campaign.id)
            .gte("created_at", dateRange.start.toISOString())
            .lte("created_at", dateRange.end.toISOString());
          
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
              counts[event.event_type] = (counts[event.event_type] || 0) + 1;
            }
          });
          
          return counts as FunnelData;
        });
        const funnelResults = await Promise.all(funnelPromises);
        setFunnel(funnelResults);

      // Carregar métricas de leads (filtradas pelas campanhas selecionadas)
        let leadsQuery = supabase
          .from("leads")
          .select("completed, utm_source, utm_medium, utm_campaign, utm_term, utm_content, campaign_id")
          .is("deleted_at", null)
          .gte("created_at", dateRange.start.toISOString())
          .lte("created_at", dateRange.end.toISOString());
        
        // Filtrar por campanhas selecionadas
        if (selectedCampaigns.length > 0) {
          leadsQuery = leadsQuery.in("campaign_id", selectedCampaigns);
        }
        
        const { data: leadsData } = await leadsQuery;

        if (leadsData) {
          const total = leadsData.length;
          const converted = leadsData.filter(l => l.completed).length;
          const conversionRate = total > 0 ? converted / total * 100 : 0;

          const sourceGroups = leadsData.reduce((acc: any, lead) => {
            const source = lead.utm_source || 'Direto';
            acc[source] = (acc[source] || 0) + 1;
            return acc;
          }, {});
          
          const bySource = Object.entries(sourceGroups).map(([source, count]) => ({
            source,
            count: count as number
          })).sort((a, b) => b.count - a.count);
          
          setMetrics({ total, converted, conversionRate, bySource });

          // Top UTM sources
          const utmGroups = leadsData.reduce((acc: any, lead) => {
            const source = lead.utm_source || 'Direto';
            if (!acc[source]) {
              acc[source] = { source, leads: 0 };
            }
            acc[source].leads++;
            return acc;
          }, {});
          
          const topSources = Object.values(utmGroups)
            .sort((a: any, b: any) => b.leads - a.leads)
            .slice(0, 10);
          setTopUtm(topSources);
        }

        // Carregar visitas diárias
        const { data: visitsData } = await supabase
          .from("funnel_events")
          .select(`created_at, campaign_id, campaigns (id, name)`)
          .eq("event_type", "campaign_visit")
          .gte("created_at", dateRange.start.toISOString())
          .lte("created_at", dateRange.end.toISOString())
          .order("created_at", { ascending: true });

        if (visitsData) {
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
          setVisits(formattedData);
        }

        // Carregar métricas de design
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

    const { data: historyData } = await supabase
      .from("design_task_history")
      .select("task_id, old_status, new_status, created_at")
      .eq("action", "status_changed")
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString())
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

        setDesign({ tasksByStatus, avgTimeByStage, designerPerformance });

        // ✅ Calcular métricas de engajamento
        const { data: funnelEvents } = await supabase
          .from("funnel_events")
          .select("session_id, event_type, created_at")
          .gte("created_at", dateRange.start.toISOString())
          .lte("created_at", dateRange.end.toISOString())
          .order("created_at", { ascending: true });

        if (funnelEvents) {
          // Agrupar eventos por session_id
          const sessionEvents = funnelEvents.reduce((acc, event) => {
            if (!acc[event.session_id]) {
              acc[event.session_id] = [];
            }
            acc[event.session_id].push(event);
            return acc;
          }, {} as Record<string, typeof funnelEvents>);

          let totalTimeToConversion = 0;
          let totalEngagementTime = 0;
          let convertedCount = 0;
          let totalSessionsCount = Object.keys(sessionEvents).length;

          Object.values(sessionEvents).forEach((events) => {
            if (events.length === 0) return;

            // Ordenar eventos por data
            const sortedEvents = events.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            const firstEvent = sortedEvents[0];
            const lastEvent = sortedEvents[sortedEvents.length - 1];
            const hasCompleted = sortedEvents.some(e => e.event_type === 'completed');

            // Tempo de engajamento = do primeiro ao último evento
            const engagementTime = (new Date(lastEvent.created_at).getTime() - new Date(firstEvent.created_at).getTime()) / 1000;
            totalEngagementTime += engagementTime;

            // Se converteu, adicionar ao tempo de conversão
            if (hasCompleted) {
              totalTimeToConversion += engagementTime;
              convertedCount++;
            }
          });

          setEngagementMetrics({
            avgTimeToConversion: convertedCount > 0 ? totalTimeToConversion / convertedCount : 0,
            avgEngagementTime: totalSessionsCount > 0 ? totalEngagementTime / totalSessionsCount : 0,
            totalSessions: totalSessionsCount,
            convertedSessions: convertedCount,
          });
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados do período:", error);
    }
  };

  const loadDashboardData = async () => {
    try {
      const dateRange = getDateRange();
      
      // Carregar campanhas
      let campaignQuery = supabase
        .from("campaigns")
        .select("id, name, workflow_config, workflow_template_id")
        .is('deleted_at', null)
        .order("created_at", { ascending: false });
      
      // Filtrar por workflow se não for "all"
      if (selectedWorkflowId !== 'all') {
        campaignQuery = campaignQuery.eq("workflow_template_id", selectedWorkflowId);
      }
      
      const { data: campaignsData } = await campaignQuery;
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

      // Carregar métricas de leads com UTMs (filtradas pelas campanhas selecionadas)
      let leadsQuery = supabase
        .from("leads")
        .select("completed, utm_source, utm_medium, utm_campaign, utm_term, utm_content, campaign_id, session_id")
        .is("deleted_at", null)
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());
      
      // Filtrar por campanhas selecionadas
      if (selectedCampaigns.length > 0) {
        leadsQuery = leadsQuery.in("campaign_id", selectedCampaigns);
      }
      
      const { data: leadsData } = await leadsQuery;
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

  // Mapear step numbers para labels baseado no workflow_config das campanhas
  const getStepLabel = (stepNumber: string): string => {
    // Se não houver campanhas selecionadas, retornar label genérico
    if (selectedCampaigns.length === 0) {
      return `Etapa ${stepNumber}`;
    }
    
    // Pegar a primeira campanha selecionada para referência
    const firstCampaign = campaigns.find(c => c.id === selectedCampaigns[0]);
    
    if (!firstCampaign?.workflow_config) {
      return `Etapa ${stepNumber}`;
    }
    
    // Buscar pelo campo 'order' ao invés do índice do array
    const stepNum = parseInt(stepNumber);
    const workflowConfig = firstCampaign.workflow_config as any[];
    const workflowStep = workflowConfig.find((step: any) => step.order === stepNum);
    
    if (workflowStep?.label) {
      return workflowStep.label;
    }
    
    return `Etapa ${stepNumber}`;
  };

  // Preparar dados para o gráfico de funil comparativo
  const getComparativeFunnelData = () => {
    const dataSource = comparisonMode === "comparison" ? [...funnelDataP1, ...funnelDataP2] : funnelData;
    const allStepKeys = new Set<string>();
    
    dataSource.forEach(campaign => {
      Object.keys(campaign).forEach(key => {
        if (key.startsWith("step_")) {
          allStepKeys.add(key);
        }
      });
    });
    
    const sortedSteps = Array.from(allStepKeys).sort((a, b) => {
      const numA = parseInt(a.replace("step_", ""));
      const numB = parseInt(b.replace("step_", ""));
      return numA - numB;
    });
    
    const stagesWithLabels = sortedSteps.map(step => {
      const stepNumber = step.replace("step_", "");
      return getStepLabel(stepNumber);
    });
    
    const stages = ["Visitas", ...stagesWithLabels, "Concluído"];
    
    return stages.map(stage => {
      const dataPoint: any = { stage };
      
      selectedCampaigns.forEach(campaignId => {
        if (comparisonMode === "comparison") {
          const campaignP1 = funnelDataP1.find(c => c.campaignId === campaignId);
          const campaignP2 = funnelDataP2.find(c => c.campaignId === campaignId);
          const campaignName = campaigns.find(c => c.id === campaignId)?.name;
          
          if (campaignName) {
            let stageKey: string;
            if (stage === "Visitas") stageKey = "visits";
            else if (stage === "Concluído") stageKey = "completed";
            else {
              const matchingStep = sortedSteps.find(step => {
                const stepNum = step.replace("step_", "");
                return getStepLabel(stepNum) === stage;
              });
              stageKey = matchingStep || "step_0";
            }
            
            dataPoint[`${campaignName}_P1`] = campaignP1?.[stageKey] || 0;
            dataPoint[`${campaignName}_P2`] = campaignP2?.[stageKey] || 0;
          }
        } else {
          const campaign = funnelData.find(c => c.campaignId === campaignId);
          if (campaign) {
            let stageKey: string;
            if (stage === "Visitas") stageKey = "visits";
            else if (stage === "Concluído") stageKey = "completed";
            else {
              const matchingStep = sortedSteps.find(step => {
                const stepNum = step.replace("step_", "");
                return getStepLabel(stepNum) === stage;
              });
              stageKey = matchingStep || "step_0";
            }
            dataPoint[campaign.campaignName] = campaign[stageKey] || 0;
          }
        }
      });
      
      return dataPoint;
    });
  };

  // Processar dados do Período 1 para o formato do gráfico
  const getProcessedFunnelDataP1 = (): any[] => {
    if (!funnelDataP1 || funnelDataP1.length === 0) return [];
    
    // Detectar todos os steps disponíveis
    const allStepKeys = new Set<string>();
    funnelDataP1.forEach(campaign => {
      Object.keys(campaign).forEach(key => {
        if (key.startsWith("step_")) {
          allStepKeys.add(key);
        }
      });
    });
    
    const sortedSteps = Array.from(allStepKeys).sort((a, b) => {
      const numA = parseInt(a.replace("step_", ""));
      const numB = parseInt(b.replace("step_", ""));
      return numA - numB;
    });
    
    const stagesWithLabels = sortedSteps.map(step => {
      const stepNumber = step.replace("step_", "");
      return getStepLabel(stepNumber);
    });
    
    const stages = ["Visitas", ...stagesWithLabels, "Concluído"];
    
    return stages.map(stage => {
      const dataPoint: any = { stage };
      
      selectedCampaigns.forEach(campaignId => {
        const campaign = funnelDataP1.find(c => c.campaignId === campaignId);
        if (campaign) {
          let stageKey: string;
          if (stage === "Visitas") stageKey = "visits";
          else if (stage === "Concluído") stageKey = "completed";
          else {
            const matchingStep = sortedSteps.find(step => {
              const stepNum = step.replace("step_", "");
              return getStepLabel(stepNum) === stage;
            });
            stageKey = matchingStep || "step_0";
          }
          dataPoint[campaign.campaignName] = campaign[stageKey] || 0;
        }
      });
      
      return dataPoint;
    });
  };

  // Processar dados do Período 2 para o formato do gráfico
  const getProcessedFunnelDataP2 = (): any[] => {
    if (!funnelDataP2 || funnelDataP2.length === 0) return [];
    
    const allStepKeys = new Set<string>();
    funnelDataP2.forEach(campaign => {
      Object.keys(campaign).forEach(key => {
        if (key.startsWith("step_")) {
          allStepKeys.add(key);
        }
      });
    });
    
    const sortedSteps = Array.from(allStepKeys).sort((a, b) => {
      const numA = parseInt(a.replace("step_", ""));
      const numB = parseInt(b.replace("step_", ""));
      return numA - numB;
    });
    
    const stagesWithLabels = sortedSteps.map(step => {
      const stepNumber = step.replace("step_", "");
      return getStepLabel(stepNumber);
    });
    
    const stages = ["Visitas", ...stagesWithLabels, "Concluído"];
    
    return stages.map(stage => {
      const dataPoint: any = { stage };
      
      selectedCampaigns.forEach(campaignId => {
        const campaign = funnelDataP2.find(c => c.campaignId === campaignId);
        if (campaign) {
          let stageKey: string;
          if (stage === "Visitas") stageKey = "visits";
          else if (stage === "Concluído") stageKey = "completed";
          else {
            const matchingStep = sortedSteps.find(step => {
              const stepNum = step.replace("step_", "");
              return getStepLabel(stepNum) === stage;
            });
            stageKey = matchingStep || "step_0";
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

  // Filtrar dados de UTM do Período 1
  const getFilteredUtmDataP1 = () => {
    if (!topUtmSourcesP1 || topUtmSourcesP1.length === 0) return [];
    return topUtmSourcesP1.map(source => ({
      source: source.source,
      medium: '-',
      total: source.leads
    }));
  };

  // Filtrar dados de UTM do Período 2
  const getFilteredUtmDataP2 = () => {
    if (!topUtmSourcesP2 || topUtmSourcesP2.length === 0) return [];
    return topUtmSourcesP2.map(source => ({
      source: source.source,
      medium: '-',
      total: source.leads
    }));
  };

  // Obter top sources do Período 1
  const getTopUtmSourcesP1 = () => {
    if (!topUtmSourcesP1 || topUtmSourcesP1.length === 0) return [];
    return topUtmSourcesP1.slice(0, 10);
  };

  // Obter top sources do Período 2
  const getTopUtmSourcesP2 = () => {
    if (!topUtmSourcesP2 || topUtmSourcesP2.length === 0) return [];
    return topUtmSourcesP2.slice(0, 10);
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
  
  if (isLoading || isLoadingRole) {
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
  
  // 🎨 VISUALIZAÇÃO PARA DESIGNERS - Apenas 3 seções relevantes
  if (isDesigner) {
    return (
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-chart-purple bg-clip-text text-transparent">
                Dashboard do Designer
              </h1>
              <p className="text-muted-foreground mt-1">
                Acompanhe suas métricas de criação e performance
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <RefreshIndicator 
              lastUpdated={lastUpdated}
              isRefreshing={isRefreshing}
              onRefresh={refresh}
            />
          </div>
        </div>

        {/* Filtros de Data */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-muted/30 p-4 rounded-lg border">
          {/* Botões de período */}
          <div className="flex flex-wrap gap-2 flex-1">
            <Button
              size="sm"
              variant={dateFilter === "today" ? "default" : "outline"}
              onClick={() => setDateFilter("today")}
            >
              Hoje
            </Button>
            <Button
              size="sm"
              variant={dateFilter === "yesterday" ? "default" : "outline"}
              onClick={() => setDateFilter("yesterday")}
            >
              Ontem
            </Button>
            <Button
              size="sm"
              variant={dateFilter === "7days" ? "default" : "outline"}
              onClick={() => setDateFilter("7days")}
            >
              7 dias
            </Button>
            <Button
              size="sm"
              variant={dateFilter === "15days" ? "default" : "outline"}
              onClick={() => setDateFilter("15days")}
            >
              15 dias
            </Button>
            <Button
              size="sm"
              variant={dateFilter === "30days" ? "default" : "outline"}
              onClick={() => setDateFilter("30days")}
            >
              30 dias
            </Button>
            <Button
              size="sm"
              variant={dateFilter === "month" ? "default" : "outline"}
              onClick={() => setDateFilter("month")}
            >
              Este mês
            </Button>
            <Button
              size="sm"
              variant={dateFilter === "lastMonth" ? "default" : "outline"}
              onClick={() => setDateFilter("lastMonth")}
            >
              Mês passado
            </Button>
            <Button
              size="sm"
              variant={dateFilter === "custom" ? "default" : "outline"}
              onClick={() => setDateFilter("custom")}
            >
              <CalendarIcon className="mr-1 h-4 w-4" />
              Personalizado
            </Button>
          </div>
        </div>

        {/* Calendário Personalizado */}
        {dateFilter === "custom" && (
          <div className="flex flex-wrap gap-3 items-center bg-muted/30 p-4 rounded-lg border">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "justify-start text-left font-normal",
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
                />
              </PopoverContent>
            </Popover>
            
            <span className="text-muted-foreground">até</span>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "justify-start text-left font-normal",
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
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Seção: Métricas de Criação de Design */}
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
                          {designer.total_tasks} tarefas · {designer.completed_tasks} concluídas · {designer.approved_tasks} aprovadas
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="text-sm px-3 py-1">
                        Score: {designer.efficiency_score}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {designer.avg_completion_time.toFixed(1)}h média
                      </p>
                    </div>
                  </div>
                ))}
                {designMetrics.designerPerformance.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum dado disponível no período selecionado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  const comparativeFunnelData = getComparativeFunnelData();
  const campaignComparisonData = getCampaignComparisonData();
  const topUtmSources = getTopUtmSources();
  const filteredUtmData = getFilteredUtmData();
  const processedFunnelP1 = getProcessedFunnelDataP1();
  const processedFunnelP2 = getProcessedFunnelDataP2();
  const filteredUtmDataP1 = getFilteredUtmDataP1();
  const filteredUtmDataP2 = getFilteredUtmDataP2();
  const topUtmSourcesP1Data = getTopUtmSourcesP1();
  const topUtmSourcesP2Data = getTopUtmSourcesP2();
  return <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-chart-purple bg-clip-text text-transparent">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Visualize a performance de suas campanhas em tempo real
            </p>
          </div>
          {comparisonMode === "comparison" && (
            <Badge variant="secondary" className="ml-2">
              Modo Comparação
            </Badge>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <RefreshIndicator 
            lastUpdated={lastUpdated}
            isRefreshing={isRefreshing}
            onRefresh={refresh}
          />
        </div>
      </div>


      {/* Seletores de Períodos */}
      {comparisonMode === "comparison" ? (
        <>
          {/* Legenda Visual Global */}
          <Card className="bg-muted/50 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center justify-center gap-6 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-primary" />
                    <span className="font-medium">
                      {getPeriodLabel(period1)} (Principal)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-chart-orange opacity-60" />
                    <span className="font-medium text-muted-foreground">
                      {getPeriodLabel(period2)} (Comparação)
                    </span>
                  </div>
                </div>
                
                {/* Botão de retorno */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setComparisonMode("single")}
                  className="flex items-center gap-2 flex-shrink-0"
                >
                  ← Voltar para Período Único
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Seletores Duplos */}
          <Card className="border-primary/50 shadow-lg">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Período 1 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-primary" />
                    <h4 className="font-semibold">Período 1 (Principal)</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant={period1 === "today" ? "default" : "outline"} onClick={() => setPeriod1("today")}>Hoje</Button>
                    <Button size="sm" variant={period1 === "yesterday" ? "default" : "outline"} onClick={() => setPeriod1("yesterday")}>Ontem</Button>
                    <Button size="sm" variant={period1 === "7days" ? "default" : "outline"} onClick={() => setPeriod1("7days")}>7 dias</Button>
                    <Button size="sm" variant={period1 === "15days" ? "default" : "outline"} onClick={() => setPeriod1("15days")}>15 dias</Button>
                    <Button size="sm" variant={period1 === "30days" ? "default" : "outline"} onClick={() => setPeriod1("30days")}>30 dias</Button>
                    <Button size="sm" variant={period1 === "month" ? "default" : "outline"} onClick={() => setPeriod1("month")}>Este mês</Button>
                    <Button size="sm" variant={period1 === "lastMonth" ? "default" : "outline"} onClick={() => setPeriod1("lastMonth")}>Mês passado</Button>
                    <Button size="sm" variant={period1 === "custom" ? "default" : "outline"} onClick={() => setPeriod1("custom")}>
                      <CalendarIcon className="mr-1 h-4 w-4" />
                      Personalizado
                    </Button>
                  </div>
                  {period1 === "custom" && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !customStartDateP1 && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customStartDateP1 ? format(customStartDateP1, "dd/MM/yyyy") : "Data início"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={customStartDateP1} onSelect={setCustomStartDateP1} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <span className="text-muted-foreground">até</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !customEndDateP1 && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customEndDateP1 ? format(customEndDateP1, "dd/MM/yyyy") : "Data fim"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={customEndDateP1} onSelect={setCustomEndDateP1} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>

                {/* Período 2 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-chart-orange opacity-70" />
                    <h4 className="font-semibold text-muted-foreground">Período 2 (Comparação)</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant={period2 === "today" ? "default" : "outline"} onClick={() => setPeriod2("today")}>Hoje</Button>
                    <Button size="sm" variant={period2 === "yesterday" ? "default" : "outline"} onClick={() => setPeriod2("yesterday")}>Ontem</Button>
                    <Button size="sm" variant={period2 === "7days" ? "default" : "outline"} onClick={() => setPeriod2("7days")}>7 dias</Button>
                    <Button size="sm" variant={period2 === "15days" ? "default" : "outline"} onClick={() => setPeriod2("15days")}>15 dias</Button>
                    <Button size="sm" variant={period2 === "30days" ? "default" : "outline"} onClick={() => setPeriod2("30days")}>30 dias</Button>
                    <Button size="sm" variant={period2 === "month" ? "default" : "outline"} onClick={() => setPeriod2("month")}>Este mês</Button>
                    <Button size="sm" variant={period2 === "lastMonth" ? "default" : "outline"} onClick={() => setPeriod2("lastMonth")}>Mês passado</Button>
                    <Button size="sm" variant={period2 === "custom" ? "default" : "outline"} onClick={() => setPeriod2("custom")}>
                      <CalendarIcon className="mr-1 h-4 w-4" />
                      Personalizado
                    </Button>
                  </div>
                  {period2 === "custom" && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !customStartDateP2 && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customStartDateP2 ? format(customStartDateP2, "dd/MM/yyyy") : "Data início"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={customStartDateP2} onSelect={setCustomStartDateP2} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <span className="text-muted-foreground">até</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !customEndDateP2 && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customEndDateP2 ? format(customEndDateP2, "dd/MM/yyyy") : "Data fim"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={customEndDateP2} onSelect={setCustomEndDateP2} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-muted/30 p-4 rounded-lg border">
            {/* Botões de período - Esquerda */}
            <div className="flex flex-wrap gap-2 flex-1">
              <Button
                size="sm"
                variant={dateFilter === "today" ? "default" : "outline"}
                onClick={() => setDateFilter("today")}
              >
                Hoje
              </Button>
              <Button
                size="sm"
                variant={dateFilter === "yesterday" ? "default" : "outline"}
                onClick={() => setDateFilter("yesterday")}
              >
                Ontem
              </Button>
              <Button
                size="sm"
                variant={dateFilter === "7days" ? "default" : "outline"}
                onClick={() => setDateFilter("7days")}
              >
                7 dias
              </Button>
              <Button
                size="sm"
                variant={dateFilter === "15days" ? "default" : "outline"}
                onClick={() => setDateFilter("15days")}
              >
                15 dias
              </Button>
              <Button
                size="sm"
                variant={dateFilter === "30days" ? "default" : "outline"}
                onClick={() => setDateFilter("30days")}
              >
                30 dias
              </Button>
              <Button
                size="sm"
                variant={dateFilter === "month" ? "default" : "outline"}
                onClick={() => setDateFilter("month")}
              >
                Este mês
              </Button>
              <Button
                size="sm"
                variant={dateFilter === "lastMonth" ? "default" : "outline"}
                onClick={() => setDateFilter("lastMonth")}
              >
                Mês passado
              </Button>
              <Button
                size="sm"
                variant={dateFilter === "custom" ? "default" : "outline"}
                onClick={() => setDateFilter("custom")}
              >
                <CalendarIcon className="mr-1 h-4 w-4" />
                Personalizado
              </Button>
            </div>

            {/* Botões de Modo - Direita */}
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant={comparisonMode === "single" ? "default" : "outline"}
                onClick={() => setComparisonMode("single" as ComparisonMode)}
              >
                Período Único
              </Button>
              <Button
                size="sm"
                variant={(comparisonMode as string) === "comparison" ? "default" : "outline"}
                onClick={() => setComparisonMode("comparison" as ComparisonMode)}
              >
                Comparar Períodos
              </Button>
            </div>
          </div>

          {/* Calendários customizados */}
          {dateFilter === "custom" && (
            <div className="flex flex-wrap gap-2 mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal",
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
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal",
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
        </>
      )}

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
            <div className="text-3xl font-bold text-primary">
              {comparisonMode === "single" ? leadsMetrics.total : leadsMetricsP1.total}
            </div>
            
            {comparisonMode === "comparison" && (
              <div className="mt-2 space-y-1">
                {(() => {
                  const variation = calculateVariation(leadsMetricsP1.total, leadsMetricsP2.total);
                  return (
                    <>
                      <div className="flex items-center gap-2">
                        {variation >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-chart-green" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                        <span className={cn(
                          "text-sm font-semibold",
                          variation >= 0 ? "text-chart-green" : "text-destructive"
                        )}>
                          {variation >= 0 ? "+" : ""}{variation.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        vs {leadsMetricsP2.total} ({getPeriodLabel(period2)})
                      </p>
                    </>
                  );
                })()}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground mt-1">
              {comparisonMode === "single" ? "Todos os períodos" : getPeriodLabel(period1)}
            </p>
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
            <div className="text-3xl font-bold text-chart-green">
              {comparisonMode === "single" ? leadsMetrics.converted : leadsMetricsP1.converted}
            </div>
            
            {comparisonMode === "comparison" && (
              <div className="mt-2 space-y-1">
                {(() => {
                  const variation = calculateVariation(leadsMetricsP1.converted, leadsMetricsP2.converted);
                  return (
                    <>
                      <div className="flex items-center gap-2">
                        {variation >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-chart-green" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                        <span className={cn(
                          "text-sm font-semibold",
                          variation >= 0 ? "text-chart-green" : "text-destructive"
                        )}>
                          {variation >= 0 ? "+" : ""}{variation.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        vs {leadsMetricsP2.converted} ({getPeriodLabel(period2)})
                      </p>
                    </>
                  );
                })()}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground mt-1">
              {comparisonMode === "single" ? "Concluíram o funil" : getPeriodLabel(period1)}
            </p>
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
            <div className="text-3xl font-bold text-chart-orange">
              {comparisonMode === "single" ? leadsMetrics.conversionRate.toFixed(1) : leadsMetricsP1.conversionRate.toFixed(1)}%
            </div>
            
            {comparisonMode === "comparison" && (
              <div className="mt-2 space-y-1">
                {(() => {
                  const variation = leadsMetricsP1.conversionRate - leadsMetricsP2.conversionRate;
                  return (
                    <>
                      <div className="flex items-center gap-2">
                        {variation >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-chart-green" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                        <span className={cn(
                          "text-sm font-semibold",
                          variation >= 0 ? "text-chart-green" : "text-destructive"
                        )}>
                          {variation >= 0 ? "+" : ""}{variation.toFixed(1)}pp
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        vs {leadsMetricsP2.conversionRate.toFixed(1)}% ({getPeriodLabel(period2)})
                      </p>
                    </>
                  );
                })()}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground mt-1">
              {comparisonMode === "single" ? "Taxa média geral" : getPeriodLabel(period1)}
            </p>
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
              {(comparisonMode === "single" ? leadsMetrics.bySource : leadsMetricsP1.bySource)
                .slice(0, 2)
                .map((item, idx) => (
                  <div key={item.source} className="flex justify-between text-sm">
                    <span className="truncate mr-2 font-medium" style={{ color: CHART_COLORS[idx] }}>
                      {item.source}
                    </span>
                    <Badge variant="secondary" className="font-semibold">{item.count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção 1.5: Métricas de Engajamento */}
      {comparisonMode === "single" && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-chart-teal/10 to-chart-cyan/5 border-chart-teal/20 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  ⏱️ Tempo Médio até Conversão
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-chart-teal">
                {engagementMetrics.avgTimeToConversion > 0 
                  ? formatTime(engagementMetrics.avgTimeToConversion)
                  : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {engagementMetrics.convertedSessions} conversões registradas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-chart-indigo/10 to-chart-purple/5 border-chart-indigo/20 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  ⏱️ Tempo Médio de Engajamento
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-chart-indigo">
                {engagementMetrics.avgEngagementTime > 0 
                  ? formatTime(engagementMetrics.avgEngagementTime)
                  : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Todas as {engagementMetrics.totalSessions} sessões
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-chart-amber/10 to-chart-orange/5 border-chart-amber/20 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  📊 Taxa de Engajamento
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-chart-amber">
                {engagementMetrics.totalSessions > 0 
                  ? ((engagementMetrics.convertedSessions / engagementMetrics.totalSessions) * 100).toFixed(1)
                  : "0.0"}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {engagementMetrics.convertedSessions} de {engagementMetrics.totalSessions} sessões converteram
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Seção 2: Gráfico de Funil Interativo com Filtro de Campanhas - SEMPRE VISÍVEL */}
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Funil Comparativo de Campanhas</CardTitle>
                <CardDescription>
                  Filtre por workflow e selecione campanhas para comparar
                </CardDescription>
              </div>
            </div>
            
            {/* Filtro de Workflow - SEMPRE VISÍVEL */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-muted-foreground">Workflow:</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={selectedWorkflowId === "all" ? "default" : "outline"}
                  onClick={() => {
                    setSelectedWorkflowId("all");
                    saveSelectedWorkflow("all");
                  }}
                >
                  Todos os Workflows
                </Button>
                
                {workflows.map((workflow) => (
                  <Button
                    key={workflow.id}
                    size="sm"
                    variant={selectedWorkflowId === workflow.id ? "default" : "outline"}
                    onClick={() => {
                      setSelectedWorkflowId(workflow.id);
                      saveSelectedWorkflow(workflow.id);
                    }}
                  >
                    {workflow.name}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Filtro de Campanhas - SEMPRE VISÍVEL */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">
                  Campanhas:
                </label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const allCampaignIds = getFilteredCampaigns().map(c => c.id);
                      setSelectedCampaigns(allCampaignIds);
                      saveSelectedCampaigns(allCampaignIds);
                    }}
                  >
                    Selecionar Todas
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCampaigns([]);
                      saveSelectedCampaigns([]);
                    }}
                  >
                    Limpar Seleção
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {getFilteredCampaigns().length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhuma campanha encontrada para este workflow.
                  </p>
                ) : (
                  getFilteredCampaigns().map((campaign, idx) => (
                    <Badge 
                      key={campaign.id} 
                      variant={selectedCampaigns.includes(campaign.id) ? "default" : "outline"} 
                      className="cursor-pointer transition-all hover:scale-105" 
                      style={selectedCampaigns.includes(campaign.id) ? {
                        backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                        borderColor: CHART_COLORS[idx % CHART_COLORS.length]
                      } : {}} 
                      onClick={() => {
                        const newSelection = selectedCampaigns.includes(campaign.id) 
                          ? selectedCampaigns.filter(id => id !== campaign.id) 
                          : [...selectedCampaigns, campaign.id];
                        
                        setSelectedCampaigns(newSelection);
                        saveSelectedCampaigns(newSelection);
                      }}
                    >
                      {campaign.name}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {funnelData.length === 0 && funnelDataP1.length === 0 ? (
            // MENSAGEM DENTRO DO CARD, NÃO ESCONDENDO OS FILTROS
            <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
              <div className="text-center p-6 space-y-2">
                <p className="text-lg font-medium text-muted-foreground">
                  📊 Nenhum dado disponível
                </p>
                <p className="text-sm text-muted-foreground">
                  Selecione outro workflow ou crie campanhas com dados para visualizar o funil.
                </p>
              </div>
            </div>
          ) : (
            <>
              {comparisonMode === "comparison" ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Período 1 */}
                  <div className="border rounded-lg p-4 bg-primary/5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <h4 className="font-semibold text-lg">
                        {getPeriodLabel(period1)}
                      </h4>
                    </div>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processedFunnelP1}>
                          <defs>
                            {selectedCampaigns.map((_, idx) => (
                              <linearGradient key={`gradient-p1-${idx}`} id={`barGradient-p1-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.9} />
                                <stop offset="100%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.6} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis 
                            dataKey="stage" 
                            height={100}
                            interval={0}
                            tick={<CustomAxisTick data={processedFunnelP1} />}
                          />
                          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                          }} />
                          <Legend />
                          {selectedCampaigns.map((campaignId, idx) => {
                            const campaign = campaigns.find(c => c.id === campaignId);
                            return campaign ? (
                              <Bar 
                                key={campaignId} 
                                dataKey={campaign.name} 
                                fill={`url(#barGradient-p1-${idx})`} 
                                radius={[8, 8, 0, 0]}
                              />
                            ) : null;
                          })}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Período 2 */}
                  <div className="border rounded-lg p-4 bg-chart-orange/5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-chart-orange opacity-70" />
                      <h4 className="font-semibold text-lg text-muted-foreground">
                        {getPeriodLabel(period2)}
                      </h4>
                    </div>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processedFunnelP2}>
                          <defs>
                            {selectedCampaigns.map((_, idx) => (
                              <linearGradient key={`gradient-p2-${idx}`} id={`barGradient-p2-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.9} />
                                <stop offset="100%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.6} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis 
                            dataKey="stage" 
                            height={100}
                            interval={0}
                            tick={<CustomAxisTick data={processedFunnelP2} />}
                          />
                          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                          }} />
                          <Legend />
                          {selectedCampaigns.map((campaignId, idx) => {
                            const campaign = campaigns.find(c => c.id === campaignId);
                            return campaign ? (
                              <Bar 
                                key={campaignId} 
                                dataKey={campaign.name} 
                                fill={`url(#barGradient-p2-${idx})`}
                                radius={[8, 8, 0, 0]}
                              />
                            ) : null;
                          })}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparativeFunnelData}>
                      <defs>
                        {selectedCampaigns.map((_, idx) => <linearGradient key={`gradient-${idx}`} id={`barGradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.9} />
                            <stop offset="100%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.6} />
                          </linearGradient>)}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        dataKey="stage" 
                        height={100}
                        interval={0}
                        tick={<CustomAxisTick data={comparativeFunnelData} />}
                      />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }} />
                      <Legend />
                      {selectedCampaigns.map((campaignId, idx) => {
                        const campaign = campaigns.find(c => c.id === campaignId);
                        return campaign ? (
                          <Bar 
                            key={campaignId} 
                            dataKey={campaign.name} 
                            fill={`url(#barGradient-${idx})`} 
                            radius={[8, 8, 0, 0]}
                            label={<CustomBarLabel />}
                            style={{ filter: 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.15))' }}
                            onClick={(data) => {
                              if (data && data.stage === "Visitas") {
                                setSelectedUtmCampaign({ id: campaignId, name: campaign.name });
                                setUtmDialogOpen(true);
                              }
                            }}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          />
                        ) : null;
                      })}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {funnelData.length === 0 && funnelDataP1.length === 0 ? null : <>

          {/* Seção 3: Gráfico de Pizza - Comparativo de Campanhas Ativas */}
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Distribuição de Leads Completos por Campanha</CardTitle>
              <CardDescription>
                Visualização em pizza do desempenho relativo de cada campanha
              </CardDescription>
            </CardHeader>
            <CardContent>
              {comparisonMode === "comparison" ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Período 1 */}
                  <div className="border rounded-lg p-4 bg-primary/5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <h4 className="font-semibold text-lg">
                        {getPeriodLabel(period1)}
                      </h4>
                    </div>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <defs>
                            {campaignComparisonDataP1.map((_, idx) => <linearGradient key={`pieGradient-${idx}`} id={`pieGradient-${idx}`} x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={1} />
                                <stop offset="100%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.7} />
                              </linearGradient>)}
                          </defs>
                          <Pie 
                            data={campaignComparisonDataP1} 
                            cx="50%" 
                            cy="50%" 
                            labelLine={false} 
                            label={({name, percentage}) => `${name}: ${percentage.toFixed(1)}%`} 
                            outerRadius={100} 
                            innerRadius={50} 
                            fill="#8884d8" 
                            dataKey="value"
                            paddingAngle={3}
                          >
                            {campaignComparisonDataP1.map((_, index) => <Cell key={`cell-${index}`} fill={`url(#pieGradient-${index})`} />)}
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
                  </div>

                  {/* Período 2 */}
                  <div className="border rounded-lg p-4 bg-chart-orange/5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-chart-orange opacity-70" />
                      <h4 className="font-semibold text-lg text-muted-foreground">
                        {getPeriodLabel(period2)}
                      </h4>
                    </div>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={campaignComparisonDataP2} 
                            cx="50%" 
                            cy="50%" 
                            labelLine={false} 
                            label={({name, percentage}) => `${name}: ${percentage.toFixed(1)}%`} 
                            outerRadius={100} 
                            innerRadius={50} 
                            fill="#8884d8" 
                            dataKey="value"
                            paddingAngle={3}
                          >
                            {campaignComparisonDataP2.map((_, index) => <Cell key={`cell-${index}`} fill={`url(#pieGradient-${index})`} />)}
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
                  </div>
                </div>
              ) : (
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
              )}
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
              ) : comparisonMode === "comparison" ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Período 1 */}
                  <div className="border rounded-lg p-4 bg-primary/5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <h4 className="font-semibold">
                        {getPeriodLabel(period1)}
                      </h4>
                    </div>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyVisitsDataP1}>
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
                          />
                          <Legend iconType="line" />
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
                              />
                            ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Período 2 */}
                  <div className="border rounded-lg p-4 bg-chart-orange/5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-chart-orange opacity-70" />
                      <h4 className="font-semibold text-muted-foreground">
                        {getPeriodLabel(period2)}
                      </h4>
                    </div>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyVisitsDataP2}>
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
                          />
                          <Legend iconType="line" />
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
                              />
                            ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
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

          {comparisonMode === "comparison" ? (
            <>
              {/* Top 10 Fontes - Lado a Lado */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Período 1 */}
                <div className="border rounded-lg p-4 bg-primary/5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <h4 className="font-semibold">Top 10 Fontes - {getPeriodLabel(period1)}</h4>
                  </div>
                  <div className="h-[300px]">
                    {topUtmSourcesP1Data.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topUtmSourcesP1Data} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis dataKey="source" type="category" width={100} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                          }} />
                          <Bar dataKey="leads" fill="hsl(var(--chart-teal))" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        Nenhum dado de UTM disponível para este período
                      </div>
                    )}
                  </div>
                </div>

                {/* Período 2 */}
                <div className="border rounded-lg p-4 bg-chart-orange/5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-chart-orange opacity-70" />
                    <h4 className="font-semibold text-muted-foreground">Top 10 Fontes - {getPeriodLabel(period2)}</h4>
                  </div>
                  <div className="h-[300px]">
                    {topUtmSourcesP2Data.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topUtmSourcesP2Data} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis dataKey="source" type="category" width={100} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                          }} />
                          <Bar dataKey="leads" fill="hsl(var(--chart-orange))" fillOpacity={0.6} radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        Nenhum dado de UTM disponível para este período
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabelas Detalhadas - Lado a Lado */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Tabela Período 1 */}
                <div className="border rounded-lg p-4 bg-primary/5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <h4 className="font-semibold">Detalhamento - {getPeriodLabel(period1)}</h4>
                  </div>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Source</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Medium</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold">Leads</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredUtmDataP1.length > 0 ? (
                            filteredUtmDataP1.slice(0, 10).map((item, idx) => (
                              <tr key={idx} className="hover:bg-muted/50 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium">{item.source}</td>
                                <td className="px-4 py-3 text-sm text-muted-foreground">{item.medium}</td>
                                <td className="px-4 py-3 text-sm text-right font-semibold">{item.total}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                                Nenhum dado disponível para este período
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Tabela Período 2 */}
                <div className="border rounded-lg p-4 bg-chart-orange/5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-chart-orange opacity-70" />
                    <h4 className="font-semibold text-muted-foreground">Detalhamento - {getPeriodLabel(period2)}</h4>
                  </div>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Source</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Medium</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold">Leads</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredUtmDataP2.length > 0 ? (
                            filteredUtmDataP2.slice(0, 10).map((item, idx) => (
                              <tr key={idx} className="hover:bg-muted/50 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium">{item.source}</td>
                                <td className="px-4 py-3 text-sm text-muted-foreground">{item.medium}</td>
                                <td className="px-4 py-3 text-sm text-right font-semibold">{item.total}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                                Nenhum dado disponível para este período
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
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
              {comparisonMode === "comparison" ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Período 1 */}
                  <div className="border rounded-lg p-4 bg-primary/5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <h4 className="font-semibold">
                        {getPeriodLabel(period1)}
                      </h4>
                    </div>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={designMetricsP1.avgTimeByStage}>
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
                  </div>

                  {/* Período 2 */}
                  <div className="border rounded-lg p-4 bg-chart-orange/5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-chart-orange opacity-70" />
                      <h4 className="font-semibold text-muted-foreground">
                        {getPeriodLabel(period2)}
                      </h4>
                    </div>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={designMetricsP2.avgTimeByStage}>
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
                            fill="hsl(var(--chart-blue))" 
                            fillOpacity={0.6}
                            radius={[8, 8, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : (
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
              )}
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
            {comparisonMode === "comparison" ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Período 1 */}
                <div className="border rounded-lg p-4 bg-primary/5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <h4 className="font-semibold">
                      {getPeriodLabel(period1)}
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {designMetricsP1.designerPerformance.map((designer, idx) => (
                      <div 
                        key={designer.designer_id} 
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 font-bold text-sm">
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{designer.designer_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {designer.completed_tasks} tarefas
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {designer.efficiency_score}
                        </Badge>
                      </div>
                    ))}
                    {designMetricsP1.designerPerformance.length === 0 && (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        Nenhum dado disponível
                      </p>
                    )}
                  </div>
                </div>

                {/* Período 2 */}
                <div className="border rounded-lg p-4 bg-chart-orange/5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-chart-orange opacity-70" />
                    <h4 className="font-semibold text-muted-foreground">
                      {getPeriodLabel(period2)}
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {designMetricsP2.designerPerformance.map((designer, idx) => (
                      <div 
                        key={designer.designer_id} 
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-chart-orange/10 font-bold text-sm text-chart-orange">
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{designer.designer_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {designer.completed_tasks} tarefas
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {designer.efficiency_score}
                        </Badge>
                      </div>
                    ))}
                    {designMetricsP2.designerPerformance.length === 0 && (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        Nenhum dado disponível
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
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
            )}
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