import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type DesignMode = 'classic' | 'crm';

interface DesignModeContextType {
  designMode: DesignMode;
  setDesignMode: (mode: DesignMode) => void;
  isCRMMode: boolean;
}

const DesignModeContext = createContext<DesignModeContextType | undefined>(undefined);

export function DesignModeProvider({ children }: { children: ReactNode }) {
  const [designMode, setDesignModeState] = useState<DesignMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('design-mode') as DesignMode;
      if (saved === 'classic' || saved === 'crm') return saved;
    }
    return 'classic';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('design-classic', 'design-crm');
    root.classList.add(`design-${designMode}`);
    localStorage.setItem('design-mode', designMode);
  }, [designMode]);

  const setDesignMode = (mode: DesignMode) => {
    setDesignModeState(mode);
  };

  return (
    <DesignModeContext.Provider value={{ 
      designMode, 
      setDesignMode, 
      isCRMMode: designMode === 'crm' 
    }}>
      {children}
    </DesignModeContext.Provider>
  );
}

export function useDesignMode() {
  const context = useContext(DesignModeContext);
  if (!context) {
    throw new Error('useDesignMode must be used within DesignModeProvider');
  }
  return context;
}
