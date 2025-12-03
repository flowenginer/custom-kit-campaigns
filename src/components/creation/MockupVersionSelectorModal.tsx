import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, X } from "lucide-react";

interface MockupVersion {
  version: number;
  url: string;
  uploaded_at: string;
  notes?: string;
  is_revision?: boolean;
  client_approved?: boolean;
}

interface MockupVersionSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mockupVersions: MockupVersion[];
  currentVersion: number;
  onConfirm: (selectedVersions: MockupVersion[]) => void;
}

// Group files by version
const groupByVersion = (files: MockupVersion[]): Map<number, MockupVersion[]> => {
  const grouped = new Map<number, MockupVersion[]>();
  files.forEach(file => {
    const existing = grouped.get(file.version) || [];
    grouped.set(file.version, [...existing, file]);
  });
  return grouped;
};

// Check if file is an image
const isImageFile = (url: string): boolean => {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
};

export const MockupVersionSelectorModal = ({
  open,
  onOpenChange,
  mockupVersions,
  currentVersion,
  onConfirm,
}: MockupVersionSelectorModalProps) => {
  const [selectedVersions, setSelectedVersions] = useState<Set<number>>(new Set([currentVersion]));

  const versionGroups = groupByVersion(mockupVersions);
  const sortedVersions = Array.from(versionGroups.keys()).sort((a, b) => b - a);

  const toggleVersion = (version: number) => {
    const newSet = new Set(selectedVersions);
    if (newSet.has(version)) {
      newSet.delete(version);
    } else {
      newSet.add(version);
    }
    setSelectedVersions(newSet);
  };

  const selectedFilesCount = Array.from(selectedVersions).reduce((sum, v) => {
    return sum + (versionGroups.get(v)?.length || 0);
  }, 0);

  const handleConfirm = () => {
    const selectedFiles = mockupVersions.filter(f => selectedVersions.has(f.version));
    onConfirm(selectedFiles);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Selecionar Versões para Enviar</span>
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Selecione qual(is) versão(ões) enviar para o cliente:
        </p>

        <div className="flex-1 overflow-auto py-4">
          <div className="grid grid-cols-3 gap-3">
            {sortedVersions.map(version => {
              const files = versionGroups.get(version) || [];
              const firstFile = files[0];
              const isSelected = selectedVersions.has(version);
              const isCurrent = version === currentVersion;
              const firstImageFile = files.find(f => isImageFile(f.url));

              return (
                <div
                  key={version}
                  onClick={() => toggleVersion(version)}
                  className={`
                    relative p-3 rounded-lg border-2 cursor-pointer transition-all
                    ${isSelected 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50 hover:bg-accent/50'
                    }
                  `}
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleVersion(version)}
                      className="pointer-events-none"
                    />
                    <Badge variant={isCurrent ? "default" : "outline"} className="text-xs">
                      v{version} {isCurrent && '(atual)'}
                    </Badge>
                  </div>

                  {/* Date */}
                  {firstFile && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {format(new Date(firstFile.uploaded_at), "dd/MM HH:mm", { locale: ptBR })}
                    </p>
                  )}

                  {/* Preview */}
                  <div className="relative aspect-square bg-muted rounded-md overflow-hidden mb-2">
                    {firstImageFile ? (
                      <>
                        <img
                          src={firstImageFile.url}
                          alt={`v${version}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                        <div className="hidden items-center justify-center h-full">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    {files.length > 1 && (
                      <div className="absolute bottom-1 right-1 bg-background/80 text-xs px-1.5 py-0.5 rounded">
                        +{files.length - 1}
                      </div>
                    )}
                  </div>

                  {/* File count */}
                  <p className="text-xs text-center text-muted-foreground">
                    {files.length} arquivo{files.length !== 1 ? 's' : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selection summary */}
        <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <p className="text-sm">
            <strong>Selecionados:</strong> {selectedVersions.size} versão{selectedVersions.size !== 1 ? 'ões' : ''} ({selectedFilesCount} arquivo{selectedFilesCount !== 1 ? 's' : ''})
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedVersions.size === 0}
          >
            Enviar Selecionados
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
