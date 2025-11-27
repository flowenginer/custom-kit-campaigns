import { Card } from "@/components/ui/card";
import { useDynamicQuery } from "@/hooks/useDynamicQuery";
import { Widget } from "@/types/dashboard";
import { Loader2 } from "lucide-react";

interface MetricWidgetProps {
  widget: Widget;
}

export const MetricWidget = ({ widget }: MetricWidgetProps) => {
  const { data, isLoading, error } = useDynamicQuery(widget.query_config);

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

  return (
    <Card className="p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        {widget.display_config.title}
      </h3>
      <p 
        className="text-4xl font-bold"
        style={{ color: widget.display_config.color || "hsl(var(--foreground))" }}
      >
        {formatValue(value)}
      </p>
    </Card>
  );
};
