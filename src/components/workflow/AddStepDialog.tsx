import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { WorkflowStep } from "@/types/workflow";

interface AddStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (step: Omit<WorkflowStep, 'order'>, position: number) => void;
  currentStepsCount: number;
}

export function AddStepDialog({ open, onOpenChange, onAdd, currentStepsCount }: AddStepDialogProps) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [position, setPosition] = useState(currentStepsCount.toString());

  const handleSubmit = () => {
    if (!label.trim()) return;

    const newStep: Omit<WorkflowStep, 'order'> = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      label: label.trim(),
      enabled: true,
      is_custom: true,
      description: description.trim() || undefined,
    };

    onAdd(newStep, parseInt(position));
    
    // Reset form
    setLabel("");
    setDescription("");
    setPosition(currentStepsCount.toString());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nova Etapa Customizada
          </DialogTitle>
          <DialogDescription>
            Adicione uma nova etapa personalizada ao workflow
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="label">Nome da Etapa *</Label>
            <Input
              id="label"
              placeholder="Ex: Validação de Dados"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Descreva o propósito desta etapa..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Posição de Inserção</Label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger id="position">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: currentStepsCount + 1 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {i === 0 ? "Início (primeira etapa)" : 
                     i === currentStepsCount ? "Fim (última etapa)" :
                     `Após etapa ${i}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!label.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Etapa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}