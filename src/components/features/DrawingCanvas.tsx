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

// ── 레이아웃 상수 ──────────────────────────────────────
const SVG_W = 800;
const SECTION_H = 210;   // 구간 1개 높이
const P_TOP = 28;        // 섹션 내부 상단 패딩
const PL = 80;           // 좌측 여백 (레이블용)
const PR = 100;          // 우측 여백 (관경 텍스트용)

// 구간 내 Y 좌표 (yOffset + P_TOP 기준의 상대값)
const Y_ARROW  = 28;  // 연장 화살표
const Y_EXIST  = 68;  // 기존관
const Y_NEW    = 118; // 신설관
const Y_SYM    = 150; // 기호 중심
const Y_NUM    = 172; // 번호
const Y_DIV    = 196; // 구간 구분선

const CIRCLED = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮'];

type SymbolType = 'kp' | 'isolation' | 'valve' | 'airvalve';

// ── 기호 SVG ─────────────────────────────────────────
function Sym({ type, cx, cy }: { type: SymbolType; cx: number; cy: number }) {
  if (type === 'kp') return (
    <circle cx={cx} cy={cy} r={10} fill="white" stroke="#1e3a5f" strokeWidth={2} />
  );
  if (type === 'isolation') return (
    <>
      <circle cx={cx} cy={cy} r={12} fill="white" stroke="#1e3a5f" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={6}  fill="white" stroke="#1e3a5f" strokeWidth={1.5} />
    </>
  );
  if (type === 'valve') return (
    <>
      <circle cx={cx} cy={cy} r={10} fill="white" stroke="#1e3a5f" strokeWidth={2} />
      <line x1={cx - 7} y1={cy - 7} x2={cx + 7} y2={cy + 7} stroke="#1e3a5f" strokeWidth={2} />
      <line x1={cx + 7} y1={cy - 7} x2={cx - 7} y2={cy + 7} stroke="#1e3a5f" strokeWidth={2} />
    </>
  );
  if (type === 'airvalve') return (
    <polygon points={`${cx},${cy - 10} ${cx - 8},${cy + 8} ${cx + 8},${cy + 8}`} fill="#1e3a5f" />
  );
  return null;
}

// ── 구간 1개 렌더링 ───────────────────────────────────
function SectionRow({ section, yOffset }: { section: DrawingSection; yOffset: number }) {
  const sx = PL;
  const ex = SVG_W - PR;
  const pipeW = ex - sx;
  const y0 = yOffset + P_TOP;

  // 기호 평탄화
  const flat: SymbolType[] = [];
  section.components.forEach((c) => {
    for (let i = 0; i < c.qty; i++) flat.push(c.type as SymbolType);
  });
  const total = flat.length;
  const step = total > 0 ? pipeW / (total + 1) : pipeW / 2;

  return (
    <g>
      {/* ─ 구간 레이블 (우측 상단 빨간 박스) ─ */}
      <rect x={ex + 8} y={y0 + 2} width={64} height={22} fill="#ef4444" rx={2} />
      <text x={ex + 40} y={y0 + 17} textAnchor="middle" fontSize={11} fill="white" fontWeight="700">
        {section.id}
      </text>

      {/* ─ 연장 화살표 ←── L=50m ──→ ─ */}
      <text x={(sx + ex) / 2} y={y0 + Y_ARROW - 7} textAnchor="middle" fontSize={11} fill="#6b7280">
        L={section.length}m
      </text>
      {/* 좌측 */}
      <polygon
        points={`${sx},${y0 + Y_ARROW} ${sx + 9},${y0 + Y_ARROW - 4} ${sx + 9},${y0 + Y_ARROW + 4}`}
        fill="#9ca3af"
      />
      <line x1={sx} y1={y0 + Y_ARROW} x2={ex} y2={y0 + Y_ARROW} stroke="#9ca3af" strokeWidth={1} />
      {/* 우측 */}
      <polygon
        points={`${ex},${y0 + Y_ARROW} ${ex - 9},${y0 + Y_ARROW - 4} ${ex - 9},${y0 + Y_ARROW + 4}`}
        fill="#9ca3af"
      />

      {/* ─ 기존관 실선 ─ */}
      <line x1={sx} y1={y0 + Y_EXIST} x2={ex} y2={y0 + Y_EXIST} stroke="#1e3a5f" strokeWidth={3} />
      <text x={sx - 6} y={y0 + Y_EXIST + 4} textAnchor="end" fontSize={10} fill="#1e3a5f">기존관</text>
      <text x={ex + 72} y={y0 + Y_EXIST + 4} textAnchor="middle" fontSize={11} fill="#1e3a5f" fontWeight="600">
        {section.existingPipe}
      </text>

      {/* ─ 신설관 점선 ─ */}
      <line x1={sx} y1={y0 + Y_NEW} x2={ex} y2={y0 + Y_NEW}
        stroke="#ef4444" strokeWidth={2} strokeDasharray="8,4" />
      <text x={sx - 6} y={y0 + Y_NEW + 4} textAnchor="end" fontSize={10} fill="#ef4444">신설관</text>
      <text x={ex + 72} y={y0 + Y_NEW + 4} textAnchor="middle" fontSize={11} fill="#ef4444" fontWeight="600">
        {section.newPipe}
      </text>

      {/* ─ 기호 + 수직 연결선 + 번호 ─ */}
      {flat.map((type, i) => {
        const cx = sx + step * (i + 1);
        return (
          <g key={i}>
            {/* 수직 연결선: 기존관 → 신설관 */}
            <line
              x1={cx} y1={y0 + Y_EXIST}
              x2={cx} y2={y0 + Y_NEW}
              stroke="#9ca3af" strokeWidth={1} strokeDasharray="3,2"
            />
            {/* 기호 (신설관 아래) */}
            <Sym type={type} cx={cx} cy={y0 + Y_SYM} />
            {/* 번호 ①②③ */}
            <text x={cx} y={y0 + Y_NUM} textAnchor="middle" fontSize={11} fill="#1e3a5f">
              {CIRCLED[i] ?? `${i + 1}`}
            </text>
          </g>
        );
      })}

      {/* ─ 구간 구분선 (점선) ─ */}
      <line
        x1={36} y1={y0 + Y_DIV}
        x2={SVG_W - 16} y2={y0 + Y_DIV}
        stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4,2"
      />
    </g>
  );
}

// ── 범례 ─────────────────────────────────────────────
function Legend({ totalH }: { totalH: number }) {
  const lx = SVG_W - 175;
  const ly = totalH - 148;
  return (
    <g transform={`translate(${lx},${ly})`}>
      <rect width={162} height={138} fill="white" stroke="#e5e7eb" strokeWidth={1} rx={4} />
      <text x={81} y={20} textAnchor="middle" fontSize={13} fill="#374151" fontWeight="600">범 례</text>

      <circle cx={20} cy={40} r={8} fill="white" stroke="#1e3a5f" strokeWidth={2} />
      <text x={34} y={44} fontSize={11} fill="#374151">KP매커니컬접합</text>

      <circle cx={20} cy={65} r={10} fill="white" stroke="#1e3a5f" strokeWidth={2} />
      <circle cx={20} cy={65} r={5}  fill="white" stroke="#1e3a5f" strokeWidth={1.5} />
      <text x={34} y={69} fontSize={11} fill="#374151">이탈방지접합</text>

      <circle cx={20} cy={90} r={8} fill="white" stroke="#1e3a5f" strokeWidth={2} />
      <line x1={13} y1={83} x2={27} y2={97} stroke="#1e3a5f" strokeWidth={2} />
      <line x1={27} y1={83} x2={13} y2={97} stroke="#1e3a5f" strokeWidth={2} />
      <text x={34} y={94} fontSize={11} fill="#374151">제수밸브</text>

      <polygon points="20,107 12,119 28,119" fill="#1e3a5f" />
      <text x={34} y={118} fontSize={11} fill="#374151">공기밸브</text>
    </g>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────
export default function DrawingCanvas({ data }: { data: DrawingData }) {
  const totalH = data.sections.length * SECTION_H + P_TOP * 2 + 160;

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
        style={{ minHeight: `${Math.min(totalH, 720)}px` }}
      >
        {/* 도면 제목 */}
        <text x={SVG_W / 2} y={18} textAnchor="middle" fontSize={14} fill="#111827" fontWeight="700">
          {data.projectName} — 상하수도 관로 계통도
        </text>

        {/* 구간들 */}
        {data.sections.map((sec, i) => (
          <SectionRow key={sec.id} section={sec} yOffset={i * SECTION_H} />
        ))}

        {/* 범례 */}
        <Legend totalH={totalH} />
      </svg>
    </div>
  );
}
