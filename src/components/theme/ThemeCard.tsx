import { Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GlobalTheme } from '@/lib/themes';
import { cn } from '@/lib/utils';

interface ThemeCardProps {
  theme: GlobalTheme;
  isActive: boolean;
  onClick: () => void;
}

export const ThemeCard = ({ theme, isActive, onClick }: ThemeCardProps) => {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg hover:scale-102",
        isActive && "ring-2 ring-primary shadow-xl"
      )}
      onClick={onClick}
    >
      {/* Preview visual das cores */}
      <div className="h-20 relative overflow-hidden rounded-t-lg">
        <div 
          className="absolute inset-0" 
          style={{ backgroundColor: theme.colors.pageBackground }}
        />
        <div 
          className="absolute bottom-0 left-0 right-0 h-12 rounded-t-lg shadow-lg"
          style={{ backgroundColor: theme.colors.cardBackground }}
        >
          <div className="flex items-center justify-center h-full gap-1.5 px-4">
            <div 
              className="w-12 h-6 rounded shadow-sm"
              style={{ backgroundColor: theme.colors.primary }}
            />
            <div 
              className="w-10 h-6 rounded shadow-sm"
              style={{ backgroundColor: theme.colors.accent }}
            />
          </div>
        </div>
      </div>

      <CardHeader className="p-4 space-y-1">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="text-xl">{theme.emoji}</span>
          <span>{theme.name}</span>
          {isActive && <Check className="ml-auto h-4 w-4 text-primary" />}
        </CardTitle>
        <CardDescription className="text-xs">{theme.description}</CardDescription>
      </CardHeader>
    </Card>
  );
};
