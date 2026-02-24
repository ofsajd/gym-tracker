import { cn } from '@/lib/utils';

type BadgeProps = {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
  className?: string;
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        {
          'bg-primary text-primary-foreground': variant === 'default',
          'bg-success text-success-foreground': variant === 'success',
          'bg-warning text-warning-foreground': variant === 'warning',
          'bg-destructive text-destructive-foreground': variant === 'destructive',
          'bg-secondary text-secondary-foreground': variant === 'secondary',
        },
        className
      )}
    >
      {children}
    </span>
  );
}
