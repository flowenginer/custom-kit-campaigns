import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DateRangeFilterProps {
  startDate: Date;
  endDate: Date;
  onDateChange: (start: Date, end: Date) => void;
}

export const DateRangeFilter = ({ startDate, endDate, onDateChange }: DateRangeFilterProps) => {
  const [preset, setPreset] = useState<string>("30d");

  const handlePresetChange = (value: string) => {
    setPreset(value);
    const now = new Date();
    
    switch (value) {
      case "today":
        onDateChange(startOfDay(now), endOfDay(now));
        break;
      case "7d":
        onDateChange(subDays(now, 7), now);
        break;
      case "30d":
        onDateChange(subDays(now, 30), now);
        break;
      case "month":
        onDateChange(startOfMonth(now), endOfMonth(now));
        break;
      case "lastMonth":
        const lastMonth = subDays(startOfMonth(now), 1);
        onDateChange(startOfMonth(lastMonth), endOfMonth(lastMonth));
        break;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Botões de período rápido */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={preset === "today" ? "default" : "outline"}
          onClick={() => handlePresetChange("today")}
        >
          Hoje
        </Button>
        
        <Button
          size="sm"
          variant={preset === "7d" ? "default" : "outline"}
          onClick={() => handlePresetChange("7d")}
        >
          7 dias
        </Button>
        
        <Button
          size="sm"
          variant={preset === "30d" ? "default" : "outline"}
          onClick={() => handlePresetChange("30d")}
        >
          30 dias
        </Button>
        
        <Button
          size="sm"
          variant={preset === "month" ? "default" : "outline"}
          onClick={() => handlePresetChange("month")}
        >
          Este mês
        </Button>
        
        <Button
          size="sm"
          variant={preset === "lastMonth" ? "default" : "outline"}
          onClick={() => handlePresetChange("lastMonth")}
        >
          Mês passado
        </Button>
        
        <Button
          size="sm"
          variant={preset === "custom" ? "default" : "outline"}
          onClick={() => handlePresetChange("custom")}
        >
          <CalendarIcon className="mr-1 h-4 w-4" />
          Personalizado
        </Button>
      </div>

      {/* Calendários customizados */}
      {preset === "custom" && (
        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(startDate, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && onDateChange(date, endDate)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => date && onDateChange(startDate, date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};
