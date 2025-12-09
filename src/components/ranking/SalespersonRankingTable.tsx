import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { formatSegmentTag } from "@/lib/utils";

interface SalespersonRankingTableProps {
  startDate: Date;
  endDate: Date;
  limit?: number;
}

interface SalespersonStats {
  id: string;
  name: string;
  total: number;
  firstThird: number;
  middleThird: number;
  lastThird: number;
  segments: { [key: string]: number };
}

const formatPeriodLabel = (start: Date, end: Date) => {
  const formatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
};

export const SalespersonRankingTable = ({ startDate, endDate, limit }: SalespersonRankingTableProps) => {
  // Calcular os breakpoints dos terços
  const periodDuration = endDate.getTime() - startDate.getTime();
  const oneThird = periodDuration / 3;
  
  const firstThirdEnd = new Date(startDate.getTime() + oneThird);
  const secondThirdEnd = new Date(startDate.getTime() + oneThird * 2);

  // Labels dinâmicos para as colunas
  const firstThirdLabel = formatPeriodLabel(startDate, firstThirdEnd);
  const middleThirdLabel = formatPeriodLabel(firstThirdEnd, secondThirdEnd);
  const lastThirdLabel = formatPeriodLabel(secondThirdEnd, endDate);

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
          campaigns(name, segment_tag),
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
        const segmentName = formatSegmentTag(task.campaigns?.segment_tag);
        const taskDate = new Date(task.created_at);

        if (!acc[userId]) {
          acc[userId] = {
            id: userId,
            name: userName,
            total: 0,
            firstThird: 0,
            middleThird: 0,
            lastThird: 0,
            segments: {}
          };
        }

        acc[userId].total++;
        
        // Classificar em qual terço a task se encaixa
        if (taskDate >= secondThirdEnd) {
          acc[userId].lastThird++;
        } else if (taskDate >= firstThirdEnd) {
          acc[userId].middleThird++;
        } else {
          acc[userId].firstThird++;
        }

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
            <TableHead className="text-right text-xs">{firstThirdLabel}</TableHead>
            <TableHead className="text-right text-xs">{middleThirdLabel}</TableHead>
            <TableHead className="text-right text-xs">{lastThirdLabel}</TableHead>
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
                <TableCell className="text-right">{stat.firstThird}</TableCell>
                <TableCell className="text-right">{stat.middleThird}</TableCell>
                <TableCell className="text-right">{stat.lastThird}</TableCell>
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
