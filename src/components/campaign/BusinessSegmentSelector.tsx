import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessSegments, BusinessSegment } from "@/hooks/useBusinessSegments";
import { Building2 } from "lucide-react";

interface BusinessSegmentSelectorProps {
  selectedSegmentId: string | null;
  otherSegmentText: string;
  onSelectSegment: (segmentId: string | null, otherText: string) => void;
}

export const BusinessSegmentSelector = ({
  selectedSegmentId,
  otherSegmentText,
  onSelectSegment
}: BusinessSegmentSelectorProps) => {
  const { data: segments, isLoading } = useBusinessSegments(true); // Only active segments
  const [showOtherInput, setShowOtherInput] = useState(selectedSegmentId === 'other');

  const handleSelect = (segmentId: string) => {
    if (segmentId === 'other') {
      setShowOtherInput(true);
      onSelectSegment(null, otherSegmentText);
    } else {
      setShowOtherInput(false);
      onSelectSegment(segmentId, '');
    }
  };

  const handleOtherTextChange = (text: string) => {
    onSelectSegment(null, text);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48 mx-auto" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
        <h3 className="text-lg font-semibold">Qual é o seu segmento de atuação?</h3>
        <p className="text-sm text-muted-foreground">
          Isso nos ajuda a personalizar sua experiência
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {segments?.map((segment) => (
          <Card
            key={segment.id}
            className={`cursor-pointer transition-all hover:border-primary ${
              selectedSegmentId === segment.id
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border'
            }`}
            onClick={() => handleSelect(segment.id)}
          >
            <CardContent className="p-4 text-center">
              <span className="text-3xl block mb-2">{segment.icon}</span>
              <span className="text-sm font-medium">{segment.name}</span>
            </CardContent>
          </Card>
        ))}

        {/* Opção "Outros" */}
        <Card
          className={`cursor-pointer transition-all hover:border-primary ${
            showOtherInput
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : 'border-border'
          }`}
          onClick={() => handleSelect('other')}
        >
          <CardContent className="p-4 text-center">
            <span className="text-3xl block mb-2">📦</span>
            <span className="text-sm font-medium">Outro segmento</span>
          </CardContent>
        </Card>
      </div>

      {/* Campo de texto para "Outros" */}
      {showOtherInput && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
          <Label htmlFor="other-segment">Qual é o seu segmento?</Label>
          <Input
            id="other-segment"
            value={otherSegmentText}
            onChange={(e) => handleOtherTextChange(e.target.value)}
            placeholder="Digite o nome do seu segmento..."
            autoFocus
          />
        </div>
      )}
    </div>
  );
};
