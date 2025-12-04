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
}

const ADULT_SIZES_ROW1 = ['PP', 'P', 'M', 'G', 'GG', 'XG'];
const ADULT_SIZES_ROW2 = ['G1', 'G2', 'G3', 'G4', 'G5'];
const CHILD_SIZES_ROW1 = ['2', '4', '6', '8', '10', '12'];
const CHILD_SIZES_ROW2 = ['14', '16'];

const calculateGenderTotal = (gender: Record<string, number>) => {
  return Object.values(gender).reduce((sum, qty) => sum + qty, 0);
};

const calculateGridTotal = (grid: SizeGrid): number => {
  return calculateGenderTotal(grid.masculino) + 
         calculateGenderTotal(grid.feminino) + 
         calculateGenderTotal(grid.infantil);
};

export const SizeGridViewer = ({ sizeGrid, itemName, itemIndex }: SizeGridViewerProps) => {
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

  const renderSizeRow = (sizes: string[], data: Record<string, number>) => (
    <div className="grid grid-cols-6 gap-1.5">
      {sizes.map(size => {
        const qty = data[size] || 0;
        return (
          <div key={size} className="text-center">
            <div className="text-[10px] text-muted-foreground font-medium mb-0.5">{size}</div>
            <div className={`h-8 rounded flex items-center justify-center text-sm font-medium ${
              qty > 0 ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'
            }`}>
              {qty}
            </div>
          </div>
        );
      })}
    </div>
  );

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
                <div className="p-3 space-y-2">
                  {key !== 'infantil' ? (
                    <>
                      {renderSizeRow(ADULT_SIZES_ROW1, data)}
                      <div className="grid grid-cols-6 gap-1.5">
                        {ADULT_SIZES_ROW2.map(size => {
                          const qty = data[size] || 0;
                          return (
                            <div key={size} className="text-center">
                              <div className="text-[10px] text-muted-foreground font-medium mb-0.5">{size}</div>
                              <div className={`h-8 rounded flex items-center justify-center text-sm font-medium ${
                                qty > 0 ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'
                              }`}>
                                {qty}
                              </div>
                            </div>
                          );
                        })}
                        <div></div>
                      </div>
                    </>
                  ) : (
                    <>
                      {renderSizeRow(CHILD_SIZES_ROW1, data)}
                      <div className="grid grid-cols-6 gap-1.5">
                        {CHILD_SIZES_ROW2.map(size => {
                          const qty = data[size] || 0;
                          return (
                            <div key={size} className="text-center">
                              <div className="text-[10px] text-muted-foreground font-medium mb-0.5">{size}</div>
                              <div className={`h-8 rounded flex items-center justify-center text-sm font-medium ${
                                qty > 0 ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'
                              }`}>
                                {qty}
                              </div>
                            </div>
                          );
                        })}
                        {[...Array(4)].map((_, i) => <div key={i}></div>)}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
