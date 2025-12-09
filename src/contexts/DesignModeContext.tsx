import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type DesignMode = 'classic' | 'crm';

interface DesignModeContextType {
  designMode: DesignMode;
  setDesignMode: (mode: DesignMode) => void;
  isClassic: boolean;
  isCRM: boolean;
}

const DesignModeContext = createContext<DesignModeContextType | undefined>(undefined);

const STORAGE_KEY = 'design-mode';

export function DesignModeProvider({ children }: { children: ReactNode }) {
  const [designMode, setDesignModeState] = useState<DesignMode>('classic');
  const [isInitialized, setIsInitialized] = useState(false);

  // Carregar modo salvo do localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as DesignMode | null;
    if (saved && (saved === 'classic' || saved === 'crm')) {
      setDesignModeState(saved);
    }
    setIsInitialized(true);
  }, []);

  // Aplicar classe no documento
  useEffect(() => {
    if (!isInitialized) return;
    
    const root = document.documentElement;
    
    if (designMode === 'crm') {
      root.classList.add('design-crm');
      root.classList.remove('design-classic');
    } else {
      root.classList.add('design-classic');
      root.classList.remove('design-crm');
    }
  }, [designMode, isInitialized]);

  const setDesignMode = (mode: DesignMode) => {
    setDesignModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  };

  return (
    <DesignModeContext.Provider
      value={{
        designMode,
        setDesignMode,
        isClassic: designMode === 'classic',
        isCRM: designMode === 'crm',
      }}
    >
      {children}
    </DesignModeContext.Provider>
  );
}

export function useDesignMode() {
  const context = useContext(DesignModeContext);
  if (context === undefined) {
    throw new Error('useDesignMode must be used within a DesignModeProvider');
  }
  return context;
}
