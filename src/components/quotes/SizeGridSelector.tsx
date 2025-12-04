import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle } from "lucide-react";

export interface SizeGrid {
  masculino: Record<string, number>;
  feminino: Record<string, number>;
  infantil: Record<string, number>;
}

interface SizeGridSelectorProps {
  itemIndex: number;
  productName: string;
  requiredQuantity: number;
  sizeGrid: SizeGrid;
  onChange: (grid: SizeGrid) => void;
  disabled?: boolean;
}

const ADULT_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG'];
const CHILD_SIZES = ['2', '4', '6', '8', '10', '12', '14'];

export const SizeGridSelector = ({
  itemIndex,
  productName,
  requiredQuantity,
  sizeGrid,
  onChange,
  disabled = false
}: SizeGridSelectorProps) => {
  const calculateTotal = () => {
    let total = 0;
    Object.values(sizeGrid.masculino).forEach(qty => total += qty || 0);
    Object.values(sizeGrid.feminino).forEach(qty => total += qty || 0);
    Object.values(sizeGrid.infantil).forEach(qty => total += qty || 0);
    return total;
  };

  const totalSelected = calculateTotal();
  const remaining = requiredQuantity - totalSelected;
  const isComplete = remaining === 0;
  const isOver = remaining < 0;

  const handleChange = (gender: keyof SizeGrid, size: string, value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    const newGrid = {
      ...sizeGrid,
      [gender]: {
        ...sizeGrid[gender],
        [size]: numValue
      }
    };
    onChange(newGrid);
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            📐 Grade de Tamanhos - Layout {itemIndex + 1}
          </CardTitle>
          <Badge 
            variant={isComplete ? "default" : isOver ? "destructive" : "secondary"}
            className={isComplete ? "bg-green-500" : ""}
          >
            {isComplete ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Completo</>
            ) : isOver ? (
              <><AlertCircle className="h-3 w-3 mr-1" /> {Math.abs(remaining)} a mais</>
            ) : (
              <>{remaining} restantes</>
            )}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Preencha a quantidade de cada tamanho (Total: {totalSelected}/{requiredQuantity})
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Masculino */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Masculino
          </label>
          <div className="grid grid-cols-6 gap-2">
            {ADULT_SIZES.map(size => (
              <div key={`m-${size}`} className="text-center">
                <label className="text-xs text-muted-foreground block mb-1">{size}</label>
                <Input
                  type="number"
                  min="0"
                  value={sizeGrid.masculino[size] || ''}
                  onChange={(e) => handleChange('masculino', size, e.target.value)}
                  className="h-9 text-center px-1"
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Feminino */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-500"></span>
            Feminino
          </label>
          <div className="grid grid-cols-6 gap-2">
            {ADULT_SIZES.map(size => (
              <div key={`f-${size}`} className="text-center">
                <label className="text-xs text-muted-foreground block mb-1">{size}</label>
                <Input
                  type="number"
                  min="0"
                  value={sizeGrid.feminino[size] || ''}
                  onChange={(e) => handleChange('feminino', size, e.target.value)}
                  className="h-9 text-center px-1"
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Infantil */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Infantil (Anos)
          </label>
          <div className="grid grid-cols-7 gap-2">
            {CHILD_SIZES.map(size => (
              <div key={`i-${size}`} className="text-center">
                <label className="text-xs text-muted-foreground block mb-1">{size}</label>
                <Input
                  type="number"
                  min="0"
                  value={sizeGrid.infantil[size] || ''}
                  onChange={(e) => handleChange('infantil', size, e.target.value)}
                  className="h-9 text-center px-1"
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const createEmptySizeGrid = (): SizeGrid => ({
  masculino: {},
  feminino: {},
  infantil: {}
});

export const calculateGridTotal = (grid: SizeGrid): number => {
  let total = 0;
  Object.values(grid.masculino).forEach(qty => total += qty || 0);
  Object.values(grid.feminino).forEach(qty => total += qty || 0);
  Object.values(grid.infantil).forEach(qty => total += qty || 0);
  return total;
};
