import { useState } from "react";
import { DesignTask } from "@/types/design-task";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBusinessSegments } from "@/hooks/useBusinessSegments";

interface BusinessSegmentFieldProps {
  task: DesignTask;
  onTaskUpdated: () => void;
}

export const BusinessSegmentField = ({ task, onTaskUpdated }: BusinessSegmentFieldProps) => {
  const [editing, setEditing] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>(
    task.business_segment_id || (task.business_segment_other ? 'other' : '')
  );
  const [customSegment, setCustomSegment] = useState(task.business_segment_other || '');
  const [saving, setSaving] = useState(false);

  const { data: businessSegments, isLoading } = useBusinessSegments(true);

  // Só mostrar se for campanha Adventure ou já tiver segmento definido
  const isAdventureCampaign = task.segment_tag === 'adventure_';
  const hasBusinessSegment = task.business_segment_id || task.business_segment_other;

  if (!isAdventureCampaign && !hasBusinessSegment) {
    return null;
  }

  const handleSave = async () => {
    if (!task.lead_id) {
      toast.error("Lead não encontrado");
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        business_segment_id: selectedSegmentId === 'other' ? null : selectedSegmentId || null,
        business_segment_other: selectedSegmentId === 'other' ? customSegment : null,
      };

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', task.lead_id);

      if (error) throw error;

      toast.success("Segmento atualizado!");
      setEditing(false);
      onTaskUpdated();
    } catch (error) {
      console.error("Error updating segment:", error);
      toast.error("Erro ao atualizar segmento");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedSegmentId(task.business_segment_id || (task.business_segment_other ? 'other' : ''));
    setCustomSegment(task.business_segment_other || '');
    setEditing(false);
  };

  // Determinar valor atual para exibição
  const currentSegmentDisplay = task.business_segment_name 
    || task.business_segment_other 
    || "Não definido";
  const currentSegmentIcon = task.business_segment_icon || "";

  return (
    <div>
      <div className="flex items-center gap-1">
        <Label className="text-xs text-muted-foreground">Segmento do Cliente</Label>
        {!editing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setEditing(true)}
          >
            <Edit className="h-3 w-3" />
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2 mt-1">
          <Select
            value={selectedSegmentId}
            onValueChange={(value) => {
              setSelectedSegmentId(value);
              if (value !== 'other') {
                setCustomSegment('');
              }
            }}
            disabled={isLoading || saving}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um segmento" />
            </SelectTrigger>
            <SelectContent>
              {businessSegments?.map((seg) => (
                <SelectItem key={seg.id} value={seg.id}>
                  {seg.icon} {seg.name}
                </SelectItem>
              ))}
              <SelectItem value="other">📦 Outros (personalizado)</SelectItem>
            </SelectContent>
          </Select>

          {selectedSegmentId === 'other' && (
            <Input
              placeholder="Digite o segmento personalizado..."
              value={customSegment}
              onChange={(e) => setCustomSegment(e.target.value)}
              disabled={saving}
            />
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || (!selectedSegmentId && !customSegment)}
            >
              <Check className="h-3 w-3 mr-1" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
            >
              <X className="h-3 w-3 mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm font-medium">
          {currentSegmentIcon} {currentSegmentDisplay}
        </p>
      )}
    </div>
  );
};
