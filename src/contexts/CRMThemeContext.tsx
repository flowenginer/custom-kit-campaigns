import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type CRMTheme = 'light' | 'dark';

interface CRMThemeContextType {
  theme: CRMTheme;
  toggleTheme: () => void;
  setTheme: (theme: CRMTheme) => void;
}

const CRMThemeContext = createContext<CRMThemeContextType | undefined>(undefined);

export function CRMThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<CRMTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm-theme') as CRMTheme;
      if (saved === 'light' || saved === 'dark') return saved;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    // Only apply light/dark when in CRM mode
    if (root.classList.contains('design-crm')) {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    }
    localStorage.setItem('crm-theme', theme);
  }, [theme]);

  // Listen for design mode changes to apply/remove theme classes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const root = document.documentElement;
          if (root.classList.contains('design-crm')) {
            root.classList.remove('light', 'dark');
            root.classList.add(theme);
          } else {
            root.classList.remove('light', 'dark');
          }
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, [theme]);

  const toggleTheme = () => setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  const setTheme = (newTheme: CRMTheme) => setThemeState(newTheme);

  return (
    <CRMThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </CRMThemeContext.Provider>
  );
}

export function useCRMTheme() {
  const context = useContext(CRMThemeContext);
  if (!context) {
    throw new Error('useCRMTheme must be used within CRMThemeProvider');
  }
  return context;
}
