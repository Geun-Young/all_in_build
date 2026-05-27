'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HardHat } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const pathname = usePathname();
  const active = pathname === '/' || pathname.startsWith('/projects');

  return (
    <aside className="w-60 flex flex-col bg-white border-r border-[#e5e7eb] min-h-screen">
      <div className="h-16 flex flex-col justify-center px-5 border-b border-[#e5e7eb]">
        <span className="text-[#1e3a5f] font-bold text-lg tracking-tight">All-In Build</span>
        <div className="text-[#6b7280] text-xs font-normal mt-0.5">건설 통합 관리</div>
      </div>

      <nav className="flex-1 py-4 px-3">
        <Link
          href="/"
          className={cn(
            'flex items-center gap-3 px-3 py-3 rounded-lg text-base transition-colors relative',
            active
              ? 'bg-[#f0f4f9] text-[#1e3a5f] font-medium'
              : 'text-[#6b7280] hover:bg-[#f0f4f9] hover:text-[#1e3a5f]'
          )}
        >
          {active && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#1e3a5f] rounded-r-full" />
          )}
          <HardHat size={20} />
          공사 목록
        </Link>
      </nav>

      <div className="px-5 py-4 border-t border-[#e5e7eb]">
        <span className="text-xs text-[#9ca3af]">All-In Build v0.1</span>
      </div>
    </aside>
  );
}
