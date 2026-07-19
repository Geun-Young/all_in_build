'use client';

import type { BpSection } from '@/lib/blueprintTypes';

// 종단면도: x=누적 연장(m), y=GL 기준 심도(m). 각 격점에서 depth로 꺾이는 폴리라인.
const W = 800;
const H = 320;
const PL = 64;   // 좌측 여백(축 라벨)
const PR = 24;
const PT = 36;   // GL 라인 위 여백
const PB = 48;   // 하단 축 라벨

export default function ProfileView({ sections }: { sections: BpSection[] }) {
  if (sections.length === 0) {
    return <p className="text-[#9ca3af] text-center py-12" style={{ fontSize: '14px' }}>구간을 먼저 설정하세요</p>;
  }

  // 누적 연장 / 최대 심도
  const cum = [0];
  sections.forEach((s) => cum.push(cum[cum.length - 1] + (s.length || 0)));
  const totalLen = cum[cum.length - 1] || 1;
  const maxDepth = Math.max(1, ...sections.flatMap((s) => [s.depthStart, s.depthEnd])) * 1.2;

  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const xAt = (m: number) => PL + (m / totalLen) * plotW;
  const yAt = (d: number) => PT + (d / maxDepth) * plotH;  // 심도 클수록 아래로

  // 관저(파이프) 폴리라인 점들: 각 구간 시작/끝
  const pts: { x: number; y: number }[] = [];
  sections.forEach((s, i) => {
    pts.push({ x: xAt(cum[i]), y: yAt(s.depthStart) });
    pts.push({ x: xAt(cum[i + 1]), y: yAt(s.depthEnd) });
  });

  const glY = yAt(0);

  return (
    <div className="w-full overflow-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: 'white', display: 'block' }}>
        {/* 제목 */}
        <text x={W / 2} y={20} textAnchor="middle" fontSize={13} fill="#111827" fontWeight="700">종단면도 (심도)</text>

        {/* GL 지표선 */}
        <line x1={PL} y1={glY} x2={W - PR} y2={glY} stroke="#374151" strokeWidth={2} />
        <text x={PL - 8} y={glY + 4} textAnchor="end" fontSize={10} fill="#6b7280">GL</text>

        {/* 심도 눈금 */}
        {[0.5, 1, 1.5, 2].filter((d) => d <= maxDepth).map((d) => (
          <g key={d}>
            <line x1={PL} y1={yAt(d)} x2={W - PR} y2={yAt(d)} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="3,3" />
            <text x={PL - 8} y={yAt(d) + 3} textAnchor="end" fontSize={9} fill="#9ca3af">-{d}m</text>
          </g>
        ))}

        {/* 관저 폴리라인(신설관) */}
        <polyline
          points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none" stroke="#1e3a5f" strokeWidth={2.5} strokeLinejoin="round"
        />

        {/* 격점 수직선 + 라벨 + 구간 정보 */}
        {sections.map((s, i) => {
          const x0 = xAt(cum[i]);
          const x1 = xAt(cum[i + 1]);
          const xm = (x0 + x1) / 2;
          return (
            <g key={s.id}>
              {/* 시작 격점 수직선 */}
              <line x1={x0} y1={glY} x2={x0} y2={yAt(s.depthStart)} stroke="#9ca3af" strokeWidth={1} strokeDasharray="2,2" />
              {/* 격점 마커 */}
              <circle cx={x0} cy={yAt(s.depthStart)} r={3} fill="#ef4444" />
              {/* 구간 라벨/관경/연장 */}
              <text x={xm} y={H - PB + 16} textAnchor="middle" fontSize={10} fill="#1e3a5f" fontWeight="600">{s.label}</text>
              <text x={xm} y={H - PB + 30} textAnchor="middle" fontSize={9} fill="#6b7280">{s.newPipe} · L={s.length}m</text>
              {/* 심도 텍스트 */}
              <text x={x0} y={yAt(s.depthStart) - 6} textAnchor="middle" fontSize={9} fill="#374151">-{s.depthStart}m</text>
              {i === sections.length - 1 && (
                <>
                  <line x1={x1} y1={glY} x2={x1} y2={yAt(s.depthEnd)} stroke="#9ca3af" strokeWidth={1} strokeDasharray="2,2" />
                  <circle cx={x1} cy={yAt(s.depthEnd)} r={3} fill="#ef4444" />
                  <text x={x1} y={yAt(s.depthEnd) - 6} textAnchor="middle" fontSize={9} fill="#374151">-{s.depthEnd}m</text>
                </>
              )}
            </g>
          );
        })}

        {/* x축 라벨 */}
        <text x={(PL + W - PR) / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="#9ca3af">누적 연장 (총 {totalLen}m)</text>
      </svg>
    </div>
  );
}
