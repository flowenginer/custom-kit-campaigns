import { useEffect } from 'react';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';

export const GlobalThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentTheme } = useGlobalTheme();

  useEffect(() => {
    // O hook já aplica o tema, este provider apenas garante que está carregado
  }, [currentTheme]);

  return <>{children}</>;
};
