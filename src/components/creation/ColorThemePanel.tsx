import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Palette, RotateCcw } from "lucide-react";
import { generateColorShades, PRESET_PALETTES } from "@/lib/colorUtils";
import { useState } from "react";

interface ColorThemePanelProps {
  onColorsChange: (colors: string[]) => void;
  currentColors: string[];
}

export const ColorThemePanel = ({ onColorsChange, currentColors }: ColorThemePanelProps) => {
  const [selectedColor, setSelectedColor] = useState("#059669");

  const handlePresetClick = (baseColor: string) => {
    setSelectedColor(baseColor);
    const shades = generateColorShades(baseColor);
    onColorsChange(shades);
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setSelectedColor(color);
    const shades = generateColorShades(color);
    onColorsChange(shades);
  };

  const handleReset = () => {
    onColorsChange([]);
    setSelectedColor("#059669");
  };

  return (
    <Card className="p-4 mb-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Tema das Colunas</h3>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="color-picker" className="text-sm font-medium">
              Cor Base:
            </label>
            <input
              id="color-picker"
              type="color"
              value={selectedColor}
              onChange={handleColorPickerChange}
              className="h-10 w-20 rounded border cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">ou Paletas:</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRESET_PALETTES).map(([key, palette]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick(palette.base)}
                  className="gap-1"
                >
                  <span>{palette.preview}</span>
                  <span>{palette.name}</span>
                </Button>
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-2 ml-auto"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar Padrão
          </Button>
        </div>

        {currentColors.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Preview dos tons:</p>
            <div className="flex gap-2">
              {currentColors.map((color, index) => (
                <div
                  key={index}
                  className="h-12 flex-1 rounded border"
                  style={{ backgroundColor: color }}
                  title={`Tom ${index + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
