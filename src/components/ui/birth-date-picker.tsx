import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BirthDatePickerProps {
  value: string; // formato YYYY-MM-DD
  onChange: (value: string) => void;
  id?: string;
}

export function BirthDatePicker({ value, onChange, id }: BirthDatePickerProps) {
  const isMobile = useIsMobile();
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  // Parse valor inicial quando componente monta ou valor muda
  useEffect(() => {
    if (value && value.includes("-")) {
      const [y, m, d] = value.split("-");
      setYear(y);
      setMonth(m);
      setDay(d);
    }
  }, [value]);

  // Atualizar onChange quando dia/mês/ano mudam
  useEffect(() => {
    if (day && month && year) {
      const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      onChange(formattedDate);
    }
  }, [day, month, year, onChange]);

  // Calcular número de dias no mês
  const getDaysInMonth = (monthNum: number, yearNum: number) => {
    if (!monthNum || !yearNum) return 31;
    return new Date(yearNum, monthNum, 0).getDate();
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1920 + 1 }, (_, i) => currentYear - i);
  
  const months = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const daysInMonth = getDaysInMonth(parseInt(month) || 12, parseInt(year) || currentYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Se não for mobile, usar input nativo
  if (!isMobile) {
    return (
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  // Mobile: renderizar 3 selects
  return (
    <div className="grid grid-cols-3 gap-2">
      <Select value={day} onValueChange={setDay}>
        <SelectTrigger id={id} className="bg-background">
          <SelectValue placeholder="Dia" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px] bg-background">
          {days.map((d) => (
            <SelectItem key={d} value={d.toString()}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={month} onValueChange={setMonth}>
        <SelectTrigger className="bg-background">
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px] bg-background">
          {months.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={year} onValueChange={setYear}>
        <SelectTrigger className="bg-background">
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px] bg-background">
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
