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

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          {widget.display_config.title}
        </h3>
        <span className="text-2xl font-bold">
          {value.toLocaleString("pt-BR")} / {target.toLocaleString("pt-BR")}
        </span>
      </div>
      <Progress value={percentage} className="h-3" />
      <p className="text-xs text-muted-foreground mt-2 text-right">
        {percentage.toFixed(1)}% concluído
      </p>
    </Card>
  );
};
