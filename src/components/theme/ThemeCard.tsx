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
        "cursor-pointer transition-all hover:shadow-lg hover:scale-105",
        isActive && "ring-2 ring-primary shadow-xl"
      )}
      onClick={onClick}
    >
      {/* Preview visual das cores */}
      <div className="h-32 relative overflow-hidden rounded-t-lg">
        <div 
          className="absolute inset-0" 
          style={{ backgroundColor: theme.colors.pageBackground }}
        />
        <div 
          className="absolute bottom-0 left-0 right-0 h-20 rounded-t-lg shadow-lg"
          style={{ backgroundColor: theme.colors.cardBackground }}
        >
          <div className="flex items-center justify-center h-full gap-2 px-4">
            <div 
              className="w-16 h-8 rounded shadow-sm"
              style={{ backgroundColor: theme.colors.primary }}
            />
            <div 
              className="w-12 h-8 rounded shadow-sm"
              style={{ backgroundColor: theme.colors.accent }}
            />
          </div>
        </div>
      </div>

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">{theme.emoji}</span>
          <span className="text-base">{theme.name}</span>
          {isActive && <Check className="ml-auto h-5 w-5 text-primary" />}
        </CardTitle>
        <CardDescription>{theme.description}</CardDescription>
      </CardHeader>
    </Card>
  );
};
