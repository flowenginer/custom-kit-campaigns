import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useDesignMode } from '@/contexts/DesignModeContext';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'purple' | 'pink' | 'green' | 'orange' | 'blue';
  className?: string;
}

const variantStyles = {
  purple: {
    gradient: 'from-purple-500 to-purple-600',
    light: 'bg-purple-100 text-purple-600',
  },
  pink: {
    gradient: 'from-pink-500 to-pink-600',
    light: 'bg-pink-100 text-pink-600',
  },
  green: {
    gradient: 'from-emerald-500 to-emerald-600',
    light: 'bg-emerald-100 text-emerald-600',
  },
  orange: {
    gradient: 'from-orange-500 to-orange-600',
    light: 'bg-orange-100 text-orange-600',
  },
  blue: {
    gradient: 'from-blue-500 to-blue-600',
    light: 'bg-blue-100 text-blue-600',
  },
};

export function KPICard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend, 
  variant = 'purple',
  className 
}: KPICardProps) {
  const { isCRM } = useDesignMode();
  const styles = variantStyles[variant];

  return (
    <Card className={cn(
      'overflow-hidden transition-all duration-300',
      isCRM && 'shadow-lg hover:shadow-xl border-0 hover:-translate-y-1',
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <div className={cn(
                'flex items-center text-xs font-medium',
                trend.isPositive ? 'text-emerald-600' : 'text-red-500'
              )}>
                <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%</span>
                <span className="ml-1 text-muted-foreground">vs período anterior</span>
              </div>
            )}
          </div>
          <div className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full',
            isCRM 
              ? `bg-gradient-to-br ${styles.gradient} text-white shadow-lg` 
              : styles.light
          )}>
            <Icon className="h-7 w-7" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
