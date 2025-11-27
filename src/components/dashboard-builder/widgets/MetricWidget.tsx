import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DisplayConfig } from "@/types/dashboard";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricWidgetProps {
  data: any[];
  config: DisplayConfig;
  isLoading?: boolean;
}

export const MetricWidget = ({ data, config, isLoading }: MetricWidgetProps) => {
  const formatNumber = (value: number) => {
    if (!value && value !== 0) return "—";

    const formatted = value.toFixed(config.decimalPlaces || 0);

    switch (config.numberFormat) {
      case "currency":
        return `R$ ${formatted}`;
      case "percent":
        return `${formatted}%`;
      default:
        return formatted;
    }
  };

  const value = data?.[0]?.value || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-24"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{formatNumber(value)}</span>
          {config.goal && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              {value >= config.goal ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              de {formatNumber(config.goal)}
            </span>
          )}
        </div>
        {config.description && (
          <p className="text-sm text-muted-foreground mt-2">{config.description}</p>
        )}
      </CardContent>
    </Card>
  );
};
