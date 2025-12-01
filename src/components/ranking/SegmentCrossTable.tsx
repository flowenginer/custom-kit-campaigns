import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatSegmentTag } from "@/lib/utils";

interface SegmentCrossTableProps {
  startDate: Date;
  endDate: Date;
  type: 'salesperson' | 'designer';
}

interface CrossData {
  userName: string;
  segments: { [key: string]: number };
  total: number;
}

export const SegmentCrossTable = ({ startDate, endDate, type }: SegmentCrossTableProps) => {
  // Buscar segmentos de negócio para mapeamento
  const { data: businessSegments } = useQuery({
    queryKey: ['business-segments-map'],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_segments')
        .select('id, name, icon');
      return data || [];
    }
  });

  const { data, isLoading } = useQuery({
    queryKey: ['segment-cross', startDate, endDate, type],
    queryFn: async () => {
      const userField = type === 'salesperson' ? 'created_by' : 'assigned_to';
      const profileField = type === 'salesperson' 
        ? 'profiles!design_tasks_created_by_fkey' 
        : 'profiles!design_tasks_assigned_to_fkey';

      const query = supabase
        .from('design_tasks')
        .select(`
          id,
          ${userField},
          campaign_id,
          lead_id,
          campaigns(name, segment_tag),
          leads(business_segment_id, business_segment_other),
          ${profileField}(id, full_name)
        `)
        .is('deleted_at', null)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (type === 'salesperson') {
        query.eq('created_by_salesperson', true);
      } else {
        query.not('assigned_to', 'is', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Criar mapa de business segments
      const segmentMap = new Map(businessSegments?.map(s => [s.id, { name: s.name, icon: s.icon }]) || []);

      // Agrupar dados
      const grouped: { [key: string]: CrossData } = {};
      const allSegments = new Set<string>();

      data.forEach((task: any) => {
        const userId = task[userField];
        const userName = (task as any).profiles?.full_name || 'Desconhecido';
        
        // Determinar o segmento real
        let segmentName: string;
        const lead = task.leads;
        const campaignSegmentTag = task.campaigns?.segment_tag;
        
        // Se for Adventure e tiver business_segment, usar ele
        if (campaignSegmentTag === 'adventure_' && lead) {
          if (lead.business_segment_id && segmentMap.has(lead.business_segment_id)) {
            const segment = segmentMap.get(lead.business_segment_id)!;
            segmentName = `${segment.icon} ${segment.name}`;
          } else if (lead.business_segment_other) {
            segmentName = `📦 ${lead.business_segment_other}`;
          } else {
            segmentName = formatSegmentTag(campaignSegmentTag);
          }
        } else {
          segmentName = formatSegmentTag(campaignSegmentTag);
        }

        allSegments.add(segmentName);

        if (!grouped[userId]) {
          grouped[userId] = {
            userName,
            segments: {},
            total: 0
          };
        }

        grouped[userId].segments[segmentName] = 
          (grouped[userId].segments[segmentName] || 0) + 1;
        grouped[userId].total++;
      });

      // Ordenar usuários por total
      const sortedUsers = Object.values(grouped).sort((a, b) => b.total - a.total);

      return {
        users: sortedUsers,
        segments: Array.from(allSegments).sort()
      };
    },
    enabled: !!businessSegments
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {type === 'salesperson' ? 'Vendedores' : 'Designers'} × Segmentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhum dado encontrado no período
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {type === 'salesperson' ? '👥 Vendedores' : '🎨 Designers'} × Segmentos
        </CardTitle>
        <CardDescription>
          Cruzamento de {type === 'salesperson' ? 'solicitações' : 'produções'} por segmento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">
                  {type === 'salesperson' ? 'Vendedor' : 'Designer'}
                </TableHead>
                {data.segments.map(segment => (
                  <TableHead key={segment} className="text-right">
                    {segment}
                  </TableHead>
                ))}
                <TableHead className="text-right font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.map((user) => (
                <TableRow key={user.userName}>
                  <TableCell className="font-medium">{user.userName}</TableCell>
                  {data.segments.map(segment => {
                    const count = user.segments[segment] || 0;
                    return (
                      <TableCell key={segment} className="text-right">
                        {count > 0 ? (
                          <Badge variant="secondary">{count}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right">
                    <Badge className="font-bold">{user.total}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Linha de totais */}
              <TableRow className="font-bold bg-muted/50">
                <TableCell>TOTAL</TableCell>
                {data.segments.map(segment => {
                  const total = data.users.reduce(
                    (sum, user) => sum + (user.segments[segment] || 0), 
                    0
                  );
                  return (
                    <TableCell key={segment} className="text-right">
                      <Badge variant="default">{total}</Badge>
                    </TableCell>
                  );
                })}
                <TableCell className="text-right">
                  <Badge variant="default" className="text-lg">
                    {data.users.reduce((sum, user) => sum + user.total, 0)}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
