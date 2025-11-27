import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { DisplayConfig } from "@/types/dashboard";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface ChartWidgetProps {
  data: any[];
  config: DisplayConfig;
  groupByField?: string;
  isLoading?: boolean;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export const ChartWidget = ({
  data,
  config,
  groupByField,
  isLoading,
}: ChartWidgetProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = data.reduce((acc, item, index) => {
    const key = item[groupByField || "name"] || `item${index}`;
    acc[key] = {
      label: String(key),
      color: config.colors?.[index] || COLORS[index % COLORS.length],
    };
    return acc;
  }, {} as any);

  const renderChart = () => {
    switch (config.chartType) {
      case "bar":
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={groupByField}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            {config.showTooltip !== false && (
              <ChartTooltip content={<ChartTooltipContent />} />
            )}
            {config.showLegend && <ChartLegend content={<ChartLegendContent />} />}
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case "line":
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={groupByField}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            {config.showTooltip !== false && (
              <ChartTooltip content={<ChartTooltipContent />} />
            )}
            {config.showLegend && <ChartLegend content={<ChartLegendContent />} />}
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
            />
          </LineChart>
        );

      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={groupByField}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            {config.showTooltip !== false && (
              <ChartTooltip content={<ChartTooltipContent />} />
            )}
            {config.showLegend && <ChartLegend content={<ChartLegendContent />} />}
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
            />
          </AreaChart>
        );

      case "pie":
      case "donut":
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey={groupByField}
              cx="50%"
              cy="50%"
              innerRadius={config.chartType === "donut" ? 60 : 0}
              outerRadius={80}
              label
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={config.colors?.[index] || COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            {config.showTooltip !== false && (
              <ChartTooltip content={<ChartTooltipContent />} />
            )}
            {config.showLegend && <ChartLegend content={<ChartLegendContent />} />}
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
        {config.description && (
          <p className="text-xs text-muted-foreground">{config.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          {renderChart()}
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
