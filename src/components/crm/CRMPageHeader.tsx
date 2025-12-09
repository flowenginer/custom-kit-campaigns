import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useDesignMode } from '@/contexts/DesignModeContext';

interface CRMPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function CRMPageHeader({ title, description, actions, className }: CRMPageHeaderProps) {
  const { isCRM } = useDesignMode();

  return (
    <div className={cn('flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div>
        <h1 className={cn(
          'text-3xl font-bold tracking-tight',
          isCRM && 'bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent'
        )}>
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
}
