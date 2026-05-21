'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, HardHat, FileText, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/projects', label: '공사 현장', icon: HardHat },
  { href: '/estimate', label: '견적 관리', icon: FileText },
  { href: '/site-log', label: '현장 일지', icon: ClipboardList },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 flex flex-col bg-white border-r border-[#e5e7eb] min-h-screen">
      {/* 로고 */}
      <div className="h-14 flex flex-col justify-center px-5 border-b border-[#e5e7eb]">
        <span className="text-[#1e3a5f] font-bold text-lg tracking-tight">All-In Build</span>
        <div className="text-[#6b7280] text-xs font-normal mt-0.5">건설 통합 관리</div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative',
                active
                  ? 'bg-[#f0f4f9] text-[#1e3a5f] font-medium'
                  : 'text-[#6b7280] hover:bg-[#f0f4f9] hover:text-[#1e3a5f]'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#1e3a5f] rounded-r-full" />
              )}
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* 하단 버전 */}
      <div className="px-5 py-4 border-t border-[#e5e7eb]">
        <span className="text-xs text-[#9ca3af]">v0.1</span>
      </div>
    </aside>
  );
}
