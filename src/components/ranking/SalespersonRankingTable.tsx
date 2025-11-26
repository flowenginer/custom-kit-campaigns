import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp } from "lucide-react";

interface SalespersonRankingTableProps {
  startDate: Date;
  endDate: Date;
  limit?: number;
}

interface SalespersonStats {
  id: string;
  name: string;
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  segments: { [key: string]: number };
}

export const SalespersonRankingTable = ({ startDate, endDate, limit }: SalespersonRankingTableProps) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['salesperson-ranking', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_tasks')
        .select(`
          id,
          created_at,
          created_by,
          campaign_id,
          campaigns(name, segment_id, segments(name)),
          profiles!design_tasks_created_by_fkey(id, full_name)
        `)
        .eq('created_by_salesperson', true)
        .is('deleted_at', null)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // Agrupar por vendedor
      const grouped = data.reduce((acc: { [key: string]: SalespersonStats }, task: any) => {
        const userId = task.created_by;
        const userName = task.profiles?.full_name || 'Desconhecido';
        const segmentName = task.campaigns?.segments?.name || 'Sem Segmento';
        const taskDate = new Date(task.created_at);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        if (!acc[userId]) {
          acc[userId] = {
            id: userId,
            name: userName,
            total: 0,
            today: 0,
            thisWeek: 0,
            thisMonth: 0,
            segments: {}
          };
        }

        acc[userId].total++;
        
        if (taskDate >= today) acc[userId].today++;
        if (taskDate >= weekAgo) acc[userId].thisWeek++;
        if (taskDate >= monthStart) acc[userId].thisMonth++;

        acc[userId].segments[segmentName] = (acc[userId].segments[segmentName] || 0) + 1;

        return acc;
      }, {});

      // Converter para array e ordenar
      const sorted = Object.values(grouped).sort((a, b) => b.total - a.total);
      
      return limit ? sorted.slice(0, limit) : sorted;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (!stats || stats.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma solicitação encontrada no período
      </div>
    );
  }

  const getMedal = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Trophy className="h-5 w-5 text-amber-700" />;
    return <span className="text-muted-foreground">#{index + 1}</span>;
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Hoje</TableHead>
            <TableHead className="text-right">Semana</TableHead>
            <TableHead className="text-right">Mês</TableHead>
            <TableHead>Principais Segmentos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.map((stat, index) => {
            const topSegments = Object.entries(stat.segments)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3);

            return (
              <TableRow key={stat.id}>
                <TableCell className="font-medium">
                  {getMedal(index)}
                </TableCell>
                <TableCell className="font-medium">{stat.name}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary" className="font-bold">
                    {stat.total}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{stat.today}</TableCell>
                <TableCell className="text-right">{stat.thisWeek}</TableCell>
                <TableCell className="text-right">{stat.thisMonth}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {topSegments.map(([segment, count]) => (
                      <Badge key={segment} variant="outline" className="text-xs">
                        {segment}: {count}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
