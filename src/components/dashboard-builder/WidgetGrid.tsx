import { Widget } from "@/types/dashboard";
import { MetricWidget } from "./widgets/MetricWidget";
import { ChartWidget } from "./widgets/ChartWidget";
import { TableWidget } from "./widgets/TableWidget";
import { ProgressWidget } from "./widgets/ProgressWidget";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

interface WidgetGridProps {
  widgets: Widget[];
  onEdit?: (widget: Widget) => void;
  onDelete?: (widgetId: string) => void;
}

export const WidgetGrid = ({ widgets, onEdit, onDelete }: WidgetGridProps) => {
  const renderWidget = (widget: Widget) => {
    switch (widget.type) {
      case "metric":
        return <MetricWidget widget={widget} />;
      case "chart":
        return <ChartWidget widget={widget} />;
      case "table":
        return <TableWidget widget={widget} />;
      case "progress":
        return <ProgressWidget widget={widget} />;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {widgets.map((widget) => (
        <div
          key={widget.id}
          className="relative group"
          style={{
            gridColumn: `span ${widget.position?.w || 1}`,
            gridRow: `span ${widget.position?.h || 1}`,
          }}
        >
          {renderWidget(widget)}
          
          {(onEdit || onDelete) && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              {onEdit && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7"
                  onClick={() => onEdit(widget)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-7 w-7"
                  onClick={() => onDelete(widget.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
