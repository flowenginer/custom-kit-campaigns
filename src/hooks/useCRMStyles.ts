import { useDesignMode } from '@/contexts/DesignModeContext';
import { useCRMTheme } from '@/contexts/CRMThemeContext';

export function useCRMStyles() {
  const { isCRM } = useDesignMode();
  const { isLight, isDark } = useCRMTheme();

  return {
    isCRM,
    isLight,
    isDark,
    
    // Page background
    pageClass: isCRM ? 'bg-background' : '',
    
    // Card styles
    cardClass: isCRM ? 'shadow-lg hover:shadow-xl transition-shadow duration-300 border-0' : '',
    cardElevatedClass: isCRM ? 'shadow-xl border-0' : '',
    
    // Button styles
    buttonGradientClass: isCRM ? 'bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white border-0' : '',
    
    // KPI icon styles
    kpiIconClass: isCRM 
      ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' 
      : 'bg-primary/10 text-primary',
    
    // Header styles
    headerClass: isCRM ? 'text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent' : 'text-3xl font-bold',
    
    // Table header styles
    tableHeaderClass: isCRM ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20' : 'bg-muted',
    
    // Badge styles
    badgeGradientClass: isCRM ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0' : '',
    
    // Chart colors
    chartColors: isCRM 
      ? ['hsl(270, 70%, 60%)', 'hsl(330, 70%, 60%)', 'hsl(300, 60%, 55%)', 'hsl(250, 65%, 55%)', 'hsl(340, 65%, 60%)']
      : ['hsl(var(--chart-purple))', 'hsl(var(--chart-green))', 'hsl(var(--chart-orange))', 'hsl(var(--chart-blue))', 'hsl(var(--chart-pink))'],
    
    // Primary chart color
    primaryChartColor: isCRM ? 'hsl(270, 70%, 60%)' : 'hsl(var(--primary))',
    secondaryChartColor: isCRM ? 'hsl(330, 70%, 60%)' : 'hsl(var(--secondary))',
  };
}
