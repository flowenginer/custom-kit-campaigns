import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface ColorPickerWithOpacityProps {
  label: string;
  value: string;
  opacity: number;
  onColorChange: (color: string) => void;
  onOpacityChange: (opacity: number) => void;
}

export const ColorPickerWithOpacity = ({
  label,
  value,
  opacity,
  onColorChange,
  onOpacityChange,
}: ColorPickerWithOpacityProps) => {
  // Converter HEX para RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  const rgb = hexToRgb(value);
  const rgbaColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity / 100})`;

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      {/* Color Picker */}
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onColorChange(e.target.value)}
          className="h-10 w-20 rounded-md border border-input cursor-pointer"
        />
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-md border border-input"
            style={{ backgroundColor: rgbaColor }}
          />
          <span className="text-sm text-muted-foreground font-mono">{value}</span>
        </div>
      </div>

      {/* Opacity Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Opacidade</Label>
          <span className="text-xs font-mono text-muted-foreground">{opacity}%</span>
        </div>
        <Slider
          value={[opacity]}
          onValueChange={(values) => onOpacityChange(values[0])}
          min={0}
          max={100}
          step={5}
          className="w-full"
        />
      </div>
    </div>
  );
};
