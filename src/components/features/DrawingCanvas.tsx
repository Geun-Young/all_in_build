'use client';

export interface DrawingComponent {
  type: 'kp' | 'isolation' | 'valve' | 'airvalve';
  spec: string;
  qty: number;
}

export interface DrawingSection {
  id: string;
  existingPipe: string;
  newPipe: string;
  length: number;
  components: DrawingComponent[];
}

export interface DrawingData {
  projectName: string;
  sections: DrawingSection[];
  warnings: string[];
  totalMaterials: { name: string; spec: string; unit: string; qty: number }[];
}

const SECTION_H = 120;
const PL = 72;  // padding left
const PR = 56;  // padding right
const Y_EXIST = 38;
const Y_NEW = 78;
const SVG_W = 760;

function SymbolAt({ type, cx, cy }: { type: string; cx: number; cy: number }) {
  if (type === 'kp') {
    return <circle cx={cx} cy={cy} r={7} stroke="#1e3a5f" strokeWidth={1.5} fill="white" />;
  }
  if (type === 'isolation') {
    return (
      <>
        <circle cx={cx} cy={cy} r={10} stroke="#1e3a5f" strokeWidth={1.5} fill="white" />
        <circle cx={cx} cy={cy} r={4} stroke="#1e3a5f" strokeWidth={1.5} fill="white" />
      </>
    );
  }
  if (type === 'valve') {
    return (
      <>
        <line x1={cx - 8} y1={cy - 8} x2={cx + 8} y2={cy + 8} stroke="#1e3a5f" strokeWidth={2} />
        <line x1={cx + 8} y1={cy - 8} x2={cx - 8} y2={cy + 8} stroke="#1e3a5f" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={10} stroke="#1e3a5f" strokeWidth={1.5} fill="none" />
      </>
    );
  }
  if (type === 'airvalve') {
    return (
      <polygon
        points={`${cx},${cy - 10} ${cx + 9},${cy + 5} ${cx - 9},${cy + 5}`}
        fill="#1e3a5f"
      />
    );
  }
  return null;
}

function SectionRow({ section, yOffset }: { section: DrawingSection; yOffset: number }) {
  const pipeW = SVG_W - PL - PR;

  // 기호 배치: totalQty 개를 균등 분포
  const flat: { type: string }[] = [];
  section.components.forEach((c) => {
    for (let i = 0; i < c.qty; i++) flat.push({ type: c.type });
  });
  const total = flat.length;
  const step = total > 0 ? pipeW / (total + 1) : pipeW / 2;

  return (
    <g transform={`translate(0,${yOffset})`}>
      {/* 구간 레이블 */}
      <text x={4} y={Y_EXIST + 5} fontSize={11} fill="#374151" fontWeight="600">{section.id}</text>

      {/* 기존관 실선 */}
      <line x1={PL} y1={Y_EXIST} x2={SVG_W - PR} y2={Y_EXIST} stroke="#1e3a5f" strokeWidth={2} />
      {/* 신설관 점선 */}
      <line x1={PL} y1={Y_NEW} x2={SVG_W - PR} y2={Y_NEW} stroke="#ef4444" strokeWidth={2} strokeDasharray="8,4" />

      {/* 기존관/신설관 라벨 */}
      <text x={PL - 4} y={Y_EXIST + 4} fontSize={10} fill="#1e3a5f" textAnchor="end">기존관</text>
      <text x={PL - 4} y={Y_NEW + 4} fontSize={10} fill="#ef4444" textAnchor="end">신설관</text>

      {/* 관경 + 연장 */}
      <text x={SVG_W - PR + 4} y={Y_EXIST + 4} fontSize={10} fill="#1e3a5f">{section.existingPipe}</text>
      <text x={SVG_W - PR + 4} y={Y_NEW + 4} fontSize={10} fill="#ef4444">{section.newPipe}</text>
      <text x={PL + pipeW / 2} y={Y_EXIST - 10} fontSize={10} fill="#9ca3af" textAnchor="middle">
        L={section.length}m
      </text>

      {/* 기호 */}
      {flat.map((sym, i) => (
        <SymbolAt key={i} type={sym.type} cx={PL + step * (i + 1)} cy={Y_EXIST} />
      ))}

      {/* 구간 구분선 */}
      <line x1={0} y1={SECTION_H - 1} x2={SVG_W} y2={SECTION_H - 1} stroke="#e5e7eb" strokeWidth={1} />
    </g>
  );
}

const LEGEND_ITEMS = [
  { type: 'kp', label: 'KP매커니컬접합' },
  { type: 'isolation', label: '이탈방지접합' },
  { type: 'valve', label: '제수밸브' },
  { type: 'airvalve', label: '공기밸브' },
];

export default function DrawingCanvas({ data }: { data: DrawingData }) {
  const bodyH = data.sections.length * SECTION_H;
  const legendH = 155;
  const totalH = bodyH + legendH;

  return (
    <div className="w-full overflow-auto">
      {data.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 space-y-1">
          {data.warnings.map((w, i) => (
            <p key={i} className="text-yellow-800" style={{ fontSize: '13px' }}>⚠ {w}</p>
          ))}
        </div>
      )}

      <svg
        viewBox={`0 0 ${SVG_W} ${totalH}`}
        width="100%"
        style={{ minHeight: `${Math.min(totalH, 600)}px` }}
      >
        {/* 제목 */}
        <text x={SVG_W / 2} y={18} fontSize={14} fill="#111827" fontWeight="700" textAnchor="middle">
          {data.projectName} — 상하수도 관로 계통도
        </text>

        {/* 구간들 */}
        <g transform="translate(0,28)">
          {data.sections.map((sec, i) => (
            <SectionRow key={sec.id} section={sec} yOffset={i * SECTION_H} />
          ))}
        </g>

        {/* 범례 */}
        <g transform={`translate(${SVG_W - 190},${bodyH + 36})`}>
          <rect x={-8} y={-8} width={192} height={legendH} rx={6} fill="#f8fafc" stroke="#e5e7eb" />
          <text x={88} y={10} fontSize={12} fill="#374151" fontWeight="600" textAnchor="middle">범 례</text>

          {LEGEND_ITEMS.map((item, i) => (
            <g key={item.type} transform={`translate(12,${28 + i * 26})`}>
              <SymbolAt type={item.type} cx={0} cy={0} />
              <text x={18} y={4} fontSize={11} fill="#374151">{item.label}</text>
            </g>
          ))}

          <g transform={`translate(12,${28 + LEGEND_ITEMS.length * 26 + 4})`}>
            <line x1={-8} y1={0} x2={14} y2={0} stroke="#1e3a5f" strokeWidth={2} />
            <text x={18} y={4} fontSize={11} fill="#374151">기존관 (실선)</text>
          </g>
          <g transform={`translate(12,${28 + LEGEND_ITEMS.length * 26 + 24})`}>
            <line x1={-8} y1={0} x2={14} y2={0} stroke="#ef4444" strokeWidth={2} strokeDasharray="6,3" />
            <text x={18} y={4} fontSize={11} fill="#374151">신설관 (점선)</text>
          </g>
        </g>
      </svg>
    </div>
  );
}
