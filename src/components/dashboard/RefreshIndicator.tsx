import { Button } from "@/components/ui/button";
import { RefreshCw, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RefreshIndicatorProps {
  lastUpdated: Date;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const RefreshIndicator = ({
  lastUpdated,
  isRefreshing,
  onRefresh
}: RefreshIndicatorProps) => {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span>
          Atualizado {formatDistanceToNow(lastUpdated, { 
            addSuffix: true,
            locale: ptBR 
          })}
        </span>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Atualizando...' : 'Atualizar'}
      </Button>
    </div>
  );
};
