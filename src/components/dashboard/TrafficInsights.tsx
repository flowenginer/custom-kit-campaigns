import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TrendingUp, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface TrafficInsight {
  type: "success" | "warning" | "danger" | "info";
  title: string;
  description: string;
  recommendation?: string;
}

interface TrafficInsightsProps {
  insights: TrafficInsight[];
}

const INSIGHT_STYLES = {
  success: {
    icon: CheckCircle,
    className: "border-chart-green bg-chart-green/5",
    iconClassName: "text-chart-green",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-chart-orange bg-chart-orange/5",
    iconClassName: "text-chart-orange",
  },
  danger: {
    icon: XCircle,
    className: "border-chart-red bg-chart-red/5",
    iconClassName: "text-chart-red",
  },
  info: {
    icon: TrendingUp,
    className: "border-chart-blue bg-chart-blue/5",
    iconClassName: "text-chart-blue",
  },
};

export const TrafficInsights = ({ insights }: TrafficInsightsProps) => {
  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">💡 Insights Automáticos</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {insights.map((insight, idx) => {
          const style = INSIGHT_STYLES[insight.type];
          const Icon = style.icon;

          return (
            <Alert key={idx} className={style.className}>
              <Icon className={`h-5 w-5 ${style.iconClassName}`} />
              <AlertTitle className="font-semibold">{insight.title}</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="text-sm">{insight.description}</p>
                {insight.recommendation && (
                  <p className="text-sm font-medium mt-2 text-foreground">
                    💡 {insight.recommendation}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          );
        })}
      </div>
    </div>
  );
};
