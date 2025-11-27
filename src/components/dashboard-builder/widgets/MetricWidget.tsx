import { Card } from "@/components/ui/card";
import { useDynamicQuery } from "@/hooks/useDynamicQuery";
import { Widget } from "@/types/dashboard";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MetricWidgetProps {
  widget: Widget;
  globalFilters?: any[];
}

export const MetricWidget = ({ widget, globalFilters = [] }: MetricWidgetProps) => {
  const { data, isLoading, error } = useDynamicQuery(widget.query_config, true, globalFilters);

  const formatValue = (value: number) => {
    const { format, prefix = "", suffix = "" } = widget.display_config;

    if (!value && value !== 0) return "-";

    let formatted = value.toString();

    switch (format) {
      case "currency":
        formatted = new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value);
        break;
      case "percent":
        formatted = `${value.toFixed(1)}%`;
        break;
      case "number":
        formatted = new Intl.NumberFormat("pt-BR").format(value);
        break;
    }

    return `${prefix}${formatted}${suffix}`;
  };

  const getIcon = () => {
    if (!widget.display_config.icon) return null;
    const IconComponent = (LucideIcons as any)[widget.display_config.icon];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : null;
  };

  if (isLoading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <p className="text-sm text-destructive">Erro ao carregar dados</p>
      </Card>
    );
  }

  const value = data?.value ?? 0;
  const { trend, description, gradient, color } = widget.display_config;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card 
            className={`p-6 transition-all hover:shadow-lg ${
              gradient ? 'bg-gradient-to-br from-background to-muted/20' : ''
            }`}
            style={
              gradient && color
                ? {
                    background: `linear-gradient(135deg, hsl(var(--background)) 0%, ${color}15 100%)`,
                  }
                : undefined
            }
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getIcon() && (
                  <div 
                    className="p-2 rounded-lg"
                    style={{
                      backgroundColor: color ? `${color}20` : 'hsl(var(--primary) / 0.1)',
                      color: color || 'hsl(var(--primary))',
                    }}
                  >
                    {getIcon()}
                  </div>
                )}
                <h3 className="text-sm font-medium text-muted-foreground">
                  {widget.display_config.title}
                </h3>
              </div>
            </div>

            <div className="space-y-2">
              <p 
                className="text-4xl font-bold"
                style={{ color: color || "hsl(var(--foreground))" }}
              >
                {formatValue(value)}
              </p>

              {trend && (
                <div className="flex items-center gap-1.5">
                  {trend.isPositive ? (
                    <TrendingUp className="h-4 w-4 text-chart-green" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-chart-red" />
                  )}
                  <span 
                    className={`text-sm font-medium ${
                      trend.isPositive ? 'text-chart-green' : 'text-chart-red'
                    }`}
                  >
                    {trend.value > 0 ? '+' : ''}{trend.value}%
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    vs período anterior
                  </span>
                </div>
              )}

              {description && (
                <p className="text-xs text-muted-foreground mt-2">
                  {description}
                </p>
              )}
            </div>
          </Card>
        </TooltipTrigger>
        {description && (
          <TooltipContent>
            <p className="max-w-xs">{description}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};
