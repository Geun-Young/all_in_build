'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';

interface MachineCost {
  id: string;
  name: string;
  spec: string;
  labor_cost: number;
  material_cost: number;
  expense_cost: number;
  total_cost: number;
}

function fmt(n: number) { return n.toLocaleString('ko-KR'); }

export default function MachineCostsPage() {
  const router = useRouter();
  const [data, setData] = useState<MachineCost[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/machine-costs');
      setData(await res.json());
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc]">
      <header className="h-14 bg-white border-b border-[#e5e7eb] flex items-center px-4 gap-3 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="flex-1 text-base font-medium text-[#111827]">기계경비총괄표</h1>
        <p className="text-xs text-[#9ca3af] hidden sm:block">2025년 하반기 기준 · 시간당 단가(원)</p>
        <button
          onClick={load}
          className="p-1.5 rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
          title="새로고침"
        >
          <RefreshCw size={16} />
        </button>
      </header>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <p className="text-center text-sm text-[#9ca3af] py-16">불러오는 중...</p>
          ) : (
            <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#f0f4f9] border-b border-[#e5e7eb]">
                    <th className="px-4 py-3 text-left text-[#374151] font-medium">장비명</th>
                    <th className="px-3 py-3 text-left text-[#374151] font-medium">규격</th>
                    <th className="px-3 py-3 text-right text-[#374151] font-medium">노무비</th>
                    <th className="px-3 py-3 text-right text-[#374151] font-medium">재료비</th>
                    <th className="px-3 py-3 text-right text-[#374151] font-medium">경비</th>
                    <th className="px-4 py-3 text-right text-[#374151] font-medium">합계 (hr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f4f6]">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-[#9ca3af]">데이터가 없습니다</td>
                    </tr>
                  ) : (
                    data.map((m, i) => (
                      <tr key={m.id} className={i % 2 === 0 ? '' : 'bg-[#fafafa]'}>
                        <td className="px-4 py-3 text-[#111827] font-medium">{m.name}</td>
                        <td className="px-3 py-3 text-[#6b7280]">{m.spec}</td>
                        <td className="px-3 py-3 text-right text-[#374151] tabular-nums">
                          {m.labor_cost > 0 ? fmt(m.labor_cost) : <span className="text-[#d1d5db]">—</span>}
                        </td>
                        <td className="px-3 py-3 text-right text-[#374151] tabular-nums">{fmt(m.material_cost)}</td>
                        <td className="px-3 py-3 text-right text-[#374151] tabular-nums">{fmt(m.expense_cost)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#1e3a5f] tabular-nums">{fmt(m.total_cost)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {data.length > 0 && (
                  <tfoot>
                    <tr className="bg-[#f0f4f9] border-t-2 border-[#1e3a5f]">
                      <td className="px-4 py-2.5 text-xs text-[#6b7280]" colSpan={2}>총 {data.length}개 장비</td>
                      <td className="px-3 py-2.5 text-right text-xs text-[#6b7280] tabular-nums">
                        {fmt(data.reduce((s, m) => s + m.labor_cost, 0))}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-[#6b7280] tabular-nums">
                        {fmt(data.reduce((s, m) => s + m.material_cost, 0))}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-[#6b7280] tabular-nums">
                        {fmt(data.reduce((s, m) => s + m.expense_cost, 0))}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#1e3a5f] text-sm tabular-nums">
                        {fmt(data.reduce((s, m) => s + m.total_cost, 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 기준 정보 */}
          <div className="mt-4 bg-white border border-[#e5e7eb] rounded-xl p-4">
            <p className="text-xs font-medium text-[#374151] mb-2">적용 기준</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[#6b7280]">
              <div><span className="font-medium text-[#374151]">경유</span> 1,393원/ℓ</div>
              <div><span className="font-medium text-[#374151]">휘발유</span> 1,511원/ℓ</div>
              <div><span className="font-medium text-[#374151]">달러</span> 1,387.7원</div>
              <div><span className="font-medium text-[#374151]">환율기준</span> 2025.9.1</div>
            </div>
            <p className="text-xs text-[#9ca3af] mt-2">※ 금액: 소수 1미만 절하 / 노무비 계수 0.2083 (1/8×16/12×25/20)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
