export interface GlobalTheme {
  id: string;
  name: string;
  emoji: string;
  description: string;
  colors: {
    pageBackground: string;
    cardBackground: string;
    primary: string;
    primaryForeground: string;
    accent: string;
    accentForeground: string;
    text: string;
    textMuted: string;
    border: string;
  };
}

export const GLOBAL_THEMES: GlobalTheme[] = [
  {
    id: 'ocean',
    name: 'Azul Oceano',
    emoji: '🌊',
    description: 'Profissional e calmo',
    colors: {
      pageBackground: '#E0F2FE',
      cardBackground: '#FFFFFF',
      primary: '#0284C7',
      primaryForeground: '#FFFFFF',
      accent: '#06B6D4',
      accentForeground: '#FFFFFF',
      text: '#1F2937',
      textMuted: '#6B7280',
      border: '#E5E7EB',
    },
  },
  {
    id: 'forest',
    name: 'Verde Floresta',
    emoji: '🌲',
    description: 'Natural e fresco',
    colors: {
      pageBackground: '#DCFCE7',
      cardBackground: '#FFFFFF',
      primary: '#16A34A',
      primaryForeground: '#FFFFFF',
      accent: '#10B981',
      accentForeground: '#FFFFFF',
      text: '#1F2937',
      textMuted: '#6B7280',
      border: '#E5E7EB',
    },
  },
  {
    id: 'purple',
    name: 'Roxo Noturno',
    emoji: '🌙',
    description: 'Criativo e moderno',
    colors: {
      pageBackground: '#F3E8FF',
      cardBackground: '#FFFFFF',
      primary: '#9333EA',
      primaryForeground: '#FFFFFF',
      accent: '#A855F7',
      accentForeground: '#FFFFFF',
      text: '#1F2937',
      textMuted: '#6B7280',
      border: '#E5E7EB',
    },
  },
  {
    id: 'energy',
    name: 'Vermelho Energia',
    emoji: '🔥',
    description: 'Dinâmico e vibrante',
    colors: {
      pageBackground: '#FEE2E2',
      cardBackground: '#FFFFFF',
      primary: '#DC2626',
      primaryForeground: '#FFFFFF',
      accent: '#F97316',
      accentForeground: '#FFFFFF',
      text: '#1F2937',
      textMuted: '#6B7280',
      border: '#E5E7EB',
    },
  },
  {
    id: 'solar',
    name: 'Amarelo Solar',
    emoji: '☀️',
    description: 'Alegre e energético',
    colors: {
      pageBackground: '#FEF3C7',
      cardBackground: '#FFFFFF',
      primary: '#F59E0B',
      primaryForeground: '#FFFFFF',
      accent: '#FBBF24',
      accentForeground: '#FFFFFF',
      text: '#1F2937',
      textMuted: '#6B7280',
      border: '#E5E7EB',
    },
  },
  {
    id: 'pink',
    name: 'Rosa Suave',
    emoji: '🌸',
    description: 'Delicado e acolhedor',
    colors: {
      pageBackground: '#FCE7F3',
      cardBackground: '#FFFFFF',
      primary: '#EC4899',
      primaryForeground: '#FFFFFF',
      accent: '#F472B6',
      accentForeground: '#FFFFFF',
      text: '#1F2937',
      textMuted: '#6B7280',
      border: '#E5E7EB',
    },
  },
  {
    id: 'turquoise',
    name: 'Turquesa Tropical',
    emoji: '🏝️',
    description: 'Refrescante e moderno',
    colors: {
      pageBackground: '#CCFBF1',
      cardBackground: '#FFFFFF',
      primary: '#14B8A6',
      primaryForeground: '#FFFFFF',
      accent: '#2DD4BF',
      accentForeground: '#FFFFFF',
      text: '#1F2937',
      textMuted: '#6B7280',
      border: '#E5E7EB',
    },
  },
  {
    id: 'corporate',
    name: 'Cinza Corporativo',
    emoji: '🌆',
    description: 'Sóbrio e profissional',
    colors: {
      pageBackground: '#F3F4F6',
      cardBackground: '#FFFFFF',
      primary: '#6B7280',
      primaryForeground: '#FFFFFF',
      accent: '#9CA3AF',
      accentForeground: '#FFFFFF',
      text: '#1F2937',
      textMuted: '#6B7280',
      border: '#E5E7EB',
    },
  },
  {
    id: 'orange',
    name: 'Laranja Vibrante',
    emoji: '🍊',
    description: 'Criativo e amigável',
    colors: {
      pageBackground: '#FFEDD5',
      cardBackground: '#FFFFFF',
      primary: '#EA580C',
      primaryForeground: '#FFFFFF',
      accent: '#FB923C',
      accentForeground: '#FFFFFF',
      text: '#1F2937',
      textMuted: '#6B7280',
      border: '#E5E7EB',
    },
  },
  {
    id: 'royal',
    name: 'Azul Real',
    emoji: '💙',
    description: 'Confiável e elegante',
    colors: {
      pageBackground: '#DBEAFE',
      cardBackground: '#FFFFFF',
      primary: '#1D4ED8',
      primaryForeground: '#FFFFFF',
      accent: '#3B82F6',
      accentForeground: '#FFFFFF',
      text: '#1F2937',
      textMuted: '#6B7280',
      border: '#E5E7EB',
    },
  },
];
