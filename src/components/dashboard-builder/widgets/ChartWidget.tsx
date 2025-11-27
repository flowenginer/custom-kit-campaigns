import { Card } from "@/components/ui/card";
import { useDynamicQuery } from "@/hooks/useDynamicQuery";
import { Widget } from "@/types/dashboard";
import { Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartWidgetProps {
  widget: Widget;
  globalFilters?: any[];
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export const ChartWidget = ({ widget, globalFilters = [] }: ChartWidgetProps) => {
  const { data, isLoading, error } = useDynamicQuery(widget.query_config, true, globalFilters);

  if (isLoading) {
    return (
      <Card className="p-6 flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 flex items-center justify-center h-full">
        <p className="text-sm text-destructive">Erro ao carregar dados</p>
      </Card>
    );
  }

  const chartData = data?.data || [];
  const { chartType = "bar", showLegend = true, showGrid = true } = widget.display_config;

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return (
          <BarChart data={chartData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            {showLegend && <Legend />}
            <Bar dataKey="value" fill={widget.display_config.color || COLORS[0]} />
          </BarChart>
        );
      case "line":
        return (
          <LineChart data={chartData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            {showLegend && <Legend />}
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={widget.display_config.color || COLORS[0]} 
            />
          </LineChart>
        );
      case "area":
        return (
          <AreaChart data={chartData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            {showLegend && <Legend />}
            <Area 
              type="monotone" 
              dataKey="value" 
              fill={widget.display_config.color || COLORS[0]} 
              stroke={widget.display_config.color || COLORS[0]} 
            />
          </AreaChart>
        );
      case "pie":
      case "donut":
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={chartType === "donut" ? 60 : 0}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label
            >
              {chartData.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            {showLegend && <Legend />}
          </PieChart>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="p-6 h-full flex flex-col">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        {widget.display_config.title}
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
