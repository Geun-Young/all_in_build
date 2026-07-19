'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Camera, Calculator, PenTool,
  FileText, Table2, ClipboardList, Settings, Wallet,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Project } from '@/types';
import Logo from '@/components/ui/Logo';

const DUMMY_PROJECTS: Project[] = [
  {
    id: '1',
    name: '중부관내4구역',
    client: '중부사업소',
    contractor: '칠성건설(주)',
    location: '대전시 중구 문화동 311~20',
    type: '상수도',
    status: '진행중',
    startDate: '2025-03-01',
    endDate: '2025-06-30',
    photoCount: 7,
    createdAt: '2025-03-01',
  },
  {
    id: '2',
    name: '유성구 관평동 상수도 관로 교체',
    client: '유성사업소',
    contractor: '칠성건설(주)',
    location: '대전시 유성구 관평동',
    type: '상수도',
    status: '완료',
    startDate: '2025-01-15',
    endDate: '2025-04-30',
    photoCount: 23,
    createdAt: '2025-01-15',
  },
  {
    id: '3',
    name: '서구 둔산동 급수관 신설',
    client: '서부사업소',
    contractor: '칠성건설(주)',
    location: '대전시 서구 둔산동',
    type: '상수도',
    status: '대기',
    startDate: '2025-06-01',
    endDate: '2025-09-30',
    photoCount: 0,
    createdAt: '2025-06-01',
  },
];

const TABS: { label: string; value: string; icon: LucideIcon }[] = [
  { label: '공사현장', value: 'site', icon: Camera },
  { label: '견적관리', value: 'estimate', icon: Calculator },
  { label: '도면설계', value: 'blueprint', icon: PenTool },
];

const ESTIMATE_SUBS: { label: string; value: string; icon: LucideIcon }[] = [
  { label: '내역서',        value: 'ledger',      icon: FileText },
  { label: '내역서총괄표',   value: 'summary',     icon: Table2 },
  { label: '일위대가총괄표', value: 'unitprice',   icon: ClipboardList },
  { label: '단가산출총괄표', value: 'calculation', icon: Calculator },
  { label: '기계경비총괄표', value: 'equipment',   icon: Settings },
  { label: '원가계산서',     value: 'costsheet',   icon: Wallet },
];

export default function Sidebar() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const activeTab = searchParams.get('tab') ?? 'site';
  const activeSub = searchParams.get('sub') ?? 'ledger';
  const project = DUMMY_PROJECTS.find((p) => p.id === id);

  return (
    <aside className="w-60 flex flex-col bg-[#0f1e33] min-h-screen">
      {/* 로고 */}
      <div className="h-20 flex items-center px-5 border-b border-white/10">
        <Link href="/">
          <Logo variant="dark" />
        </Link>
      </div>

      {/* 현재 공사명 */}
      {project && (
        <div className="px-5 py-3 border-b border-white/10">
          <p className="text-[#93a4bd] mb-0.5" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>현재 공사</p>
          <p className="text-white font-semibold truncate" style={{ fontSize: '14px' }}>
            {project.name}
          </p>
        </div>
      )}

      {/* 탭 메뉴 */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {TABS.map(({ label, value, icon: Icon }) => {
          const active = activeTab === value;
          return (
            <div key={value}>
              <Link
                href={
                  value === 'estimate'
                    ? `/projects/${id}?tab=estimate&sub=ledger`
                    : `/projects/${id}?tab=${value}`
                }
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative',
                  active
                    ? 'bg-[#1e3a5f] text-white font-medium'
                    : 'text-[#cbd5e1] hover:bg-[#152844] hover:text-white'
                )}
                style={{ fontSize: '14px' }}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-white rounded-r-full" />
                )}
                <Icon size={17} className="flex-shrink-0" />
                {label}
              </Link>

              {/* 견적관리 하위 메뉴 */}
              {value === 'estimate' && active && (
                <div className="mt-1 space-y-0.5">
                  {ESTIMATE_SUBS.map(({ label, value: sv, icon: SubIcon }) => {
                    const subActive = activeSub === sv;
                    return (
                      <Link
                        key={sv}
                        href={`/projects/${id}?tab=estimate&sub=${sv}`}
                        className={cn(
                          'flex items-center gap-2.5 py-2 rounded-lg transition-colors relative pl-9 pr-3',
                          subActive
                            ? 'text-white font-medium bg-[#152844]'
                            : 'text-[#93a4bd] hover:text-white hover:bg-[#152844]'
                        )}
                        style={{ fontSize: '13px' }}
                      >
                        <SubIcon size={14} className="flex-shrink-0" />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
