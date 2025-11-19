import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown } from "lucide-react";

interface UtmBreakdown {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  count: number;
}

interface FunnelStageProps {
  title: string;
  total: number;
  data: UtmBreakdown[];
  color: "blue" | "purple" | "green" | "orange";
  parentTotal?: number;
}

const COLOR_MAPS = {
  blue: {
    bg: "bg-chart-blue/10",
    text: "text-chart-blue",
    progress: "bg-chart-blue",
  },
  purple: {
    bg: "bg-chart-purple/10",
    text: "text-chart-purple",
    progress: "bg-chart-purple",
  },
  green: {
    bg: "bg-chart-green/10",
    text: "text-chart-green",
    progress: "bg-chart-green",
  },
  orange: {
    bg: "bg-chart-orange/10",
    text: "text-chart-orange",
    progress: "bg-chart-orange",
  },
};

export const FunnelStage = ({ title, total, data, color, parentTotal }: FunnelStageProps) => {
  const colors = COLOR_MAPS[color];
  const conversionRate = parentTotal ? ((total / parentTotal) * 100).toFixed(1) : "100";
  
  // Sort data by count descending
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  return (
    <Card className={`${colors.bg} border-0`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className={`text-lg font-semibold ${colors.text}`}>{title}</h4>
            <p className="text-2xl font-bold text-foreground">{total.toLocaleString()}</p>
          </div>
          {parentTotal && (
            <Badge variant="secondary" className="text-base px-3 py-1">
              {conversionRate}%
              {parseFloat(conversionRate) >= 10 ? (
                <TrendingUp className="ml-1 h-4 w-4 inline text-chart-green" />
              ) : (
                <TrendingDown className="ml-1 h-4 w-4 inline text-chart-orange" />
              )}
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          {sortedData.map((item, idx) => {
            const percentage = (item.count / total) * 100;
            const utmLabel = `${item.utm_source || "direto"}${item.utm_medium ? ` / ${item.utm_medium}` : ""}${item.utm_campaign ? ` / ${item.utm_campaign}` : ""}`;
            
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">{utmLabel}</span>
                  <span className="font-semibold text-foreground">
                    {item.count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
          
          {sortedData.length === 0 && (
            <p className="text-center text-muted-foreground py-4">Nenhum dado disponível</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
