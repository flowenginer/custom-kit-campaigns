import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VisualOverrides } from "@/hooks/useCampaignVisualOverrides";

interface VisualOverridePanelProps {
  stepId: string;
  overrides: VisualOverrides;
  onChange: (overrides: VisualOverrides) => void;
}

export function VisualOverridePanel({ stepId, overrides, onChange }: VisualOverridePanelProps) {
  const updateOverride = (path: string[], value: string) => {
    const newOverrides = { ...overrides };
    let current: any = newOverrides;
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    onChange(newOverrides);
  };

  const isGlobal = stepId === "global";

  return (
    <div className="space-y-6">
      {isGlobal ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>Configure o logo da campanha</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="logo-url">URL do Logo</Label>
                <Input
                  id="logo-url"
                  value={overrides.logo?.url || ""}
                  onChange={(e) => updateOverride(["logo", "url"], e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="logo-height">Altura do Logo (px)</Label>
                <Input
                  id="logo-height"
                  value={overrides.logo?.height || "48"}
                  onChange={(e) => updateOverride(["logo", "height"], e.target.value)}
                  placeholder="48"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cores Globais</CardTitle>
              <CardDescription>Defina as cores principais da campanha</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="primary-color">Cor Primária</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary-color"
                    type="color"
                    value={overrides.primaryColor || "#ff0000"}
                    onChange={(e) => updateOverride(["primaryColor"], e.target.value)}
                    className="w-20"
                  />
                  <Input
                    value={overrides.primaryColor || "#ff0000"}
                    onChange={(e) => updateOverride(["primaryColor"], e.target.value)}
                    placeholder="#ff0000"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="bg-color">Cor de Fundo</Label>
                <div className="flex gap-2">
                  <Input
                    id="bg-color"
                    type="color"
                    value={overrides.backgroundColor || "#ffffff"}
                    onChange={(e) => updateOverride(["backgroundColor"], e.target.value)}
                    className="w-20"
                  />
                  <Input
                    value={overrides.backgroundColor || "#ffffff"}
                    onChange={(e) => updateOverride(["backgroundColor"], e.target.value)}
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Título Principal</CardTitle>
              <CardDescription>Texto que aparece no topo da seção</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="heading-text">Texto</Label>
                <Input
                  id="heading-text"
                  value={overrides.heading?.text || ""}
                  onChange={(e) => updateOverride(["heading", "text"], e.target.value)}
                  placeholder="Digite o título"
                />
              </div>
              <div>
                <Label htmlFor="heading-color">Cor do Título</Label>
                <div className="flex gap-2">
                  <Input
                    id="heading-color"
                    type="color"
                    value={overrides.heading?.color || "#333333"}
                    onChange={(e) => updateOverride(["heading", "color"], e.target.value)}
                    className="w-20"
                  />
                  <Input
                    value={overrides.heading?.color || "#333333"}
                    onChange={(e) => updateOverride(["heading", "color"], e.target.value)}
                    placeholder="#333333"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {stepId === "select_type" && (
            <Card>
              <CardHeader>
                <CardTitle>Imagens dos Cards</CardTitle>
                <CardDescription>URLs das imagens para cada tipo de uniforme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="card-ziper">Zíper</Label>
                  <Input
                    id="card-ziper"
                    value={overrides.cardImages?.ziper || ""}
                    onChange={(e) => updateOverride(["cardImages", "ziper"], e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="card-manga-curta">Manga Curta</Label>
                  <Input
                    id="card-manga-curta"
                    value={overrides.cardImages?.manga_curta || ""}
                    onChange={(e) => updateOverride(["cardImages", "manga_curta"], e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="card-regata">Regata</Label>
                  <Input
                    id="card-regata"
                    value={overrides.cardImages?.regata || ""}
                    onChange={(e) => updateOverride(["cardImages", "regata"], e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="card-manga-longa">Manga Longa</Label>
                  <Input
                    id="card-manga-longa"
                    value={overrides.cardImages?.manga_longa || ""}
                    onChange={(e) => updateOverride(["cardImages", "manga_longa"], e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {(stepId === "enter_name" || stepId === "enter_phone") && (
            <Card>
              <CardHeader>
                <CardTitle>Campos de Entrada</CardTitle>
                <CardDescription>Customize os textos do formulário</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="placeholder">Placeholder</Label>
                  <Input
                    id="placeholder"
                    value={overrides.placeholder || ""}
                    onChange={(e) => updateOverride(["placeholder"], e.target.value)}
                    placeholder="Digite aqui..."
                  />
                </div>
                {stepId === "enter_phone" && (
                  <div>
                    <Label htmlFor="help-text">Texto de Ajuda</Label>
                    <Textarea
                      id="help-text"
                      value={overrides.helpText || ""}
                      onChange={(e) => updateOverride(["helpText"], e.target.value)}
                      placeholder="Texto que aparece abaixo do campo"
                      rows={3}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
