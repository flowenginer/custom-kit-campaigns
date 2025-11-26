import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CampaignTheme {
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

const hexToHSL = (hex: string): string => {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
};

export const useCampaignTheme = (campaignId: string) => {
  const [theme, setTheme] = useState<CampaignTheme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) return;

    const loadTheme = async () => {
      try {
        const { data, error } = await supabase
          .from('campaign_themes')
          .select('*')
          .eq('campaign_id', campaignId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading theme:', error);
          return;
        }

        if (data) {
          const themeConfig: CampaignTheme = {
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
          applyTheme(themeConfig);
        }
      } catch (error) {
        console.error('Error loading campaign theme:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, [campaignId]);

  const applyTheme = (themeConfig: CampaignTheme) => {
    const root = document.documentElement;
    
    // Converter HEX para RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 0, g: 0, b: 0 };
    };
    
    // Convert hex colors to HSL and apply as CSS variables
    root.style.setProperty('--theme-primary', hexToHSL(themeConfig.theme_primary_color));
    root.style.setProperty('--theme-background', hexToHSL(themeConfig.theme_background_color));
    root.style.setProperty('--theme-text', hexToHSL(themeConfig.theme_text_color));
    root.style.setProperty('--theme-accent', hexToHSL(themeConfig.theme_accent_color));
    
    // Aplicar cor dos botões com opacidade
    const buttonRgb = hexToRgb(themeConfig.theme_button_color);
    const buttonOpacity = (themeConfig.theme_button_opacity || 100) / 100;
    root.style.setProperty('--theme-button', `rgba(${buttonRgb.r}, ${buttonRgb.g}, ${buttonRgb.b}, ${buttonOpacity})`);
    
    // Aplicar opacidades como variáveis separadas
    root.style.setProperty('--theme-primary-opacity', String(themeConfig.theme_primary_opacity || 100));
    root.style.setProperty('--theme-background-opacity', String(themeConfig.theme_background_opacity || 100));
    root.style.setProperty('--theme-text-opacity', String(themeConfig.theme_text_opacity || 100));
    root.style.setProperty('--theme-accent-opacity', String(themeConfig.theme_accent_opacity || 100));
    
    // Apply font variables
    root.style.setProperty('--theme-heading-font', themeConfig.theme_heading_font);
    root.style.setProperty('--theme-body-font', themeConfig.theme_body_font);
    root.style.setProperty('--theme-font-size', themeConfig.theme_font_size_base);
    
    // Apply layout variables
    root.style.setProperty('--theme-border-radius', themeConfig.theme_border_radius);
    root.style.setProperty('--theme-spacing', themeConfig.theme_spacing_unit);
    
    // Add button style class to body
    document.body.classList.remove('btn-style-rounded', 'btn-style-square', 'btn-style-pill');
    document.body.classList.add(`btn-style-${themeConfig.theme_button_style}`);
  };

  return { theme, loading };
};
