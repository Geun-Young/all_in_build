import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

type DivProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, children, ...props }: DivProps) {
  return (
    <div
      className={cn(
        'bg-white border border-[#e5e7eb] rounded-xl shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: DivProps) {
  return (
    <div className={cn('px-5 py-4 border-b border-[#e5e7eb]', className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: DivProps) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  );
}
