import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

type BadgeVariant = 'default' | '진행중' | '완료' | '대기';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

// 흰 + 네이비 + 회색 계열만 사용 (CLAUDE.md)
const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[#f3f4f6] text-[#6b7280]',
  진행중: 'bg-[#1e3a5f] text-white',            // 강조: 진한 네이비
  완료: 'bg-[#f0f4f9] text-[#1e3a5f]',           // 연 네이비
  대기: 'bg-[#f3f4f6] text-[#6b7280]',           // 회색
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
