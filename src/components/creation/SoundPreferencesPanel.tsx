import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Volume2, PlayCircle } from "lucide-react";
import { useSoundNotifications } from "@/hooks/useSoundNotifications";
import { toast } from "sonner";

export const SoundPreferencesPanel = () => {
  const { preferences, isLoading, playNewCard, playStatusChange, playNewApproval, updatePreferences } = useSoundNotifications();
  
  const [localEnabled, setLocalEnabled] = useState(true);
  const [localVolume, setLocalVolume] = useState(70);
  const [localNewCardSound, setLocalNewCardSound] = useState("notification");
  const [localStatusChangeSound, setLocalStatusChangeSound] = useState("swoosh");
  const [localNewApprovalSound, setLocalNewApprovalSound] = useState("alert");

  useEffect(() => {
    if (preferences) {
      setLocalEnabled(preferences.enabled);
      setLocalVolume(preferences.volume);
      setLocalNewCardSound(preferences.new_card_sound);
      setLocalStatusChangeSound(preferences.status_change_sound);
      setLocalNewApprovalSound(preferences.new_approval_sound);
    }
  }, [preferences]);

  const handleUpdate = async (field: string, value: any) => {
    try {
      await updatePreferences({ [field]: value });
      toast.success("Preferências atualizadas!");
    } catch (error) {
      toast.error("Erro ao atualizar preferências");
    }
  };

  const soundOptions = [
    { value: "none", label: "Sem som" },
    { value: "notification", label: "Notificação" },
    { value: "swoosh", label: "Swoosh" },
    { value: "alert", label: "Alerta" },
    { value: "success", label: "Sucesso" },
  ];

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Notificações Sonoras
        </CardTitle>
        <CardDescription>
          Configure os sons para eventos importantes no sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle Global */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="enabled">Habilitar Sons</Label>
            <p className="text-sm text-muted-foreground">
              Ativar/desativar todas as notificações sonoras
            </p>
          </div>
          <Switch
            id="enabled"
            checked={localEnabled}
            onCheckedChange={(checked) => {
              setLocalEnabled(checked);
              handleUpdate("enabled", checked);
            }}
          />
        </div>

        {/* Volume */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Volume: {localVolume}%</Label>
          </div>
          <Slider
            value={[localVolume]}
            onValueChange={([value]) => setLocalVolume(value)}
            onValueCommit={([value]) => handleUpdate("volume", value)}
            max={100}
            step={5}
            disabled={!localEnabled}
          />
        </div>

        {/* Som para Novo Card */}
        <div className="space-y-2">
          <Label htmlFor="new-card-sound">Som para Novo Card</Label>
          <div className="flex gap-2">
            <Select
              value={localNewCardSound}
              onValueChange={(value) => {
                setLocalNewCardSound(value);
                handleUpdate("new_card_sound", value);
              }}
              disabled={!localEnabled}
            >
              <SelectTrigger id="new-card-sound">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {soundOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={playNewCard}
              disabled={!localEnabled || localNewCardSound === "none"}
            >
              <PlayCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Som para Troca de Status */}
        <div className="space-y-2">
          <Label htmlFor="status-change-sound">Som para Troca de Coluna</Label>
          <div className="flex gap-2">
            <Select
              value={localStatusChangeSound}
              onValueChange={(value) => {
                setLocalStatusChangeSound(value);
                handleUpdate("status_change_sound", value);
              }}
              disabled={!localEnabled}
            >
              <SelectTrigger id="status-change-sound">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {soundOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={playStatusChange}
              disabled={!localEnabled || localStatusChangeSound === "none"}
            >
              <PlayCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Som para Nova Aprovação */}
        <div className="space-y-2">
          <Label htmlFor="new-approval-sound">Som para Nova Aprovação</Label>
          <div className="flex gap-2">
            <Select
              value={localNewApprovalSound}
              onValueChange={(value) => {
                setLocalNewApprovalSound(value);
                handleUpdate("new_approval_sound", value);
              }}
              disabled={!localEnabled}
            >
              <SelectTrigger id="new-approval-sound">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {soundOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={playNewApproval}
              disabled={!localEnabled || localNewApprovalSound === "none"}
            >
              <PlayCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
