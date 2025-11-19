import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Eye, UserCheck, CheckCircle2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface UtmStats {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  total_visits: number;
  leads_count: number;
  completed_count: number;
  conversion_rate: number;
  completion_rate: number;
}

interface UtmBreakdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
}

export function UtmBreakdownDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
}: UtmBreakdownDialogProps) {
  const [utmStats, setUtmStats] = useState<UtmStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totals, setTotals] = useState({
    visits: 0,
    leads: 0,
    completed: 0,
    conversionRate: 0,
  });

  useEffect(() => {
    if (open) {
      loadUtmData();
    }
  }, [open, campaignId]);

  const loadUtmData = async () => {
    setIsLoading(true);
    try {
      // 1. Buscar todas as visitas da campanha com UTMs
      const { data: visits, error: visitsError } = await supabase
        .from("funnel_events")
        .select("session_id, utm_source, utm_medium, utm_campaign")
        .eq("campaign_id", campaignId)
        .eq("event_type", "visit");

      if (visitsError) throw visitsError;

      // 2. Buscar leads relacionados às visitas
      const sessionIds = visits?.map((v) => v.session_id) || [];
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("session_id, completed")
        .eq("campaign_id", campaignId)
        .in("session_id", sessionIds);

      if (leadsError) throw leadsError;

      // 3. Criar mapa de sessions -> lead info
      const leadsMap = new Map(
        leads?.map((lead) => [lead.session_id, lead]) || []
      );

      // 4. Agrupar por combinação de UTMs
      const utmGroups = new Map<string, UtmStats>();

      visits?.forEach((visit) => {
        const source = visit.utm_source || "(direto)";
        const medium = visit.utm_medium || "(none)";
        const campaign = visit.utm_campaign || "(none)";
        const key = `${source}|${medium}|${campaign}`;

        if (!utmGroups.has(key)) {
          utmGroups.set(key, {
            utm_source: source,
            utm_medium: medium,
            utm_campaign: campaign,
            total_visits: 0,
            leads_count: 0,
            completed_count: 0,
            conversion_rate: 0,
            completion_rate: 0,
          });
        }

        const stats = utmGroups.get(key)!;
        stats.total_visits += 1;

        const lead = leadsMap.get(visit.session_id);
        if (lead) {
          stats.leads_count += 1;
          if (lead.completed) {
            stats.completed_count += 1;
          }
        }
      });

      // 5. Calcular taxas de conversão
      const statsArray = Array.from(utmGroups.values()).map((stat) => ({
        ...stat,
        conversion_rate: (stat.leads_count / stat.total_visits) * 100,
        completion_rate: (stat.completed_count / stat.total_visits) * 100,
      }));

      // 6. Ordenar por total de visitas (maior primeiro)
      statsArray.sort((a, b) => b.total_visits - a.total_visits);

      setUtmStats(statsArray);

      // 7. Calcular totais
      const totalVisits = statsArray.reduce((sum, s) => sum + s.total_visits, 0);
      const totalLeads = statsArray.reduce((sum, s) => sum + s.leads_count, 0);
      const totalCompleted = statsArray.reduce(
        (sum, s) => sum + s.completed_count,
        0
      );

      setTotals({
        visits: totalVisits,
        leads: totalLeads,
        completed: totalCompleted,
        conversionRate: totalVisits > 0 ? (totalLeads / totalVisits) * 100 : 0,
      });
    } catch (error) {
      console.error("Erro ao carregar UTMs:", error);
      toast.error("Erro ao carregar breakdown de UTMs");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "UTM Source",
      "UTM Medium",
      "UTM Campaign",
      "Visitas",
      "Leads",
      "Concluídos",
      "Taxa Conversão (%)",
      "Taxa Conclusão (%)",
    ];

    const rows = utmStats.map((stat) => [
      stat.utm_source,
      stat.utm_medium,
      stat.utm_campaign,
      stat.total_visits,
      stat.leads_count,
      stat.completed_count,
      stat.conversion_rate.toFixed(2),
      stat.completion_rate.toFixed(2),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `utm-breakdown-${campaignName}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado com sucesso!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            📊 Breakdown de UTMs - {campaignName}
          </DialogTitle>
          <DialogDescription>
            Análise detalhada de visitas, leads e conversões por origem de tráfego
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-chart-purple/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Visitas
                      </p>
                      <p className="text-3xl font-bold text-primary">
                        {totals.visits}
                      </p>
                    </div>
                    <Eye className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-chart-blue/10 to-chart-cyan/5 border-chart-blue/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Leads
                      </p>
                      <p className="text-3xl font-bold text-chart-blue">
                        {totals.leads}
                      </p>
                    </div>
                    <UserCheck className="h-8 w-8 text-chart-blue opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-chart-green/10 to-success/5 border-chart-green/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Concluídos
                      </p>
                      <p className="text-3xl font-bold text-chart-green">
                        {totals.completed}
                      </p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-chart-green opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-chart-orange/10 to-chart-amber/5 border-chart-orange/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Conversão
                      </p>
                      <p className="text-3xl font-bold text-chart-orange">
                        {totals.conversionRate.toFixed(1)}%
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-chart-orange opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabela Detalhada */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Detalhamento por UTM</h3>
                  <Button onClick={exportToCSV} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </Button>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>UTM Source</TableHead>
                        <TableHead>UTM Medium</TableHead>
                        <TableHead>UTM Campaign</TableHead>
                        <TableHead className="text-right">Visitas</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">Concluídos</TableHead>
                        <TableHead className="text-right">Taxa Conv.</TableHead>
                        <TableHead className="text-right">Taxa Concl.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {utmStats.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center text-muted-foreground py-8"
                          >
                            Nenhum dado de UTM encontrado para esta campanha
                          </TableCell>
                        </TableRow>
                      ) : (
                        utmStats.map((stat, idx) => {
                          const isDirect =
                            stat.utm_source === "(direto)" ||
                            stat.utm_source === null;
                          return (
                            <TableRow
                              key={idx}
                              className={
                                isDirect ? "bg-yellow-50/50 dark:bg-yellow-950/20" : ""
                              }
                            >
                              <TableCell className="font-medium">
                                {stat.utm_source}
                                {isDirect && (
                                  <Badge
                                    variant="outline"
                                    className="ml-2 text-yellow-700 border-yellow-300"
                                  >
                                    Sem rastreamento
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{stat.utm_medium}</TableCell>
                              <TableCell>{stat.utm_campaign}</TableCell>
                              <TableCell className="text-right font-mono">
                                {stat.total_visits}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {stat.leads_count}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {stat.completed_count}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge
                                  variant={
                                    stat.conversion_rate >= 20
                                      ? "default"
                                      : stat.conversion_rate >= 10
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className={
                                    stat.conversion_rate >= 20
                                      ? "bg-chart-green"
                                      : stat.conversion_rate >= 10
                                      ? "bg-chart-blue"
                                      : ""
                                  }
                                >
                                  {stat.conversion_rate.toFixed(1)}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge
                                  variant={
                                    stat.completion_rate >= 10
                                      ? "default"
                                      : stat.completion_rate >= 5
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className={
                                    stat.completion_rate >= 10
                                      ? "bg-chart-purple"
                                      : stat.completion_rate >= 5
                                      ? "bg-chart-orange"
                                      : ""
                                  }
                                >
                                  {stat.completion_rate.toFixed(1)}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {utmStats.some(
                  (s) => s.utm_source === "(direto)" || s.utm_source === null
                ) && (
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ <strong>Tráfego sem rastreamento detectado:</strong>{" "}
                      Algumas visitas não possuem UTMs. Adicione parâmetros UTM
                      aos seus links de campanha para rastrear a origem do
                      tráfego.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
