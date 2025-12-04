import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle, Plus, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

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

const REGULAR_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG'];
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    masculino: false,
    feminino: false,
    infantil: false
  });

  const calculateTotal = () => {
    let total = 0;
    Object.values(sizeGrid.masculino).forEach(qty => total += qty || 0);
    Object.values(sizeGrid.feminino).forEach(qty => total += qty || 0);
    Object.values(sizeGrid.infantil).forEach(qty => total += qty || 0);
    return total;
  };

  const calculateGenderTotal = (gender: keyof SizeGrid) => {
    let total = 0;
    Object.values(sizeGrid[gender]).forEach(qty => total += qty || 0);
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

  const handleResetGender = (gender: keyof SizeGrid) => {
    const newGrid = {
      ...sizeGrid,
      [gender]: {}
    };
    onChange(newGrid);
  };

  const toggleSection = (gender: string) => {
    if (disabled) return;
    setExpandedSections(prev => ({
      ...prev,
      [gender]: !prev[gender]
    }));
  };

  const renderGenderSection = (
    gender: keyof SizeGrid,
    label: string,
    colorClass: string,
    sizes: string[][],
    isPlusSize: boolean[] = []
  ) => {
    const isExpanded = expandedSections[gender];
    const genderTotal = calculateGenderTotal(gender);
    
    return (
      <div className="border rounded-lg overflow-hidden">
        {/* Header - Clickable to expand */}
        <div 
          className={`flex items-center justify-between p-3 bg-muted/30 cursor-pointer ${disabled ? 'cursor-default' : ''}`}
          onClick={() => toggleSection(gender)}
        >
          <div className="flex items-center gap-3">
            <Checkbox 
              checked={isExpanded}
              onCheckedChange={() => toggleSection(gender)}
              disabled={disabled}
              className="data-[state=checked]:bg-primary"
            />
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${colorClass}`}></span>
              <span className="font-medium text-sm">{label}</span>
            </div>
            {genderTotal > 0 && (
              <Badge variant="secondary" className="text-xs">
                {genderTotal} un.
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isExpanded && !disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetGender(gender);
                }}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Zerar
              </Button>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-3 space-y-3 bg-background">
            {sizes.map((sizeRow, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-6 gap-2">
                {sizeRow.map((size, sizeIndex) => {
                  const isPlus = isPlusSize[rowIndex] || false;
                  return (
                    <div key={size} className="text-center">
                      <label className={`text-xs block mb-1 ${isPlus ? 'text-purple-600 font-medium' : 'text-muted-foreground'}`}>
                        {size}
                      </label>
                      <Input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={sizeGrid[gender][size] || ''}
                        onChange={(e) => handleChange(gender, size, e.target.value)}
                        className={`h-10 text-center text-sm px-1 ${isPlus ? 'border-purple-300 focus:border-purple-500' : ''}`}
                        disabled={disabled}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium">
            📐 Grade de Tamanhos - Layout {itemIndex + 1}
          </CardTitle>
          <Badge 
            variant={isComplete ? "default" : isOver ? "outline" : "secondary"}
            className={`whitespace-nowrap ${isComplete ? "bg-green-500" : isOver ? "bg-blue-500 text-white border-blue-500" : ""}`}
          >
            {isComplete ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Completo</>
            ) : isOver ? (
              <><Plus className="h-3 w-3 mr-1" /> +{Math.abs(remaining)}</>
            ) : (
              <>{remaining} restantes</>
            )}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Preencha a quantidade de cada tamanho (Total: {totalSelected}/{requiredQuantity})
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Masculino */}
        {renderGenderSection(
          'masculino',
          'Masculino',
          'bg-blue-500',
          [REGULAR_SIZES, PLUS_SIZES],
          [false, true]
        )}

        {/* Feminino */}
        {renderGenderSection(
          'feminino',
          'Feminino',
          'bg-pink-500',
          [REGULAR_SIZES, PLUS_SIZES],
          [false, true]
        )}

        {/* Infantil */}
        {renderGenderSection(
          'infantil',
          'Infantil (Anos)',
          'bg-green-500',
          [CHILD_SIZES],
          [false]
        )}

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
