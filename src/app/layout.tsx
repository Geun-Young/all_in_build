import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'All-In Build',
  description: '건설 현장 통합 관리 플랫폼',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={geistSans.variable}>
      <body className="bg-white">
        <div className="flex min-h-screen">
          {/* 데스크탑 사이드바 */}
          <div className="hidden md:flex md:flex-shrink-0">
            <Sidebar />
          </div>

          {/* 메인 콘텐츠 */}
          <main className="flex-1 min-w-0 bg-[#f8fafc] pb-16 md:pb-0">
            {children}
          </main>
        </div>

        {/* 모바일 하단 탭바 */}
        <div className="md:hidden">
          <MobileNav />
        </div>
      </body>
    </html>
  );
}
