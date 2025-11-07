import { Label } from "@/components/ui/label";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

export const ColorPicker = ({ label, value, onChange }: ColorPickerProps) => {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-20 rounded-md border border-input cursor-pointer"
        />
        <div className="flex items-center gap-2">
          <div 
            className="h-8 w-8 rounded-md border border-input"
            style={{ backgroundColor: value }}
          />
          <span className="text-sm text-muted-foreground font-mono">{value}</span>
        </div>
      </div>
    </div>
  );
};
