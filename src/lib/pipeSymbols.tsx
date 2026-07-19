import type { JSX } from 'react';

// ── 관종(배관 종류) ────────────────────────────────────
export type PipeMaterial = 'DCIP' | 'PE' | 'PVC' | 'SP';
export const PIPE_MATERIALS: { value: PipeMaterial; label: string; joint: string }[] = [
  { value: 'DCIP', label: '주철관(DCIP)', joint: '소켓' },
  { value: 'SP',   label: '강관(SP)',     joint: '용접' },
  { value: 'PE',   label: 'PE관',         joint: '융착' },
  { value: 'PVC',  label: 'PVC관',        joint: '소켓' },
];

// ── 자재(기호) 종류 — 전체 세트 ────────────────────────
export type SymType =
  | 'gate_valve'  // 제수(수)밸브
  | 'air_valve'   // 공기밸브
  | 'restraint'   // 이탈방지압륜
  | 'socket'      // 소켓
  | 'bend'        // 곡관(엘보)
  | 'tee'         // 티(T자관)
  | 'cap'         // 캡
  | 'flange'      // 플랜지
  | 'reducer'     // 편락관(이경관)
  | 'kp'          // KP 매커니컬 접합
  | 'hydrant'     // 소화전
  | 'manhole';    // 맨홀

const NAVY = '#1e3a5f';
const SEL = '#f59e0b';

// 기호 1개 SVG 렌더 (cx,cy 중심, r 기준 약 12px)
type RenderFn = (cx: number, cy: number, selected: boolean) => JSX.Element;

export interface SymbolDef {
  name: string;                  // 자재 품명 (자재집계표/견적 품명)
  unit: string;                  // 단위 (개소/EA 등)
  appliesTo: PipeMaterial[];     // 사용 가능한 관종 (빈 배열=전체)
  render: RenderFn;
}

export const SYMBOLS: Record<SymType, SymbolDef> = {
  gate_valve: {
    name: '제수밸브', unit: '개소', appliesTo: [],
    render: (cx, cy, s) => {
      const c = s ? SEL : NAVY;
      return (
        <g>
          <circle cx={cx} cy={cy} r={10} fill="white" stroke={c} strokeWidth={2} />
          <line x1={cx - 7} y1={cy - 7} x2={cx + 7} y2={cy + 7} stroke={c} strokeWidth={2} />
          <line x1={cx + 7} y1={cy - 7} x2={cx - 7} y2={cy + 7} stroke={c} strokeWidth={2} />
        </g>
      );
    },
  },
  air_valve: {
    name: '공기밸브', unit: '개소', appliesTo: [],
    render: (cx, cy, s) => (
      <polygon points={`${cx},${cy - 10} ${cx - 8},${cy + 8} ${cx + 8},${cy + 8}`} fill={s ? SEL : NAVY} />
    ),
  },
  restraint: {
    name: '이탈방지압륜', unit: '개', appliesTo: ['DCIP', 'PVC', 'PE'],
    render: (cx, cy, s) => {
      const c = s ? SEL : NAVY;
      return (
        <g>
          <circle cx={cx} cy={cy} r={12} fill="white" stroke={c} strokeWidth={2} />
          <circle cx={cx} cy={cy} r={6} fill="white" stroke={c} strokeWidth={1.5} />
        </g>
      );
    },
  },
  socket: {
    name: '소켓', unit: '개', appliesTo: ['DCIP', 'PVC'],
    render: (cx, cy, s) => {
      const c = s ? SEL : NAVY;
      return (
        <g>
          <circle cx={cx} cy={cy} r={9} fill="white" stroke={c} strokeWidth={2} />
          <circle cx={cx} cy={cy} r={4} fill={c} />
        </g>
      );
    },
  },
  bend: {
    name: '곡관(엘보)', unit: '개', appliesTo: [],
    render: (cx, cy, s) => {
      const c = s ? SEL : NAVY;
      return (
        <polyline
          points={`${cx - 9},${cy + 8} ${cx - 9},${cy - 2} ${cx + 1},${cy - 2} ${cx + 9},${cy - 9}`}
          fill="none" stroke={c} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"
        />
      );
    },
  },
  tee: {
    name: '티(T자관)', unit: '개', appliesTo: [],
    render: (cx, cy, s) => {
      const c = s ? SEL : NAVY;
      return (
        <g stroke={c} strokeWidth={2.5} strokeLinecap="round">
          <line x1={cx - 10} y1={cy + 4} x2={cx + 10} y2={cy + 4} />
          <line x1={cx} y1={cy + 4} x2={cx} y2={cy - 9} />
        </g>
      );
    },
  },
  cap: {
    name: '캡', unit: '개', appliesTo: [],
    render: (cx, cy, s) => {
      const c = s ? SEL : NAVY;
      return (
        <g stroke={c} strokeWidth={2.5} fill="none" strokeLinecap="round">
          <line x1={cx - 6} y1={cy} x2={cx + 4} y2={cy} />
          <path d={`M ${cx + 4} ${cy - 8} A 8 8 0 0 1 ${cx + 4} ${cy + 8}`} />
        </g>
      );
    },
  },
  flange: {
    name: '플랜지', unit: '조', appliesTo: ['SP', 'DCIP'],
    render: (cx, cy, s) => {
      const c = s ? SEL : NAVY;
      return (
        <g stroke={c} strokeWidth={2.5} strokeLinecap="round">
          <line x1={cx - 3} y1={cy - 9} x2={cx - 3} y2={cy + 9} />
          <line x1={cx + 3} y1={cy - 9} x2={cx + 3} y2={cy + 9} />
        </g>
      );
    },
  },
  reducer: {
    name: '편락관(이경관)', unit: '개', appliesTo: [],
    render: (cx, cy, s) => {
      const c = s ? SEL : NAVY;
      return (
        <polygon
          points={`${cx - 10},${cy - 9} ${cx + 10},${cy - 4} ${cx + 10},${cy + 4} ${cx - 10},${cy + 9}`}
          fill="white" stroke={c} strokeWidth={2} strokeLinejoin="round"
        />
      );
    },
  },
  kp: {
    name: 'KP매커니컬접합', unit: '개', appliesTo: ['DCIP'],
    render: (cx, cy, s) => (
      <circle cx={cx} cy={cy} r={10} fill="white" stroke={s ? SEL : NAVY} strokeWidth={2} />
    ),
  },
  hydrant: {
    name: '소화전', unit: '개소', appliesTo: [],
    render: (cx, cy, s) => {
      const c = s ? SEL : NAVY;
      return (
        <g>
          <circle cx={cx} cy={cy} r={10} fill="white" stroke={c} strokeWidth={2} />
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fill={c} fontWeight="700">H</text>
        </g>
      );
    },
  },
  manhole: {
    name: '맨홀', unit: '개소', appliesTo: [],
    render: (cx, cy, s) => {
      const c = s ? SEL : NAVY;
      return (
        <g>
          <circle cx={cx} cy={cy} r={11} fill="white" stroke={c} strokeWidth={2} />
          <circle cx={cx} cy={cy} r={5} fill="none" stroke={c} strokeWidth={1.5} />
        </g>
      );
    },
  },
};

export const SYM_ORDER: SymType[] = [
  'gate_valve', 'air_valve', 'restraint', 'kp', 'socket',
  'bend', 'tee', 'reducer', 'cap', 'flange', 'hydrant', 'manhole',
];

/** 해당 관종에서 사용 가능한 기호인지 */
export function symbolAvailable(type: SymType, material: PipeMaterial): boolean {
  const a = SYMBOLS[type].appliesTo;
  return a.length === 0 || a.includes(material);
}
