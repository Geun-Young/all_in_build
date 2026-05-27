import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import ClientLayout from '@/components/layout/ClientLayout';

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
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
