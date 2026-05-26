'use client';

import { useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { calcFinalAmount } from '@/lib/calcFinalAmount';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

function fmt(n: number) {
  return n.toLocaleString('ko-KR');
}

export default function CostSheetPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const labor    = Number(searchParams.get('labor') ?? 0);
  const material = Number(searchParams.get('material') ?? 0);
  const expense  = Number(searchParams.get('expense') ?? 0);
  const name     = searchParams.get('name') ?? '견적서';

  const result = useMemo(
    () => calcFinalAmount(material, labor, expense),
    [labor, material, expense]
  );

  const id = params.id as string;

  function handleExcelExport() {
    const { 상세: d } = result;
    const rows: [string, string, number][] = [
      ['재료비', 'A', result.재료비],
      ['직접노무비', '4', result.직접노무비],
      ['간접노무비 (직접노무비 × 16.5%)', '5', result.간접노무비],
      ['노무비 소계', 'B', result.노무비소계],
      ['직접경비', '6', expense],
      ['산재보험료 (노무비×3.56%)', '', d.산재보험료],
      ['고용보험료 (노무비×1.01%)', '', d.고용보험료],
      ['건강보험료 (직접노무비×3.595%)', '', d.건강보험료],
      ['연금보험료 (직접노무비×4.75%)', '', d.연금보험료],
      ['노인장기요양보험료 (건강보험료×13.14%)', '', d.노인장기요양보험료],
      ['퇴직공제부금비 (직접노무비×2.3%)', '', d.퇴직공제부금비],
      ['건설기계대여금 ((A+직접노무비+직접경비)×0.4%)', '', d.건설기계대여금],
      ['산업안전보건관리비 ((A+직접노무비+직접경비)×3.15%)', '', d.산업안전보건관리비],
      ['환경보전비 ((A+직접노무비+직접경비)×0.8%)', '', d.환경보전비],
      ['하도급대금지급보증 ((A+직접노무비+직접경비)×0.081%)', '', d.하도급대금지급보증],
      ['석면분담금 (노무비×0.006%)', '', d.석면분담금],
      ['임금채권부담금 (노무비×0.09%)', '', d.임금채권부담금],
      ['기타경비 ((A+B)×5.2%)', '', d.기타경비],
      ['경비 소계', 'C', result.경비소계],
      ['순공사원가 (A+B+C)', 'D', result.순공사원가],
      ['일반관리비 (순공사원가×8%)', 'E', result.일반관리비],
      ['이윤 ((B+C+E)×15%)', 'F', result.이윤],
      ['총원가 (D+E+F)', 'G', result.총원가],
      ['부가가치세 (총원가×10%)', 'H', result.부가가치세],
      ['최종 도급액 (G+H)', 'I', result.최종도급액],
    ];

    const ws = XLSX.utils.aoa_to_sheet([
      ['항목', '기호', '금액(원)'],
      ...rows,
    ]);
    ws['!cols'] = [{ wch: 50 }, { wch: 6 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '원가계산서');
    XLSX.writeFile(wb, `${name}_원가계산서.xlsx`);
  }

  const 상세행: { label: string; rate: string; value: number }[] = [
    { label: '직접경비', rate: '', value: expense },
    { label: '산재보험료', rate: '노무비×3.56%', value: result.상세.산재보험료 },
    { label: '고용보험료', rate: '노무비×1.01%', value: result.상세.고용보험료 },
    { label: '건강보험료', rate: '직접노무비×3.595%', value: result.상세.건강보험료 },
    { label: '연금보험료', rate: '직접노무비×4.75%', value: result.상세.연금보험료 },
    { label: '노인장기요양보험료', rate: '건강보험료×13.14%', value: result.상세.노인장기요양보험료 },
    { label: '퇴직공제부금비', rate: '직접노무비×2.3%', value: result.상세.퇴직공제부금비 },
    { label: '건설기계대여금', rate: '(A+직접노무비+직접경비)×0.4%', value: result.상세.건설기계대여금 },
    { label: '산업안전보건관리비', rate: '×3.15%', value: result.상세.산업안전보건관리비 },
    { label: '환경보전비', rate: '×0.8%', value: result.상세.환경보전비 },
    { label: '하도급대금지급보증', rate: '×0.081%', value: result.상세.하도급대금지급보증 },
    { label: '석면분담금', rate: '노무비×0.006%', value: result.상세.석면분담금 },
    { label: '임금채권부담금', rate: '노무비×0.09%', value: result.상세.임금채권부담금 },
    { label: '기타경비', rate: '(A+B)×5.2%', value: result.상세.기타경비 },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc]">
      {/* 헤더 */}
      <header className="h-14 bg-white border-b border-[#e5e7eb] flex items-center px-4 gap-3 flex-shrink-0">
        <button
          onClick={() => router.push(`/estimate/${id}`)}
          className="p-1.5 rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="flex-1 text-base font-medium text-[#111827]">원가계산서</h1>
        <p className="text-sm text-[#6b7280] hidden sm:block">{name}</p>
        <button
          onClick={handleExcelExport}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[#e5e7eb] rounded-lg text-[#374151] hover:bg-[#f3f4f6] transition-colors"
        >
          <FileSpreadsheet size={13} />
          엑셀 출력
        </button>
      </header>

      {/* 본문 */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <table className="w-full bg-white border border-[#e5e7eb] rounded-xl overflow-hidden text-sm">
            <thead>
              <tr className="bg-[#f0f4f9]">
                <th className="px-4 py-3 text-left text-[#374151] font-medium">항목</th>
                <th className="px-3 py-3 text-center text-[#374151] font-medium w-8">기호</th>
                <th className="px-4 py-3 text-right text-[#374151] font-medium">금액 (원)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f6]">

              {/* 재료비 */}
              <Row label="재료비" sym="A" value={result.재료비} bold />

              {/* 노무비 */}
              <Row label="직접노무비" sym="4" value={result.직접노무비} />
              <Row label="간접노무비" rate="직접노무비×16.5%" sym="5" value={result.간접노무비} sub />
              <Row label="노무비 소계" sym="B" value={result.노무비소계} bold />

              {/* 경비 */}
              {상세행.map((r) => (
                <Row key={r.label} label={r.label} rate={r.rate} value={r.value} sub />
              ))}
              <Row label="경비 소계" sym="C" value={result.경비소계} bold />

              {/* 소계 이하 */}
              <Row label="순공사원가" rate="A+B+C" sym="D" value={result.순공사원가} bold accent />
              <Row label="일반관리비" rate="순공사원가×8%" sym="E" value={result.일반관리비} />
              <Row label="이윤" rate="(B+C+E)×15%" sym="F" value={result.이윤} />
              <Row label="총원가" rate="D+E+F" sym="G" value={result.총원가} bold />
              <Row label="부가가치세" rate="총원가×10%" sym="H" value={result.부가가치세} />

              {/* 최종 */}
              <tr className="bg-[#1e3a5f]">
                <td className="px-4 py-3.5 text-white font-semibold">최종 도급액</td>
                <td className="px-3 py-3.5 text-center text-[#93c5fd] font-medium">I</td>
                <td className="px-4 py-3.5 text-right text-white font-bold text-base">
                  {fmt(result.최종도급액)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 입력 기준값 안내 */}
          <div className="mt-4 bg-white border border-[#e5e7eb] rounded-xl p-4">
            <p className="text-xs font-medium text-[#374151] mb-2">내역서 합계 (입력 기준)</p>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-[#9ca3af]">직접노무비</p>
                <p className="font-medium text-[#374151] mt-0.5">{fmt(labor)}원</p>
              </div>
              <div>
                <p className="text-[#9ca3af]">재료비</p>
                <p className="font-medium text-[#374151] mt-0.5">{fmt(material)}원</p>
              </div>
              <div>
                <p className="text-[#9ca3af]">직접경비</p>
                <p className="font-medium text-[#374151] mt-0.5">{fmt(expense)}원</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RowProps {
  label: string;
  rate?: string;
  sym?: string;
  value: number;
  bold?: boolean;
  accent?: boolean;
  sub?: boolean;
}

function Row({ label, rate, sym, value, bold, accent, sub }: RowProps) {
  return (
    <tr className={accent ? 'bg-[#f0f4f9]' : sub ? '' : ''}>
      <td className={`px-4 py-2.5 ${sub ? 'pl-8 text-[#6b7280]' : bold ? 'font-semibold text-[#111827]' : 'text-[#374151]'}`}>
        {label}
        {rate && <span className="ml-1.5 text-[#9ca3af] text-xs">({rate})</span>}
      </td>
      <td className="px-3 py-2.5 text-center text-[#9ca3af] text-xs">{sym}</td>
      <td className={`px-4 py-2.5 text-right tabular-nums ${bold ? 'font-semibold text-[#1e3a5f]' : sub ? 'text-[#6b7280]' : 'text-[#374151]'}`}>
        {fmt(value)}
      </td>
    </tr>
  );
}
