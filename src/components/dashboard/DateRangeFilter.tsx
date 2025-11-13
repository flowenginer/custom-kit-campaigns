import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    <div className="flex flex-wrap gap-4 items-center">
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Selecione período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="7d">Últimos 7 dias</SelectItem>
          <SelectItem value="30d">Últimos 30 dias</SelectItem>
          <SelectItem value="month">Este mês</SelectItem>
          <SelectItem value="lastMonth">Mês passado</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {preset === "custom" && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-start">
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
              <Button variant="outline" className="w-[180px] justify-start">
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
        </>
      )}
    </div>
  );
};
