'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HardHat } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MobileNav() {
  const pathname = usePathname();
  const active = pathname === '/' || pathname.startsWith('/projects');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e5e7eb] flex">
      <Link
        href="/"
        className={cn(
          'flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors',
          active ? 'text-[#1e3a5f]' : 'text-[#9ca3af]'
        )}
        style={{ minHeight: '56px' }}
      >
        <HardHat size={22} />
        <span style={{ fontSize: '13px' }}>공사 목록</span>
      </Link>
    </nav>
  );
}
