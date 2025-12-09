import { useDesignMode, DesignMode } from '@/contexts/DesignModeContext';
import { cn } from '@/lib/utils';
import { Palette, Sparkles } from 'lucide-react';

const designs: { id: DesignMode; name: string; description: string; icon: typeof Palette }[] = [
  { 
    id: 'classic', 
    name: 'Clássico', 
    description: '13 temas com cores variadas',
    icon: Palette
  },
  { 
    id: 'crm', 
    name: 'CRM Moderno', 
    description: 'Roxo/Rosa com modo claro/escuro',
    icon: Sparkles
  },
];

export function DesignModeSwitcher() {
  const { designMode, setDesignMode } = useDesignMode();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {designs.map((design) => {
        const Icon = design.icon;
        const isSelected = designMode === design.id;
        
        return (
          <button
            key={design.id}
            onClick={() => setDesignMode(design.id)}
            className={cn(
              "relative p-4 rounded-xl border-2 text-left transition-all duration-300",
              isSelected 
                ? "border-primary bg-primary/5 shadow-lg" 
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            {isSelected && (
              <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-primary animate-pulse" />
            )}
            
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              
              <div className="flex-1">
                <h3 className={cn(
                  "font-semibold",
                  isSelected && "text-primary"
                )}>
                  {design.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {design.description}
                </p>
              </div>
            </div>
            
            {/* Preview visual */}
            <div className="mt-4 flex gap-2">
              {design.id === 'classic' ? (
                <>
                  <div className="w-6 h-6 rounded bg-blue-500" />
                  <div className="w-6 h-6 rounded bg-green-500" />
                  <div className="w-6 h-6 rounded bg-orange-500" />
                  <div className="w-6 h-6 rounded bg-slate-700" />
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded bg-gradient-to-r from-purple-500 to-pink-500" />
                  <div className="w-6 h-6 rounded bg-purple-600" />
                  <div className="w-6 h-6 rounded bg-pink-500" />
                  <div className="w-6 h-6 rounded bg-slate-900" />
                </>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
