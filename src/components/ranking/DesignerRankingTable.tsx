import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface DesignerRankingTableProps {
  startDate: Date;
  endDate: Date;
  limit?: number;
}

interface DesignerStats {
  id: string;
  name: string;
  totalProduced: number;
  pending: number;
  inProgress: number;
  avgTimeMinutes: number;
  firstVersionApprovalRate: number;
}

export const DesignerRankingTable = ({ startDate, endDate, limit }: DesignerRankingTableProps) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['designer-ranking', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_tasks')
        .select(`
          id,
          assigned_to,
          assigned_at,
          completed_at,
          status,
          current_version,
          profiles!design_tasks_assigned_to_fkey(id, full_name)
        `)
        .not('assigned_to', 'is', null)
        .is('deleted_at', null)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // Agrupar por designer
      const grouped = data.reduce((acc: { [key: string]: DesignerStats }, task: any) => {
        const userId = task.assigned_to;
        const userName = task.profiles?.full_name || 'Desconhecido';

        if (!acc[userId]) {
          acc[userId] = {
            id: userId,
            name: userName,
            totalProduced: 0,
            pending: 0,
            inProgress: 0,
            avgTimeMinutes: 0,
            firstVersionApprovalRate: 0
          };
        }

        // Contar status
        if (task.status === 'pending') acc[userId].pending++;
        if (task.status === 'in_progress') acc[userId].inProgress++;
        
        // Contar produzidos (aprovados ou completados)
        if (task.status === 'approved' || task.status === 'completed') {
          acc[userId].totalProduced++;
          
          // Calcular tempo médio
          if (task.assigned_at && task.completed_at) {
            const start = new Date(task.assigned_at);
            const end = new Date(task.completed_at);
            const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
            
            acc[userId].avgTimeMinutes = acc[userId].avgTimeMinutes === 0 
              ? diffMinutes 
              : (acc[userId].avgTimeMinutes + diffMinutes) / 2;
          }
          
          // Taxa de aprovação na primeira versão
          if (task.current_version === 1) {
            acc[userId].firstVersionApprovalRate++;
          }
        }

        return acc;
      }, {});

      // Calcular taxa de aprovação em porcentagem
      Object.values(grouped).forEach(designer => {
        if (designer.totalProduced > 0) {
          designer.firstVersionApprovalRate = 
            Math.round((designer.firstVersionApprovalRate / designer.totalProduced) * 100);
        }
      });

      // Converter para array e ordenar por total produzido
      const sorted = Object.values(grouped).sort((a, b) => b.totalProduced - a.totalProduced);
      
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
        Nenhuma tarefa de designer encontrada no período
      </div>
    );
  }

  const getMedal = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Trophy className="h-5 w-5 text-amber-700" />;
    return <span className="text-muted-foreground">#{index + 1}</span>;
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Designer</TableHead>
            <TableHead className="text-right">Produzido</TableHead>
            <TableHead className="text-right">
              <Clock className="h-4 w-4 inline mr-1" />
              Tempo Médio
            </TableHead>
            <TableHead className="text-right">Pendente</TableHead>
            <TableHead className="text-right">Em Produção</TableHead>
            <TableHead className="text-right">
              <CheckCircle2 className="h-4 w-4 inline mr-1" />
              Aprovação 1ª
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.map((stat, index) => (
            <TableRow key={stat.id}>
              <TableCell className="font-medium">
                {getMedal(index)}
              </TableCell>
              <TableCell className="font-medium">{stat.name}</TableCell>
              <TableCell className="text-right">
                <Badge variant="secondary" className="font-bold">
                  {stat.totalProduced}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {stat.avgTimeMinutes > 0 ? formatTime(stat.avgTimeMinutes) : '-'}
              </TableCell>
              <TableCell className="text-right">
                {stat.pending > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {stat.pending}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {stat.inProgress > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    {stat.inProgress}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Badge 
                  variant={stat.firstVersionApprovalRate >= 80 ? "default" : "secondary"}
                  className="font-bold"
                >
                  {stat.firstVersionApprovalRate}%
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
