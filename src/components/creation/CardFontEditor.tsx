import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Settings, RotateCcw } from "lucide-react";
import { CardFontSizes } from "@/hooks/useCardFontSizes";

interface CardFontEditorProps {
  sizes: CardFontSizes;
  updateSize: (key: keyof CardFontSizes, value: number) => void;
  resetToDefaults: () => void;
}

export const CardFontEditor = ({ sizes, updateSize, resetToDefaults }: CardFontEditorProps) => {
  const fontConfig = [
    { key: 'badge' as const, label: 'Badge Vendedor/Admin', min: 10, max: 16 },
    { key: 'customerName' as const, label: 'Nome do Cliente', min: 12, max: 20 },
    { key: 'segment' as const, label: 'Segmento/Campanha', min: 10, max: 16 },
    { key: 'quantity' as const, label: 'Quantidade', min: 10, max: 16 },
    { key: 'designer' as const, label: 'Designer', min: 10, max: 16 },
    { key: 'priority' as const, label: 'Prioridade', min: 10, max: 16 },
    { key: 'model' as const, label: 'Modelo', min: 9, max: 14 },
    { key: 'salesperson' as const, label: 'Vendedor', min: 10, max: 16 },
    { key: 'version' as const, label: 'Versão', min: 10, max: 16 },
    { key: 'timer' as const, label: 'Timers', min: 10, max: 16 },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Configurar Card
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-[600px] overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Tamanho das Fontes</h4>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetToDefaults}
              className="h-8 px-2"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Restaurar
            </Button>
          </div>
          
          <div className="space-y-4">
            {fontConfig.map(({ key, label, min, max }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{label}</Label>
                  <span className="text-xs text-muted-foreground font-mono">
                    {sizes[key]}px
                  </span>
                </div>
                <Slider 
                  min={min}
                  max={max}
                  step={1}
                  value={[sizes[key]]}
                  onValueChange={([v]) => updateSize(key, v)}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
