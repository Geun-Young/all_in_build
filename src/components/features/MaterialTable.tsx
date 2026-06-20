'use client';

import type { Material } from '@/types/drawing';

/**
 * 물량집계표 — 품명/규격/단위/수량 + 합계.
 * 화면 표시와 인쇄(PDF) 모두에서 재사용.
 */
export default function MaterialTable({
  materials,
  title = '물량집계표',
}: {
  materials: Material[];
  title?: string;
}) {
  if (!materials || materials.length === 0) return null;

  const totalQty = materials.reduce((s, m) => s + m.qty, 0);

  return (
    <div className="w-full">
      <h3 className="text-[15px] font-semibold text-[#111827] mb-2">{title}</h3>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-[#f8fafc] text-[#374151]">
            <th className="border border-[#e5e7eb] px-3 py-2 text-left w-12">번호</th>
            <th className="border border-[#e5e7eb] px-3 py-2 text-left">품명</th>
            <th className="border border-[#e5e7eb] px-3 py-2 text-left">규격</th>
            <th className="border border-[#e5e7eb] px-3 py-2 text-center w-16">단위</th>
            <th className="border border-[#e5e7eb] px-3 py-2 text-right w-20">수량</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((m, i) => (
            <tr key={`${m.name}-${m.spec}-${i}`} className="text-[#111827]">
              <td className="border border-[#e5e7eb] px-3 py-2 text-[#6b7280]">{i + 1}</td>
              <td className="border border-[#e5e7eb] px-3 py-2">{m.name}</td>
              <td className="border border-[#e5e7eb] px-3 py-2">{m.spec}</td>
              <td className="border border-[#e5e7eb] px-3 py-2 text-center">{m.unit}</td>
              <td className="border border-[#e5e7eb] px-3 py-2 text-right font-medium">
                {m.qty.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-[#f8fafc] font-semibold text-[#111827]">
            <td className="border border-[#e5e7eb] px-3 py-2 text-center" colSpan={4}>합계</td>
            <td className="border border-[#e5e7eb] px-3 py-2 text-right">{totalQty.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
