import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Activity, TrendingUp, Zap, AlertTriangle } from "lucide-react";

interface RealtimeData {
  activeLeads: number;
  bestConverter: { source: string; rate: number };
  hotCampaign: { name: string; count: number };
  warning: { source: string; rate: number };
}

export const RealtimeMetrics = () => {
  const [data, setData] = useState<RealtimeData>({
    activeLeads: 0,
    bestConverter: { source: "-", rate: 0 },
    hotCampaign: { name: "-", count: 0 },
    warning: { source: "-", rate: 0 },
  });

  const fetchRealtimeData = async () => {
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Active leads (últimas 24h)
      const { count: activeCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .gte("created_at", last24h);

      // Best converter
      const { data: converterData } = await supabase
        .from("leads")
        .select("utm_source, order_id")
        .gte("created_at", last24h)
        .not("utm_source", "is", null);

      const converterStats = converterData?.reduce((acc: any, lead) => {
        const source = lead.utm_source || "unknown";
        if (!acc[source]) acc[source] = { total: 0, converted: 0 };
        acc[source].total++;
        if (lead.order_id) acc[source].converted++;
        return acc;
      }, {});

      const bestConverter = Object.entries(converterStats || {})
        .map(([source, stats]: [string, any]) => ({
          source,
          rate: (stats.converted / stats.total) * 100,
        }))
        .sort((a, b) => b.rate - a.rate)[0] || { source: "-", rate: 0 };

      // Hot campaign
      const { data: campaignData } = await supabase
        .from("leads")
        .select("campaign_id, campaigns(name)")
        .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .not("campaign_id", "is", null);

      const campaignCounts = campaignData?.reduce((acc: any, lead) => {
        const name = (lead.campaigns as any)?.name || "unknown";
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});

      const hotCampaign = Object.entries(campaignCounts || {})
        .map(([name, count]) => ({ name, count: count as number }))
        .sort((a, b) => b.count - a.count)[0] || { name: "-", count: 0 };

      // Warning (0% conversion today)
      const today = new Date().toISOString().split("T")[0];
      const { data: warningData } = await supabase
        .from("leads")
        .select("utm_source, order_id")
        .gte("created_at", today)
        .not("utm_source", "is", null);

      const warningStats = warningData?.reduce((acc: any, lead) => {
        const source = lead.utm_source || "unknown";
        if (!acc[source]) acc[source] = { total: 0, converted: 0 };
        acc[source].total++;
        if (lead.order_id) acc[source].converted++;
        return acc;
      }, {});

      const warning = Object.entries(warningStats || {})
        .filter(([_, stats]: [string, any]) => stats.total >= 3 && stats.converted === 0)
        .map(([source, stats]: [string, any]) => ({
          source,
          rate: 0,
        }))[0] || { source: "-", rate: 0 };

      setData({
        activeLeads: activeCount || 0,
        bestConverter,
        hotCampaign,
        warning,
      });
    } catch (error) {
      console.error("Error fetching realtime data:", error);
    }
  };

  useEffect(() => {
    fetchRealtimeData();
    const interval = setInterval(fetchRealtimeData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Leads Ativos</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.activeLeads}</div>
          <p className="text-xs text-muted-foreground">últimas 24 horas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Melhor Conversor</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.bestConverter.source}</div>
          <p className="text-xs text-muted-foreground">
            {data.bestConverter.rate.toFixed(1)}% de conversão
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Campanha Quente</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold truncate">{data.hotCampaign.name}</div>
          <p className="text-xs text-muted-foreground">
            {data.hotCampaign.count} leads em 2h
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Atenção</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold truncate">{data.warning.source}</div>
          <p className="text-xs text-muted-foreground">
            {data.warning.rate === 0 && data.warning.source !== "-" 
              ? "0% conversão hoje" 
              : "Tudo normal"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
