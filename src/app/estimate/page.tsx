'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import { Estimate } from '@/types';
import { Plus, MoreHorizontal, FileText } from 'lucide-react';

const DUMMY_ESTIMATES: Estimate[] = [
  {
    id: '1',
    estimate_name: '금고동 상수도 이설공 D150',
    status: 'confirmed',
    total_labor: 3240000,
    total_material: 1850000,
    total_expense: 420000,
    total_amount: 5510000,
    created_at: '2025-05-20',
  },
  {
    id: '2',
    estimate_name: '문화동 오수관 신설공사',
    status: 'draft',
    total_labor: 1820000,
    total_material: 960000,
    total_expense: 180000,
    total_amount: 2960000,
    created_at: '2025-05-22',
  },
];

function formatAmount(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export default function EstimatePage() {
  const router = useRouter();
  const [estimates, setEstimates] = useState<Estimate[]>(DUMMY_ESTIMATES);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  function handleDelete(id: string) {
    setEstimates((prev) => prev.filter((e) => e.id !== id));
    setOpenMenuId(null);
  }

  return (
    <div onClick={() => setOpenMenuId(null)}>
      <Header title="견적 관리" />

      <div className="p-5 space-y-4">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#6b7280]">견적서 {estimates.length}건</p>
          <Button size="sm" onClick={() => router.push('/estimate/new')}>
            <Plus size={15} className="mr-1.5" />
            새 견적서
          </Button>
        </div>

        {/* 카드 그리드 */}
        {estimates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {estimates.map((estimate) => (
              <div
                key={estimate.id}
                onClick={() => router.push(`/estimate/${estimate.id}`)}
                className="relative bg-white border border-[#e5e7eb] rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              >
                {/* 견적서명 + 상태 + ⋯ */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-2">
                    <h3 className="text-base font-medium text-[#111827] leading-snug">
                      {estimate.estimate_name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        estimate.status === 'confirmed'
                          ? 'bg-[#dbeafe] text-[#1e40af]'
                          : 'bg-[#f3f4f6] text-[#6b7280]'
                      }`}
                    >
                      {estimate.status === 'confirmed' ? '확정' : '작성중'}
                    </span>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === estimate.id ? null : estimate.id);
                        }}
                        className="p-1 rounded-lg hover:bg-[#f3f4f6] transition-colors"
                      >
                        <MoreHorizontal size={16} className="text-[#6b7280]" />
                      </button>
                      {openMenuId === estimate.id && (
                        <div className="absolute right-0 top-full mt-1 w-24 bg-white border border-[#e5e7eb] rounded-lg shadow-md z-10 overflow-hidden">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/estimate/${estimate.id}`);
                            }}
                            className="w-full px-3 py-2 text-sm text-left text-[#374151] hover:bg-[#f3f4f6] transition-colors"
                          >
                            수정
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(estimate.id);
                            }}
                            className="w-full px-3 py-2 text-sm text-left text-[#6b7280] hover:bg-[#f3f4f6] transition-colors border-t border-[#f3f4f6]"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 총 금액 */}
                <p className="text-xl font-semibold text-[#1e3a5f] mb-3">
                  {formatAmount(estimate.total_amount)}
                </p>

                {/* 소계 */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#f3f4f6]">
                  <div>
                    <p className="text-xs text-[#9ca3af] mb-0.5">노무비</p>
                    <p className="text-xs font-medium text-[#374151]">
                      {estimate.total_labor.toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9ca3af] mb-0.5">재료비</p>
                    <p className="text-xs font-medium text-[#374151]">
                      {estimate.total_material.toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9ca3af] mb-0.5">경비</p>
                    <p className="text-xs font-medium text-[#374151]">
                      {estimate.total_expense.toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>

                {/* 작성일 */}
                <p className="text-xs text-[#9ca3af] mt-3">
                  {estimate.created_at.replace(/-/g, '.')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <FileText size={40} className="text-[#d1d5db]" />
            <p className="text-sm text-[#9ca3af]">견적서가 없습니다</p>
            <Button size="sm" onClick={() => router.push('/estimate/new')}>
              <Plus size={15} className="mr-1.5" />
              새 견적서
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
