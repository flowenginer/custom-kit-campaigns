import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Plus, RotateCcw } from "lucide-react";

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
  allowOverflow?: boolean;
}

const ADULT_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'G1', 'G2', 'G3', 'G4', 'G5'];
const PLUS_SIZES = ['G1', 'G2', 'G3', 'G4', 'G5'];
const CHILD_SIZES = ['2', '4', '6', '8', '10', '12', '14'];

export const SizeGridSelector = ({
  itemIndex,
  productName,
  requiredQuantity,
  sizeGrid,
  onChange,
  disabled = false,
  allowOverflow = true
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
  const isUnder = remaining > 0;

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

  const handleResetGender = (gender: keyof SizeGrid) => {
    const newGrid = {
      ...sizeGrid,
      [gender]: {}
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
            variant={isComplete ? "default" : isOver ? "outline" : "secondary"}
            className={isComplete ? "bg-green-500" : isOver ? "bg-blue-500 text-white border-blue-500" : ""}
          >
            {isComplete ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Completo</>
            ) : isOver ? (
              <><Plus className="h-3 w-3 mr-1" /> +{Math.abs(remaining)} adicionais</>
            ) : (
              <>{remaining} restantes</>
            )}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Preencha a quantidade de cada tamanho (Total: {totalSelected}/{requiredQuantity})
          {isOver && allowOverflow && (
            <span className="text-blue-600 ml-1">• Unidades extras serão cobradas</span>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Masculino - 11 tamanhos: PP, P, M, G, GG, XG, G1, G2, G3, G4, G5 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Masculino
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleResetGender('masculino')}
              disabled={disabled}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Zerar
            </Button>
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(11, minmax(0, 1fr))' }}>
            {ADULT_SIZES.map(size => {
              const isPlusSize = PLUS_SIZES.includes(size);
              return (
                <div key={`m-${size}`} className="text-center">
                  <label className={`text-[10px] block mb-1 ${isPlusSize ? 'text-purple-600 font-medium' : 'text-muted-foreground'}`}>
                    {size}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={sizeGrid.masculino[size] || ''}
                    onChange={(e) => handleChange('masculino', size, e.target.value)}
                    className={`h-8 text-center text-xs px-0.5 w-full ${isPlusSize ? 'border-purple-300 focus:border-purple-500' : ''}`}
                    disabled={disabled}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Feminino - 11 tamanhos: PP, P, M, G, GG, XG, G1, G2, G3, G4, G5 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500"></span>
              Feminino
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleResetGender('feminino')}
              disabled={disabled}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Zerar
            </Button>
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(11, minmax(0, 1fr))' }}>
            {ADULT_SIZES.map(size => {
              const isPlusSize = PLUS_SIZES.includes(size);
              return (
                <div key={`f-${size}`} className="text-center">
                  <label className={`text-[10px] block mb-1 ${isPlusSize ? 'text-purple-600 font-medium' : 'text-muted-foreground'}`}>
                    {size}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={sizeGrid.feminino[size] || ''}
                    onChange={(e) => handleChange('feminino', size, e.target.value)}
                    className={`h-8 text-center text-xs px-0.5 w-full ${isPlusSize ? 'border-purple-300 focus:border-purple-500' : ''}`}
                    disabled={disabled}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Infantil */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Infantil (Anos)
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleResetGender('infantil')}
              disabled={disabled}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Zerar
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 max-w-xs">
            {CHILD_SIZES.map(size => (
              <div key={`i-${size}`} className="text-center">
                <label className="text-[10px] text-muted-foreground block mb-1">{size}</label>
                <Input
                  type="number"
                  min="0"
                  value={sizeGrid.infantil[size] || ''}
                  onChange={(e) => handleChange('infantil', size, e.target.value)}
                  className="h-8 text-center text-xs px-0.5"
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Plus Size Legend */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <span className="w-3 h-3 rounded border border-purple-300 bg-purple-50"></span>
          <span>Tamanhos G1 a G5 = Plus Size (+R$ 10,00 por peça)</span>
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

export const calculatePlusSizeCount = (grid: SizeGrid): number => {
  let count = 0;
  PLUS_SIZES.forEach(size => {
    count += (grid.masculino[size] || 0);
    count += (grid.feminino[size] || 0);
  });
  return count;
};
