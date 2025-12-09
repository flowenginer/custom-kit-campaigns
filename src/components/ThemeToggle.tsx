import { Moon, Sun } from 'lucide-react';
import { useCRMTheme } from '@/contexts/CRMThemeContext';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, toggleTheme } = useCRMTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className="relative p-2.5 rounded-xl bg-muted hover:bg-muted/80 transition-all duration-300 border border-border/50"
      aria-label={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
    >
      <div className="relative w-5 h-5">
        <Sun 
          size={20} 
          className={cn(
            "absolute inset-0 text-amber-500 transition-all duration-300",
            theme === 'light' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 rotate-90 scale-0'
          )} 
        />
        <Moon 
          size={20} 
          className={cn(
            "absolute inset-0 text-primary transition-all duration-300",
            theme === 'dark' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-0'
          )} 
        />
      </div>
    </button>
  );
}
