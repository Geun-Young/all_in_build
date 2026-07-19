'use client';

import { useState } from 'react';
import type { BpDoc, BpSection } from '@/lib/blueprintTypes';
import { CIRCLED, aggregateMaterials } from '@/lib/blueprintTypes';
import { SYMBOLS } from '@/lib/pipeSymbols';
import { pointAt } from '@/lib/geometry';
import ProfileView from './ProfileView';

type ResultView = 'plan' | 'detail' | 'profile' | 'materials';

export interface DrawingCanvasProps {
  doc: BpDoc;
  projectName: string;
  warnings?: string[];
}

// ── ① 평면 경로도 ─────────────────────────────────────
function PlanRouteView({ doc }: { doc: BpDoc }) {
  const verts = doc.route.vertices;
  if (verts.length < 2) {
    return <p className="text-[#9ca3af] text-center py-12" style={{ fontSize: '14px' }}>경로를 먼저 그리세요</p>;
  }
  // 비율(0~100) → viewBox 1000x640
  const VW = 1000, VH = 640;
  const X = (x: number) => (x / 100) * VW;
  const Y = (y: number) => (y / 100) * VH;
  return (
    <div className="w-full overflow-auto">
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ background: 'white', display: 'block' }}>
        <text x={VW / 2} y={22} textAnchor="middle" fontSize={15} fill="#111827" fontWeight="700">관로 평면 경로도 (모식도)</text>
        {/* 경로 폴리라인 */}
        <polyline
          points={verts.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')}
          fill="none" stroke="#ef4444" strokeWidth={3} strokeDasharray="10,5" strokeLinejoin="round"
        />
        {/* 구간별 관경 콜아웃 (구간 중앙) */}
        {doc.sections.map((s) => {
          const mid = pointAt(verts, (s.t0 + s.t1) / 2);
          return (
            <g key={s.id}>
              <rect x={X(mid.x) - 34} y={Y(mid.y) - 28} width={68} height={20} rx={3} fill="#1e3a5f" />
              <text x={X(mid.x)} y={Y(mid.y) - 14} textAnchor="middle" fontSize={11} fill="white" fontWeight="600">{s.newPipe}</text>
            </g>
          );
        })}
        {/* 격점 마커 (기호는 메인 경로엔 없음 — 각 구간 상세도 참조) */}
        {doc.nodes.map((n, i) => {
          const p = pointAt(verts, n.t);
          return (
            <g key={n.id}>
              <circle cx={X(p.x)} cy={Y(p.y)} r={9} fill="#ef4444" stroke="white" strokeWidth={2} />
              <text x={X(p.x)} y={Y(p.y) + 3} textAnchor="middle" fontSize={9} fill="white" fontWeight="700">{i + 1}</text>
              <text x={X(p.x) + 12} y={Y(p.y) - 8} fontSize={11} fill="#1e3a5f" fontWeight="600">{n.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── ② 구간 상세도 (PDF 격점상세도 스타일) ──────────────
// detailRoute 폴리라인 형상 + 그 위 기호. detailRoute가 없으면 안내.
function SectionDetail({ section }: { section: BpSection }) {
  const W = 760, H = 300, PAD = 40;
  const dv = section.detailRoute.vertices;
  const syms = [...section.symbols].sort((a, b) => a.t - b.t);

  // detailRoute 비율(0~100) → 뷰박스 좌표(여백 PAD, 헤더 아래)
  const X = (x: number) => PAD + (x / 100) * (W - PAD * 2);
  const Y = (y: number) => 40 + (y / 100) * (H - 40 - PAD);

  return (
    <div className="rounded-xl shadow-sm overflow-hidden mb-4 bg-white">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        <rect x={W - 82} y={6} width={76} height={22} fill="#ef4444" rx={2} />
        <text x={W - 44} y={21} textAnchor="middle" fontSize={11} fill="white" fontWeight="700">{section.label}</text>
        <text x={PAD} y={21} fontSize={11} fill="#6b7280">
          {section.material} · {section.existingPipe}→{section.newPipe} · L={section.length}m · 심도 -{section.depthStart}~-{section.depthEnd}m
        </text>

        {dv.length < 2 ? (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={13} fill="#9ca3af">상세경로 미설계 — 3단계에서 이 구간을 열어 그리세요</text>
        ) : (
          <>
            {/* 상세 관로(신설) 폴리라인 */}
            <polyline points={dv.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')}
              fill="none" stroke="#1e3a5f" strokeWidth={2.5} strokeLinejoin="round" />
            {/* 기호 + 번호 */}
            {syms.map((sym, i) => {
              const p = pointAt(dv, sym.t);
              return (
                <g key={sym.id}>
                  {SYMBOLS[sym.type].render(X(p.x), Y(p.y), false)}
                  <text x={X(p.x)} y={Y(p.y) - 16} textAnchor="middle" fontSize={11} fill="#1e3a5f">{CIRCLED[i] ?? `${i + 1}`}</text>
                </g>
              );
            })}
          </>
        )}
      </svg>
    </div>
  );
}

// ── 결과 컴포넌트 ─────────────────────────────────────
export default function DrawingCanvas({ doc, projectName, warnings = [] }: DrawingCanvasProps) {
  const [view, setView] = useState<ResultView>('plan');
  const materials = aggregateMaterials(
    doc.sections,
    (t) => SYMBOLS[t].name,
    (t) => SYMBOLS[t].unit,
  );

  const TABS: { key: ResultView; label: string }[] = [
    { key: 'plan', label: '① 평면 경로도' },
    { key: 'detail', label: '② 구간 상세도' },
    { key: 'profile', label: '③ 종단면도' },
    { key: 'materials', label: '④ 자재집계표' },
  ];

  return (
    <div className="w-full">
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-yellow-800" style={{ fontSize: '13px' }}>⚠ {w}</p>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`px-3 rounded-lg transition-colors ${
              view === t.key ? 'bg-[#1e3a5f] text-white' : 'border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]'
            }`} style={{ height: '34px', fontSize: '13px' }}>
            {t.label}
          </button>
        ))}
        <span className="ml-auto text-[#9ca3af]" style={{ fontSize: '12px' }}>{projectName}</span>
      </div>

      {view === 'plan' && <PlanRouteView doc={doc} />}

      {view === 'detail' && (
        doc.sections.length === 0
          ? <p className="text-[#9ca3af] text-center py-12" style={{ fontSize: '14px' }}>구간을 먼저 설정하세요</p>
          : doc.sections.map((s) => <SectionDetail key={s.id} section={s} />)
      )}

      {view === 'profile' && <ProfileView sections={doc.sections} />}

      {view === 'materials' && (
        materials.length === 0
          ? <p className="text-[#9ca3af] text-center py-12" style={{ fontSize: '14px' }}>배치된 자재가 없습니다</p>
          : (
            <table className="w-full border-collapse" style={{ fontSize: '13px' }}>
              <thead>
                <tr className="bg-[#f8fafc] text-[#6b7280]">
                  <th className="border border-[#e5e7eb] px-3 py-2 text-left">품명</th>
                  <th className="border border-[#e5e7eb] px-3 py-2 text-left">규격</th>
                  <th className="border border-[#e5e7eb] px-3 py-2 text-center">단위</th>
                  <th className="border border-[#e5e7eb] px-3 py-2 text-right">수량</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m, i) => (
                  <tr key={i} className="text-[#374151]">
                    <td className="border border-[#e5e7eb] px-3 py-2">{m.name}</td>
                    <td className="border border-[#e5e7eb] px-3 py-2">{m.spec}</td>
                    <td className="border border-[#e5e7eb] px-3 py-2 text-center">{m.unit}</td>
                    <td className="border border-[#e5e7eb] px-3 py-2 text-right font-semibold text-[#1e3a5f]">{m.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
      )}
    </div>
  );
}
