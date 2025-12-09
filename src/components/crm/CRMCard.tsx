import * as React from "react";
import { cn } from "@/lib/utils";
import { useDesignMode } from "@/contexts/DesignModeContext";

interface CRMCardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  hover?: boolean;
}

const CRMCard = React.forwardRef<HTMLDivElement, CRMCardProps>(
  ({ className, elevated = false, hover = true, ...props }, ref) => {
    const { isCRM } = useDesignMode();
    
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card text-card-foreground",
          isCRM ? [
            'shadow-lg border-0',
            hover && 'hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5',
            elevated && 'shadow-xl',
          ] : 'shadow-sm',
          className
        )}
        {...props}
      />
    );
  }
);
CRMCard.displayName = "CRMCard";

const CRMCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CRMCardHeader.displayName = "CRMCardHeader";

const CRMCardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    const { isCRM } = useDesignMode();
    
    return (
      <h3
        ref={ref}
        className={cn(
          "text-2xl font-semibold leading-none tracking-tight",
          isCRM && "bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent",
          className
        )}
        {...props}
      />
    );
  }
);
CRMCardTitle.displayName = "CRMCardTitle";

const CRMCardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
);
CRMCardDescription.displayName = "CRMCardDescription";

const CRMCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CRMCardContent.displayName = "CRMCardContent";

const CRMCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
);
CRMCardFooter.displayName = "CRMCardFooter";

export { CRMCard, CRMCardHeader, CRMCardFooter, CRMCardTitle, CRMCardDescription, CRMCardContent };
