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
    <div className="flex items-center justify-center my-4">
      <div className="bg-muted px-4 py-1.5 rounded-full text-xs text-muted-foreground font-medium">
        {formatRelativeDate(date)}
      </div>
    </div>
  );
};