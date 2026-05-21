import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

type BadgeVariant = 'default' | '진행중' | '완료' | '대기';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[#f3f4f6] text-[#6b7280]',
  진행중: 'bg-[#dbeafe] text-[#1e40af]',
  완료: 'bg-[#dcfce7] text-[#15803d]',
  대기: 'bg-[#f3f4f6] text-[#6b7280]',
};

export default function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
