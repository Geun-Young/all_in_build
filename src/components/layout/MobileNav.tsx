'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';

const TABS = [
  { label: '공사현장', value: 'site' },
  { label: '견적관리', value: 'estimate' },
  { label: '도면설계', value: 'blueprint' },
];

export default function MobileNav() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const activeTab = searchParams.get('tab') ?? 'site';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e5e7eb] flex">
      {TABS.map(({ label, value }) => (
        <Link
          key={value}
          href={`/projects/${id}?tab=${value}`}
          className={`flex-1 flex flex-col items-center justify-center transition-colors ${
            activeTab === value ? 'text-[#1e3a5f] font-medium' : 'text-[#9ca3af]'
          }`}
          style={{ minHeight: '56px', fontSize: '13px' }}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
