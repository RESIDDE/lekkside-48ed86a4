import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatsCard({ title, value, subtitle, icon, className }: StatsCardProps) {
  return (
    <div className={cn(
      'bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow',
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1.5">{value}</p>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="w-11 h-11 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
