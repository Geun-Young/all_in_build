'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Camera, Calculator, PenTool, type LucideIcon } from 'lucide-react';

const TABS: { label: string; value: string; icon: LucideIcon }[] = [
  { label: '공사현장', value: 'site', icon: Camera },
  { label: '견적관리', value: 'estimate', icon: Calculator },
  { label: '도면설계', value: 'blueprint', icon: PenTool },
];

export default function MobileNav() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const activeTab = searchParams.get('tab') ?? 'site';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e5e7eb] flex">
      {TABS.map(({ label, value, icon: Icon }) => {
        const active = activeTab === value;
        return (
          <Link
            key={value}
            href={`/projects/${id}?tab=${value}`}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
              active ? 'text-[#1e3a5f] font-medium' : 'text-[#9ca3af]'
            }`}
            style={{ minHeight: '56px', fontSize: '12px' }}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
