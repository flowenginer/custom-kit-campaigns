import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FlowData {
  source: string;
  target: string;
  value: number;
}

interface SankeyFlowProps {
  data: FlowData[];
}

export const SankeyFlow = ({ data }: SankeyFlowProps) => {
  // Group by source (UTM)
  const sources = Array.from(new Set(data.map(d => d.source)));
  const targets = Array.from(new Set(data.map(d => d.target)));

  // Calculate totals for each source
  const sourceTotals = sources.reduce((acc, source) => {
    acc[source] = data.filter(d => d.source === source).reduce((sum, d) => sum + d.value, 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo: UTM → Segmento → Conversões</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sources.map((source) => {
            const sourceData = data.filter(d => d.source === source);
            const total = sourceTotals[source];
            
            return (
              <div key={source} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="font-semibold text-sm min-w-[120px]">{source}</div>
                  <div className="text-xs text-muted-foreground">({total} leads)</div>
                </div>
                
                <div className="ml-8 space-y-2">
                  {sourceData.map((flow, idx) => {
                    const percentage = (flow.value / total) * 100;
                    
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-full max-w-md">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">→ {flow.target}</span>
                            <span className="font-medium">{flow.value} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary rounded-full h-2 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          {data.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum fluxo de dados disponível para o período selecionado
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
