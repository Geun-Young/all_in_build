'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Project } from '@/types';

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

const TABS = [
  { label: '📸 공사현장', value: 'site' },
  { label: '💰 견적관리', value: 'estimate' },
  { label: '📐 도면설계', value: 'blueprint' },
];

const ESTIMATE_SUBS = [
  { label: '📋 내역서',          value: 'ledger' },
  { label: '📊 내역서총괄표',    value: 'summary' },
  { label: '📈 일위대가총괄표',  value: 'unitprice' },
  { label: '🔧 단가산출총괄표',  value: 'calculation' },
  { label: '⚙️ 기계경비총괄표', value: 'equipment' },
  { label: '💼 원가계산서',      value: 'costsheet' },
];

export default function Sidebar() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const activeTab = searchParams.get('tab') ?? 'site';
  const activeSub = searchParams.get('sub') ?? 'ledger';
  const project = DUMMY_PROJECTS.find((p) => p.id === id);

  return (
    <aside className="w-60 flex flex-col bg-white border-r border-[#e5e7eb] min-h-screen">
      {/* 로고 */}
      <div className="h-16 flex items-center px-5 border-b border-[#e5e7eb]">
        <Link href="/">
          <img src="/new_logo.png" alt="All-In Build" style={{ height: '40px', width: 'auto' }} />
        </Link>
      </div>

      {/* 현재 공사명 */}
      {project && (
        <div className="px-5 py-3 border-b border-[#e5e7eb]">
          <p className="text-[#1e3a5f] font-semibold truncate" style={{ fontSize: '15px' }}>
            {project.name}
          </p>
        </div>
      )}

      {/* 탭 메뉴 */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {TABS.map(({ label, value }) => (
          <div key={value}>
            <Link
              href={
                value === 'estimate'
                  ? `/projects/${id}?tab=estimate&sub=ledger`
                  : `/projects/${id}?tab=${value}`
              }
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-lg transition-colors relative',
                activeTab === value
                  ? 'bg-[#f0f4f9] text-[#1e3a5f] font-medium'
                  : 'text-[#6b7280] hover:bg-[#f0f4f9] hover:text-[#1e3a5f]'
              )}
              style={{ fontSize: '15px' }}
            >
              {activeTab === value && value !== 'estimate' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#1e3a5f] rounded-r-full" />
              )}
              {label}
            </Link>

            {/* 견적관리 하위 메뉴 — 견적관리 탭 활성 시 자동 펼쳐짐 */}
            {value === 'estimate' && activeTab === 'estimate' && (
              <div className="mt-1 space-y-0.5">
                {ESTIMATE_SUBS.map((sub) => (
                  <Link
                    key={sub.value}
                    href={`/projects/${id}?tab=estimate&sub=${sub.value}`}
                    className={cn(
                      'flex items-center py-2 rounded-lg transition-colors relative',
                      activeSub === sub.value
                        ? 'text-[#1e3a5f] font-medium'
                        : 'text-[#6b7280] hover:text-[#1e3a5f]'
                    )}
                    style={{ fontSize: '15px', paddingLeft: '16px' }}
                  >
                    {activeSub === sub.value && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-[#1e3a5f] rounded-r-full" />
                    )}
                    {sub.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
