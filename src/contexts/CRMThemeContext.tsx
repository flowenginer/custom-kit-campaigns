import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useDesignMode } from './DesignModeContext';

type CRMTheme = 'light' | 'dark';

interface CRMThemeContextType {
  theme: CRMTheme;
  toggleTheme: () => void;
  setTheme: (theme: CRMTheme) => void;
  isDark: boolean;
  isLight: boolean;
}

const CRMThemeContext = createContext<CRMThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'crm-theme';

export function CRMThemeProvider({ children }: { children: ReactNode }) {
  const { isCRM } = useDesignMode();
  const [theme, setThemeState] = useState<CRMTheme>('light');

  // Carregar tema salvo ou preferência do sistema
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as CRMTheme | null;
    if (saved && (saved === 'light' || saved === 'dark')) {
      setThemeState(saved);
    } else {
      // Verificar preferência do sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeState(prefersDark ? 'dark' : 'light');
    }
  }, []);

  // Aplicar classes no HTML apenas quando modo CRM está ativo
  useEffect(() => {
    const root = document.documentElement;
    
    if (isCRM) {
      // Aplicar tema CRM
      if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    }
    // Se não é CRM, não mexe nas classes - deixa o useGlobalTheme controlar
  }, [theme, isCRM]);

  const setTheme = (newTheme: CRMTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  return (
    <CRMThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        isDark: theme === 'dark',
        isLight: theme === 'light',
      }}
    >
      {children}
    </CRMThemeContext.Provider>
  );
}

export function useCRMTheme() {
  const context = useContext(CRMThemeContext);
  if (context === undefined) {
    throw new Error('useCRMTheme must be used within a CRMThemeProvider');
  }
  return context;
}
