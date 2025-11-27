import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDynamicQuery } from "@/hooks/useDynamicQuery";
import { Widget } from "@/types/dashboard";
import { Loader2 } from "lucide-react";

interface ProgressWidgetProps {
  widget: Widget;
  globalFilters?: any[];
}

export const ProgressWidget = ({ widget, globalFilters = [] }: ProgressWidgetProps) => {
  const { data, isLoading, error } = useDynamicQuery(widget.query_config, true, globalFilters);

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
  const target = widget.display_config.target || 100;
  const percentage = Math.min((value / target) * 100, 100);

  const { description, gradient, color } = widget.display_config;

  return (
    <Card 
      className={`p-6 transition-all hover:shadow-md ${
        gradient ? 'bg-gradient-to-br from-background to-muted/10' : ''
      }`}
      style={
        gradient && color
          ? {
              background: `linear-gradient(135deg, hsl(var(--background)) 0%, ${color}10 100%)`,
            }
          : undefined
      }
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {widget.display_config.title}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold" style={{ color: color || 'hsl(var(--foreground))' }}>
            {value.toLocaleString("pt-BR")}
          </span>
          <span className="text-lg text-muted-foreground">
            / {target.toLocaleString("pt-BR")}
          </span>
        </div>

        <div className="space-y-2">
          <Progress 
            value={percentage} 
            className="h-3"
            style={
              color
                ? {
                    '--progress-color': color,
                  } as React.CSSProperties
                : undefined
            }
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {percentage.toFixed(1)}% concluído
            </span>
            {percentage >= 100 ? (
              <span className="text-chart-green font-medium">✓ Meta atingida</span>
            ) : (
              <span className="text-muted-foreground">
                Faltam {(target - value).toLocaleString("pt-BR")}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
