/**
 * Converts a hex color to HSL format
 */
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert to RGB
  let r = parseInt(hex.slice(0, 2), 16) / 255;
  let g = parseInt(hex.slice(2, 4), 16) / 255;
  let b = parseInt(hex.slice(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Generates 7 color shades from darkest to lightest
 */
export function generateColorShades(baseColor: string): string[] {
  const hsl = hexToHSL(baseColor);
  
  // Progressive lightness: 35% → 45% → 53% → 60% → 67% → 74% → 80%
  const lightnessLevels = [35, 45, 53, 60, 67, 74, 80];
  
  return lightnessLevels.map(lightness => 
    `hsl(${hsl.h}, ${hsl.s}%, ${lightness}%)`
  );
}

/**
 * Predefined color palettes
 */
export const PRESET_PALETTES = {
  verde: {
    name: 'Verde',
    base: '#059669',
    preview: '🟢',
  },
  vermelho: {
    name: 'Vermelho',
    base: '#dc2626',
    preview: '🔴',
  },
  amarelo: {
    name: 'Amarelo',
    base: '#ca8a04',
    preview: '🟡',
  },
  azul: {
    name: 'Azul',
    base: '#2563eb',
    preview: '🔵',
  },
  roxo: {
    name: 'Roxo',
    base: '#9333ea',
    preview: '🟣',
  },
  laranja: {
    name: 'Laranja',
    base: '#ea580c',
    preview: '🟠',
  },
  rosa: {
    name: 'Rosa',
    base: '#ec4899',
    preview: '🩷',
  },
};
