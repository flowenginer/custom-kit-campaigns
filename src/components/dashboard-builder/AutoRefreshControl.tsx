import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AutoRefreshControlProps {
  enabled: boolean;
  interval: number;
  lastUpdated: Date;
  isRefreshing: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onIntervalChange: (interval: number) => void;
  onManualRefresh: () => void;
}

export const AutoRefreshControl = ({
  enabled,
  interval,
  lastUpdated,
  isRefreshing,
  onEnabledChange,
  onIntervalChange,
  onManualRefresh,
}: AutoRefreshControlProps) => {
  return (
    <Card className="p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <Label htmlFor="auto-refresh" className="cursor-pointer">
              Auto-refresh
            </Label>
            <Switch
              id="auto-refresh"
              checked={enabled}
              onCheckedChange={onEnabledChange}
            />
          </div>

          {enabled && (
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Intervalo:</Label>
              <Select
                value={interval.toString()}
                onValueChange={(value) => onIntervalChange(Number(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30000">30 segundos</SelectItem>
                  <SelectItem value="60000">1 minuto</SelectItem>
                  <SelectItem value="300000">5 minutos</SelectItem>
                  <SelectItem value="600000">10 minutos</SelectItem>
                  <SelectItem value="1800000">30 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Última atualização: {formatDistanceToNow(lastUpdated, { locale: ptBR, addSuffix: true })}
          </span>
          <button
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            Atualizar agora
          </button>
        </div>
      </div>
    </Card>
  );
};
