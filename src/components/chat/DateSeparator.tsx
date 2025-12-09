import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DateSeparatorProps {
  date: string;
}

export const DateSeparator = ({ date }: DateSeparatorProps) => {
  const formatRelativeDate = (dateStr: string) => {
    const d = new Date(dateStr);
    
    if (isToday(d)) {
      return "Hoje";
    }
    
    if (isYesterday(d)) {
      return "Ontem";
    }
    
    return format(d, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <div className="flex items-center gap-4 my-6 px-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
        {formatRelativeDate(date)}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
};
