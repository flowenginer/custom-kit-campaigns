import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSegmentTag } from "@/lib/utils";

interface ProductionChartsProps {
  startDate: Date;
  endDate: Date;
}

const COLORS = [
  '#4F9CF9', '#34A853', '#F9844A', '#9B87F5', '#F97316', '#06B6D4',
  '#EC4899', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1',
  '#14B8A6', '#84CC16', '#A855F7', '#3B82F6'
];

export const ProductionCharts = ({ startDate, endDate }: ProductionChartsProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['production-charts', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_tasks')
        .select(`
          id,
          created_at,
          completed_at,
          status,
          campaign_id,
          campaigns(name, segment_tag)
        `)
        .is('deleted_at', null)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // 1. Evolução temporal (solicitações vs entregas por dia)
      const dailyData: { [key: string]: { date: string; solicitacoes: number; entregas: number } } = {};
      
      data.forEach(task => {
        const date = new Date(task.created_at).toLocaleDateString('pt-BR');
        
        if (!dailyData[date]) {
          dailyData[date] = { date, solicitacoes: 0, entregas: 0 };
        }
        
        dailyData[date].solicitacoes++;
        
        if (task.completed_at && (task.status === 'approved' || task.status === 'completed')) {
          const completedDate = new Date(task.completed_at).toLocaleDateString('pt-BR');
          if (!dailyData[completedDate]) {
            dailyData[completedDate] = { date: completedDate, solicitacoes: 0, entregas: 0 };
          }
          dailyData[completedDate].entregas++;
        }
      });

      const timelineData = Object.values(dailyData).sort((a, b) => 
        new Date(a.date.split('/').reverse().join('-')).getTime() - 
        new Date(b.date.split('/').reverse().join('-')).getTime()
      );

      // 2. Distribuição por segmento
      const segmentData: { [key: string]: number } = {};
      
      data.forEach(task => {
        const segment = formatSegmentTag(task.campaigns?.segment_tag);
        segmentData[segment] = (segmentData[segment] || 0) + 1;
      });

      const pieData = Object.entries(segmentData)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // 3. Status distribution
      const statusData: { [key: string]: number } = {};
      data.forEach(task => {
        statusData[task.status] = (statusData[task.status] || 0) + 1;
      });

      const statusLabels: { [key: string]: string } = {
        'pending': 'Pendente',
        'in_progress': 'Em Produção',
        'awaiting_approval': 'Aguardando Aprovação',
        'approved': 'Aprovado',
        'changes_requested': 'Alterações Solicitadas',
        'completed': 'Concluído'
      };

      const statusBarData = Object.entries(statusData).map(([status, count]) => ({
        status: statusLabels[status] || status,
        count
      }));

      return {
        timeline: timelineData,
        segments: pieData,
        status: statusBarData
      };
    }
  });

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        {[1, 2].map(i => (
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
    );
  }

  if (!data) return null;

  const chartConfig = {
    solicitacoes: {
      label: "Solicitações",
      color: "#4F9CF9"
    },
    entregas: {
      label: "Entregas",
      color: "#34A853"
    }
  };

  return (
    <div className="space-y-6">
      {/* Evolução Temporal */}
      <Card>
        <CardHeader>
          <CardTitle>📈 Evolução Temporal</CardTitle>
          <CardDescription>Solicitações vs Entregas por dia</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.timeline}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="solicitacoes" 
                  stroke="#4F9CF9" 
                  strokeWidth={2}
                  name="Solicitações"
                />
                <Line 
                  type="monotone" 
                  dataKey="entregas" 
                  stroke="#34A853" 
                  strokeWidth={2}
                  name="Entregas"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Distribuição por Segmento - Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle>🥧 Distribuição por Segmento</CardTitle>
            <CardDescription>Proporção de tarefas por segmento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={data.segments}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.segments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      formatter={(value: number, name: string) => [`${value} tarefas`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Total no centro */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {data.segments.reduce((acc, s) => acc + s.value, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>
              </div>
              
              {/* Legenda lateral */}
              <div className="flex-1 space-y-1.5 max-h-[200px] overflow-y-auto">
                {data.segments.map((segment, index) => (
                  <div key={segment.name} className="flex items-center gap-2 text-sm">
                    <div 
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="truncate flex-1 text-foreground">{segment.name}</span>
                    <span className="font-medium text-muted-foreground">{segment.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status das Tarefas */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Status das Tarefas</CardTitle>
            <CardDescription>Distribuição por status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.status}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="status" 
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis className="text-xs" />
                <ChartTooltip />
                <Bar dataKey="count" fill="#4F9CF9" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
