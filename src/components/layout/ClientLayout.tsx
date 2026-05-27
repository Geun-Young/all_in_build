'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isProjectPage = /^\/projects\/[^/]+/.test(pathname);

  return (
    <div className="flex min-h-screen">
      {isProjectPage && (
        <div className="hidden md:flex md:flex-shrink-0">
          <Suspense fallback={null}>
            <Sidebar />
          </Suspense>
        </div>
      )}

      <main className={`flex-1 min-w-0 ${isProjectPage ? 'pb-16 md:pb-0' : ''}`}>
        {children}
      </main>

      {isProjectPage && (
        <div className="md:hidden">
          <Suspense fallback={null}>
            <MobileNav />
          </Suspense>
        </div>
      )}
    </div>
  );
}
