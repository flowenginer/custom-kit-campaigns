import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { useState } from "react";

interface SponsorsListProps {
  sponsors: string[];
  onChange: (sponsors: string[]) => void;
}

export const SponsorsList = ({ sponsors, onChange }: SponsorsListProps) => {
  const [newSponsor, setNewSponsor] = useState("");

  const addSponsor = () => {
    if (newSponsor.trim()) {
      onChange([...sponsors, newSponsor.trim()]);
      setNewSponsor("");
    }
  };

  const removeSponsor = (index: number) => {
    onChange(sponsors.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <Label>Patrocinadores</Label>
      
      <div className="flex gap-2">
        <Input
          placeholder="Nome do patrocinador"
          value={newSponsor}
          onChange={(e) => setNewSponsor(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addSponsor()}
        />
        <Button type="button" onClick={addSponsor} size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {sponsors.length > 0 && (
        <div className="space-y-2">
          {sponsors.map((sponsor, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
              <span className="text-sm">{sponsor}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSponsor(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
