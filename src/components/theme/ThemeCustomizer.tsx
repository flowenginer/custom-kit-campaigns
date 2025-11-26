import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ColorPickerWithOpacity } from "@/components/customization/ColorPickerWithOpacity";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Palette, Save } from "lucide-react";

interface ThemeConfig {
  theme_primary_color: string;
  theme_background_color: string;
  theme_text_color: string;
  theme_accent_color: string;
  theme_button_color: string;
  theme_primary_opacity: number;
  theme_background_opacity: number;
  theme_text_opacity: number;
  theme_accent_opacity: number;
  theme_button_opacity: number;
  theme_heading_font: string;
  theme_body_font: string;
  theme_font_size_base: string;
  theme_border_radius: string;
  theme_spacing_unit: string;
  theme_button_style: 'rounded' | 'square' | 'pill';
}

interface ThemeCustomizerProps {
  campaignId: string;
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter (Sans-serif)' },
  { value: 'Roboto', label: 'Roboto (Sans-serif)' },
  { value: 'Poppins', label: 'Poppins (Sans-serif)' },
  { value: 'Montserrat', label: 'Montserrat (Sans-serif)' },
  { value: 'Playfair Display', label: 'Playfair Display (Serif)' },
  { value: 'Merriweather', label: 'Merriweather (Serif)' },
];

const DEFAULT_THEME: ThemeConfig = {
  theme_primary_color: '#FF0000',
  theme_background_color: '#FAFBFF',
  theme_text_color: '#1A1F36',
  theme_accent_color: '#34A853',
  theme_button_color: '#4F9CF9',
  theme_primary_opacity: 100,
  theme_background_opacity: 100,
  theme_text_opacity: 100,
  theme_accent_opacity: 100,
  theme_button_opacity: 100,
  theme_heading_font: 'Inter',
  theme_body_font: 'Inter',
  theme_font_size_base: '16px',
  theme_border_radius: '12px',
  theme_spacing_unit: '8px',
  theme_button_style: 'rounded',
};

export const ThemeCustomizer = ({ campaignId }: ThemeCustomizerProps) => {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTheme();
  }, [campaignId]);

  const loadTheme = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_themes')
        .select('*')
        .eq('campaign_id', campaignId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        const themeConfig: ThemeConfig = {
          theme_primary_color: data.theme_primary_color,
          theme_background_color: data.theme_background_color,
          theme_text_color: data.theme_text_color,
          theme_accent_color: data.theme_accent_color,
          theme_button_color: data.theme_button_color || '#4F9CF9',
          theme_primary_opacity: data.theme_primary_opacity || 100,
          theme_background_opacity: data.theme_background_opacity || 100,
          theme_text_opacity: data.theme_text_opacity || 100,
          theme_accent_opacity: data.theme_accent_opacity || 100,
          theme_button_opacity: data.theme_button_opacity || 100,
          theme_heading_font: data.theme_heading_font,
          theme_body_font: data.theme_body_font,
          theme_font_size_base: data.theme_font_size_base,
          theme_border_radius: data.theme_border_radius,
          theme_spacing_unit: data.theme_spacing_unit,
          theme_button_style: data.theme_button_style as 'rounded' | 'square' | 'pill',
        };
        setTheme(themeConfig);
      }
    } catch (error: any) {
      console.error('Erro ao carregar tema:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('campaign_themes')
        .upsert({
          campaign_id: campaignId,
          ...theme,
        }, {
          onConflict: 'campaign_id'
        });

      if (error) throw error;

      toast.success('Tema salvo com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar tema: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTheme(DEFAULT_THEME);
    toast.info('Tema restaurado para os valores padrão');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Palette className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Personalizar Tema da Campanha</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cores do Tema</CardTitle>
          <CardDescription>
            Defina as cores principais que serão aplicadas em toda a campanha
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ColorPickerWithOpacity
            label="Cor Principal (Primary)"
            value={theme.theme_primary_color}
            opacity={theme.theme_primary_opacity}
            onColorChange={(color) => setTheme({ ...theme, theme_primary_color: color })}
            onOpacityChange={(opacity) => setTheme({ ...theme, theme_primary_opacity: opacity })}
          />
          <ColorPickerWithOpacity
            label="Cor de Fundo (Background)"
            value={theme.theme_background_color}
            opacity={theme.theme_background_opacity}
            onColorChange={(color) => setTheme({ ...theme, theme_background_color: color })}
            onOpacityChange={(opacity) => setTheme({ ...theme, theme_background_opacity: opacity })}
          />
          <ColorPickerWithOpacity
            label="Cor do Texto (Text)"
            value={theme.theme_text_color}
            opacity={theme.theme_text_opacity}
            onColorChange={(color) => setTheme({ ...theme, theme_text_color: color })}
            onOpacityChange={(opacity) => setTheme({ ...theme, theme_text_opacity: opacity })}
          />
          <ColorPickerWithOpacity
            label="Cor de Destaque (Accent)"
            value={theme.theme_accent_color}
            opacity={theme.theme_accent_opacity}
            onColorChange={(color) => setTheme({ ...theme, theme_accent_color: color })}
            onOpacityChange={(opacity) => setTheme({ ...theme, theme_accent_opacity: opacity })}
          />
          <ColorPickerWithOpacity
            label="Cor dos Botões"
            value={theme.theme_button_color}
            opacity={theme.theme_button_opacity}
            onColorChange={(color) => setTheme({ ...theme, theme_button_color: color })}
            onOpacityChange={(opacity) => setTheme({ ...theme, theme_button_opacity: opacity })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipografia</CardTitle>
          <CardDescription>
            Configure as fontes e tamanhos de texto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Fonte dos Títulos</Label>
            <Select
              value={theme.theme_heading_font}
              onValueChange={(value) => setTheme({ ...theme, theme_heading_font: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fonte do Corpo</Label>
            <Select
              value={theme.theme_body_font}
              onValueChange={(value) => setTheme({ ...theme, theme_body_font: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Layout e Estilo</CardTitle>
          <CardDescription>
            Ajuste o estilo dos elementos da interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Estilo dos Botões</Label>
            <Select
              value={theme.theme_button_style}
              onValueChange={(value: any) => setTheme({ ...theme, theme_button_style: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rounded">Arredondado (Rounded)</SelectItem>
                <SelectItem value="square">Quadrado (Square)</SelectItem>
                <SelectItem value="pill">Pílula (Pill)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Raio da Borda</Label>
            <Select
              value={theme.theme_border_radius}
              onValueChange={(value) => setTheme({ ...theme, theme_border_radius: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0px">Sem Arredondamento</SelectItem>
                <SelectItem value="4px">Pequeno (4px)</SelectItem>
                <SelectItem value="8px">Médio (8px)</SelectItem>
                <SelectItem value="12px">Grande (12px)</SelectItem>
                <SelectItem value="16px">Extra Grande (16px)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleReset} disabled={saving}>
          Resetar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Tema
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
