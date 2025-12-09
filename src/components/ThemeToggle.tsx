import { Moon, Sun } from 'lucide-react';
import { useCRMTheme } from '@/contexts/CRMThemeContext';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, toggleTheme, isLight } = useCRMTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative p-2 rounded-lg transition-all duration-300",
        isLight 
          ? "bg-white/20 hover:bg-white/30 border border-white/30" 
          : "bg-muted hover:bg-muted/80 border border-border/50"
      )}
      aria-label={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
    >
      <div className="relative w-5 h-5">
        <Sun 
          size={20} 
          className={cn(
            "absolute inset-0 transition-all duration-300",
            isLight ? "text-white" : "text-amber-500",
            theme === 'light' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 rotate-90 scale-0'
          )} 
        />
        <Moon 
          size={20} 
          className={cn(
            "absolute inset-0 transition-all duration-300",
            isLight ? "text-white" : "text-primary",
            theme === 'dark' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-0'
          )} 
        />
      </div>
    </button>
  );
}
