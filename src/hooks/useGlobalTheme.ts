import { useState, useEffect } from 'react';
import { GlobalTheme, GLOBAL_THEMES } from '@/lib/themes';
import { hexToHSL } from '@/lib/colorUtils';
import { toast } from 'sonner';

export const useGlobalTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<GlobalTheme>(GLOBAL_THEMES[0]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Carregar tema salvo do localStorage
    const savedThemeId = localStorage.getItem('global-theme-id');
    if (savedThemeId) {
      const theme = GLOBAL_THEMES.find(t => t.id === savedThemeId);
      if (theme) {
        setCurrentTheme(theme);
        applyTheme(theme);
      }
    }
    setIsLoading(false);
  }, []);

  const applyTheme = (theme: GlobalTheme) => {
    const root = document.documentElement;
    
    // Converter cores hex para HSL e aplicar
    const bgHSL = hexToHSL(theme.colors.pageBackground);
    const cardHSL = hexToHSL(theme.colors.cardBackground);
    const primaryHSL = hexToHSL(theme.colors.primary);
    const primaryFgHSL = hexToHSL(theme.colors.primaryForeground);
    const accentHSL = hexToHSL(theme.colors.accent);
    const accentFgHSL = hexToHSL(theme.colors.accentForeground);
    const textHSL = hexToHSL(theme.colors.text);
    const textMutedHSL = hexToHSL(theme.colors.textMuted);
    const borderHSL = hexToHSL(theme.colors.border);
    
    // Aplicar variáveis CSS
    root.style.setProperty('--background', `${bgHSL.h} ${bgHSL.s}% ${bgHSL.l}%`);
    root.style.setProperty('--card', `${cardHSL.h} ${cardHSL.s}% ${cardHSL.l}%`);
    root.style.setProperty('--card-foreground', `${textHSL.h} ${textHSL.s}% ${textHSL.l}%`);
    root.style.setProperty('--primary', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
    root.style.setProperty('--primary-foreground', `${primaryFgHSL.h} ${primaryFgHSL.s}% ${primaryFgHSL.l}%`);
    root.style.setProperty('--accent', `${accentHSL.h} ${accentHSL.s}% ${accentHSL.l}%`);
    root.style.setProperty('--accent-foreground', `${accentFgHSL.h} ${accentFgHSL.s}% ${accentFgHSL.l}%`);
    root.style.setProperty('--foreground', `${textHSL.h} ${textHSL.s}% ${textHSL.l}%`);
    root.style.setProperty('--muted-foreground', `${textMutedHSL.h} ${textMutedHSL.s}% ${textMutedHSL.l}%`);
    root.style.setProperty('--border', `${borderHSL.h} ${borderHSL.s}% ${borderHSL.l}%`);
  };

  const changeTheme = (themeId: string) => {
    const theme = GLOBAL_THEMES.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      applyTheme(theme);
      localStorage.setItem('global-theme-id', themeId);
      toast.success(`Tema "${theme.name}" aplicado com sucesso!`);
    }
  };

  return { currentTheme, changeTheme, isLoading };
};
