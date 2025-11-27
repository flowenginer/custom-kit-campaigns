import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DisplayConfig } from "@/types/dashboard";

interface ProgressWidgetProps {
  data: any[];
  config: DisplayConfig;
  isLoading?: boolean;
}

export const ProgressWidget = ({
  data,
  config,
  isLoading,
}: ProgressWidgetProps) => {
  const value = data?.[0]?.value || 0;
  const goal = config.goal || 100;
  const percentage = Math.min((value / goal) * 100, 100);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse"></div>
            <div className="h-4 bg-muted rounded animate-pulse w-20"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatNumber = (num: number) => {
    if (config.numberFormat === "currency") {
      return `R$ ${num.toFixed(config.decimalPlaces || 0)}`;
    }
    if (config.numberFormat === "percent") {
      return `${num.toFixed(config.decimalPlaces || 0)}%`;
    }
    return num.toFixed(config.decimalPlaces || 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={percentage} className="h-3" />
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">{formatNumber(value)}</span>
          <span className="text-muted-foreground">
            de {formatNumber(goal)} ({percentage.toFixed(0)}%)
          </span>
        </div>
        {config.description && (
          <p className="text-xs text-muted-foreground">{config.description}</p>
        )}
      </CardContent>
    </Card>
  );
};
