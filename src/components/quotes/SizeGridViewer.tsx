import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { useState } from "react";

export interface SizeGrid {
  masculino: Record<string, number>;
  feminino: Record<string, number>;
  infantil: Record<string, number>;
}

interface SizeGridViewerProps {
  sizeGrid: SizeGrid;
  itemName?: string;
  itemIndex?: number;
  compactMode?: boolean; // Mostra apenas tamanhos com quantidade > 0
}

const calculateGenderTotal = (gender: Record<string, number>) => {
  return Object.values(gender).reduce((sum, qty) => sum + qty, 0);
};

const calculateGridTotal = (grid: SizeGrid): number => {
  return calculateGenderTotal(grid.masculino) + 
         calculateGenderTotal(grid.feminino) + 
         calculateGenderTotal(grid.infantil);
};

// Retorna apenas os tamanhos com quantidade > 0
const getSelectedSizes = (data: Record<string, number>): Array<{size: string, qty: number}> => {
  return Object.entries(data)
    .filter(([_, qty]) => qty > 0)
    .map(([size, qty]) => ({ size, qty }));
};

export const SizeGridViewer = ({ sizeGrid, itemName, itemIndex, compactMode = false }: SizeGridViewerProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['masculino', 'feminino', 'infantil']));
  
  const toggleSection = (gender: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(gender)) {
      newExpanded.delete(gender);
    } else {
      newExpanded.add(gender);
    }
    setExpandedSections(newExpanded);
  };

  const totalQuantity = calculateGridTotal(sizeGrid);
  const masTotal = calculateGenderTotal(sizeGrid.masculino);
  const femTotal = calculateGenderTotal(sizeGrid.feminino);
  const infTotal = calculateGenderTotal(sizeGrid.infantil);

  const genderConfig = [
    { key: 'masculino', label: 'Masculino', colorClass: 'bg-blue-500', data: sizeGrid.masculino, total: masTotal },
    { key: 'feminino', label: 'Feminino', colorClass: 'bg-pink-500', data: sizeGrid.feminino, total: femTotal },
    { key: 'infantil', label: 'Infantil', colorClass: 'bg-yellow-500', data: sizeGrid.infantil, total: infTotal },
  ];

  if (totalQuantity === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="text-center text-muted-foreground text-sm">
            <Users className="h-5 w-5 mx-auto mb-1 opacity-50" />
            Nenhum tamanho selecionado
          </div>
        </CardContent>
      </Card>
    );
  }

  // Modo compacto: mostra apenas tamanhos selecionados em linha
  if (compactMode) {
    return (
      <Card>
        <CardContent className="p-3 space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Tamanhos Selecionados</span>
            </div>
            <Badge variant="secondary" className="font-medium">
              {totalQuantity} un.
            </Badge>
          </div>

          {/* Gender sections - compact */}
          {genderConfig.map(({ key, label, colorClass, data, total }) => {
            if (total === 0) return null;
            const selectedSizes = getSelectedSizes(data);
            
            return (
              <div key={key} className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${colorClass}`}></span>
                  <span className="text-xs font-medium uppercase text-muted-foreground">{label}:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSizes.map(({ size, qty }) => (
                    <Badge key={size} variant="outline" className="text-xs px-2 py-0.5">
                      {qty}x {size}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  // Modo completo: grade expandível
  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {itemName ? `Grade - ${itemName}` : `Grade ${itemIndex !== undefined ? itemIndex + 1 : ''}`}
            </span>
          </div>
          <Badge variant="secondary" className="font-medium">
            {totalQuantity} un.
          </Badge>
        </div>

        {/* Gender sections */}
        {genderConfig.map(({ key, label, colorClass, data, total }) => {
          const isExpanded = expandedSections.has(key);
          const hasQuantity = total > 0;
          
          if (!hasQuantity) return null;
          
          const selectedSizes = getSelectedSizes(data);

          return (
            <div key={key} className="border rounded-lg overflow-hidden">
              <div 
                className="flex items-center justify-between p-2 bg-muted/30 cursor-pointer"
                onClick={() => toggleSection(key)}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`}></span>
                  <span className="font-medium text-xs uppercase tracking-wide">{label}</span>
                  <Badge variant="outline" className="text-xs h-5">
                    {total} un.
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {selectedSizes.map(({ size, qty }) => (
                      <div key={size} className="flex items-center gap-1 bg-primary/10 rounded-md px-3 py-1.5">
                        <span className="text-sm font-bold text-primary">{qty}</span>
                        <span className="text-xs text-muted-foreground">×</span>
                        <span className="text-sm font-medium">{size}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
