import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Upload } from "lucide-react";
import { useState, useRef } from "react";

export interface Sponsor {
  name: string;
  logoFile?: File | null;
  logoUrl?: string;
}

interface SponsorsListProps {
  sponsors: Sponsor[];
  onChange: (sponsors: Sponsor[]) => void;
}

export const SponsorsList = ({ sponsors, onChange }: SponsorsListProps) => {
  const [newSponsor, setNewSponsor] = useState("");
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const addSponsor = () => {
    if (newSponsor.trim()) {
      onChange([...sponsors, { name: newSponsor.trim(), logoFile: null }]);
      setNewSponsor("");
    }
  };

  const removeSponsor = (index: number) => {
    onChange(sponsors.filter((_, i) => i !== index));
  };

  const updateSponsorLogo = (index: number, file: File | null) => {
    const updated = [...sponsors];
    updated[index] = { ...updated[index], logoFile: file };
    onChange(updated);
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
        <div className="space-y-3">
          {sponsors.map((sponsor, index) => (
            <div key={index} className="p-3 bg-muted rounded-md border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{sponsor.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSponsor(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => fileInputRefs.current[index]?.click()}
                >
                  <Upload className="mr-2 h-3 w-3" />
                  {sponsor.logoFile ? sponsor.logoFile.name : "Carregar logo"}
                </Button>
                <input
                  ref={(el) => (fileInputRefs.current[index] = el)}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    updateSponsorLogo(index, file);
                  }}
                />
              </div>
              
              {sponsor.logoFile && (
                <p className="text-xs text-muted-foreground">
                  Logo: {sponsor.logoFile.name}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
