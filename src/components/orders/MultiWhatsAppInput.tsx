import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

interface MultiWhatsAppInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  error?: string;
}

export const MultiWhatsAppInput = ({ values, onChange, error }: MultiWhatsAppInputProps) => {
  const addNumber = () => {
    onChange([...values, ""]);
  };

  const removeNumber = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const updateNumber = (index: number, value: string) => {
    const newValues = [...values];
    newValues[index] = value.replace(/\D/g, ""); // Remove non-digits
    onChange(newValues);
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    } else if (phone.length === 10) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className="space-y-3">
      <Label>WhatsApp {error && <span className="text-destructive text-xs ml-2">{error}</span>}</Label>
      
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <Input
            placeholder={index === 0 ? "Principal (obrigatório)" : "Adicional"}
            value={formatPhone(value)}
            onChange={(e) => updateNumber(index, e.target.value)}
            maxLength={15}
            className={error && index === 0 ? "border-destructive" : ""}
          />
          {index > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeNumber(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      
      <Button type="button" onClick={addNumber} variant="outline" size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Adicionar WhatsApp
      </Button>
    </div>
  );
};
