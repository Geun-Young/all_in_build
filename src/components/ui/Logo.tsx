import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'dark' | 'light';   // dark = 다크 배경용(흰 텍스트), light = 흰 배경용(네이비 텍스트)
  size?: number;                // 아이콘 한 변(px)
  className?: string;
}

// 기하 아이콘 + "ALL-IN BUILD" 워드마크
export default function Logo({ variant = 'light', size = 30, className }: LogoProps) {
  const onDark = variant === 'dark';
  const boxFill = onDark ? '#ffffff' : '#1e3a5f';
  const markFg = onDark ? '#0f1e33' : '#ffffff';
  const textMain = onDark ? '#ffffff' : '#1e3a5f';
  const textSub = onDark ? '#93a4bd' : '#9ca3af';

  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      {/* 아이콘: 라운드 사각 + 관로 노드 모티프 */}
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect x="1" y="1" width="30" height="30" rx="7" fill={boxFill} />
        {/* 관로(꺾인 선) + 노드 */}
        <path d="M8 21 L8 14 L16 14 L24 8" stroke={markFg} strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="8" cy="21" r="2.4" fill={markFg} />
        <circle cx="16" cy="14" r="2.4" fill={markFg} />
        <circle cx="24" cy="8" r="2.4" fill={markFg} />
      </svg>

      {/* 워드마크 */}
      <div className="leading-none">
        <span className="block font-bold tracking-tight" style={{ color: textMain, fontSize: '17px', letterSpacing: '-0.01em' }}>
          ALL-IN BUILD
        </span>
        <span className="block font-medium mt-0.5" style={{ color: textSub, fontSize: '10px', letterSpacing: '0.12em' }}>
          현장 통합 관리
        </span>
      </div>
    </div>
  );
}
