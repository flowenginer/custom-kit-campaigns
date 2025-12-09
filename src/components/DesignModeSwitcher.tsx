import { useDesignMode, DesignMode } from '@/contexts/DesignModeContext';
import { cn } from '@/lib/utils';
import { Palette, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface DesignOption {
  id: DesignMode;
  name: string;
  description: string;
  icon: typeof Palette;
  gradient: string;
}

const designOptions: DesignOption[] = [
  {
    id: 'classic',
    name: 'Design Clássico',
    description: '13 temas coloridos com troca rápida',
    icon: Palette,
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'crm',
    name: 'Design CRM',
    description: 'Roxo/Rosa moderno com modo claro/escuro',
    icon: Sparkles,
    gradient: 'from-purple-500 to-pink-500',
  },
];

export function DesignModeSwitcher() {
  const { designMode, setDesignMode } = useDesignMode();

  const handleChange = (mode: DesignMode) => {
    setDesignMode(mode);
    const option = designOptions.find(o => o.id === mode);
    toast.success(`${option?.name} ativado!`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {designOptions.map((option) => {
        const Icon = option.icon;
        const isActive = designMode === option.id;
        
        return (
          <button
            key={option.id}
            onClick={() => handleChange(option.id)}
            className={cn(
              "relative p-6 rounded-2xl border-2 transition-all duration-300 text-left",
              "hover:scale-[1.02] hover:shadow-lg",
              isActive
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border/50 bg-card hover:border-primary/50"
            )}
          >
            {/* Indicador ativo */}
            {isActive && (
              <div className="absolute top-3 right-3">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              </div>
            )}
            
            {/* Ícone com gradiente */}
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
              "bg-gradient-to-br shadow-lg",
              option.gradient
            )}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            
            {/* Texto */}
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {option.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {option.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
