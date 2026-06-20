import type { EstimateItem } from '@/types';

// ── 도면 기호 체계 (단일 진실 소스) ───────────────────────────
// 이 파일을 수정하면 DrawingCanvas / BlueprintEditor / export-dxf / gemini 프롬프트가 모두 동기화됨
export type SymbolType =
  | 'kp'          // KP매커니컬접합
  | 'isolation'   // 이탈방지접합
  | 'valve'       // 제수밸브
  | 'airvalve'    // 공기밸브
  | 'drainvalve'  // 이토변(배수밸브)
  | 'hydrant'     // 소화전
  | 'bend'        // 이형관(곡관)
  | 'manhole';    // 맨홀

export interface SymbolMeta {
  /** 한글 품명 (물량집계표·범례에 표시) */
  ko: string;
  /** 집계 단위 */
  unit: string;
  /** DXF TEXT용 ASCII 약어 (한글 깨짐 방지) */
  dxf: string;
  /** AI 프롬프트에서 쓰는 기호 글리프 */
  glyph: string;
}

/** 정규 순서 — 물량집계표·범례 정렬 기준 */
export const SYMBOL_ORDER: SymbolType[] = [
  'kp', 'isolation', 'valve', 'airvalve', 'drainvalve', 'hydrant', 'bend', 'manhole',
];

export const SYMBOL_META: Record<SymbolType, SymbolMeta> = {
  kp:         { ko: 'KP매커니컬접합', unit: '개',   dxf: 'KP',   glyph: '○' },
  isolation:  { ko: '이탈방지접합',   unit: '개',   dxf: 'ISO',  glyph: '⊗' },
  valve:      { ko: '제수밸브',       unit: '개',   dxf: 'GV',   glyph: '×' },
  airvalve:   { ko: '공기밸브',       unit: '개',   dxf: 'AV',   glyph: '◎' },
  drainvalve: { ko: '이토변',         unit: '개',   dxf: 'DV',   glyph: '▽' },
  hydrant:    { ko: '소화전',         unit: '개',   dxf: 'FH',   glyph: '⛫' },
  bend:       { ko: '이형관(곡관)',   unit: '개',   dxf: 'BEND', glyph: '⌐' },
  manhole:    { ko: '맨홀',           unit: '개소', dxf: 'MH',   glyph: '▣' },
};

export function symbolName(type: SymbolType): string {
  return SYMBOL_META[type]?.ko ?? type;
}

/** 한글 품명 → SymbolType (역방향 조회) */
export function symbolTypeByKo(ko: string): SymbolType | undefined {
  return SYMBOL_ORDER.find((t) => SYMBOL_META[t].ko === ko);
}

// ── 도면 데이터 구조 (AI 계약 = DrawingData) ───────────────────
export interface DrawingComponent {
  type: SymbolType;
  spec: string;   // 예: D200mm
  qty: number;
}

export interface DrawingSection {
  id: string;          // 예: No.1
  existingPipe: string; // 예: D200
  newPipe: string;
  length: number;       // m
  components: DrawingComponent[];
}

export interface Material {
  name: string;
  spec: string;
  unit: string;
  qty: number;
}

export interface DrawingData {
  projectName: string;
  sections: DrawingSection[];
  warnings: string[];
  totalMaterials: Material[];
}

// ── 스케치 (프리핸드 입력) ────────────────────────────────────
/** 좌표는 0~100 퍼센트 정규화 (반응형·해상도 독립) */
export interface SketchStroke {
  points: [number, number][];
}

export interface SketchData {
  strokes: SketchStroke[];
  /** 업로드 배경 이미지 (dataURL), 없으면 빈 화면 */
  baseImage?: string;
}

/**
 * 스케치를 AI가 이해할 구조 힌트 텍스트로 요약.
 * (멀티모달 이미지 전송 전 1차 방식 — 선의 개수/방향/분기 추정)
 */
export function sketchToHint(sketch: SketchData): string {
  const n = sketch.strokes.length;
  if (n === 0 && !sketch.baseImage) return '';
  const parts: string[] = [];
  if (sketch.baseImage) parts.push('현장 사진/약도를 배경으로 첨부함');
  if (n > 0) {
    // 각 stroke의 전체 진행 방향(시작→끝) 추정
    let horiz = 0, vert = 0;
    sketch.strokes.forEach((s) => {
      if (s.points.length < 2) return;
      const [x0, y0] = s.points[0];
      const [x1, y1] = s.points[s.points.length - 1];
      if (Math.abs(x1 - x0) >= Math.abs(y1 - y0)) horiz++; else vert++;
    });
    parts.push(`사용자가 손으로 ${n}개의 선을 그림(가로 진행 ${horiz}개, 세로/분기 ${vert}개)`);
    if (n >= 2) parts.push('여러 선이 있으므로 분기 또는 다구간 노선일 수 있음');
  }
  return parts.length ? `[스케치 정보] ${parts.join('. ')}.` : '';
}

// ── 물량집계표 자동 집계 ──────────────────────────────────────
/**
 * sections[].components 를 (품명, 규격) 으로 그룹·합산하여 물량집계표 생성.
 * AI가 보낸 totalMaterials 대신 이걸 써서 도면-표 불일치를 방지한다.
 */
export function aggregateMaterials(sections: DrawingSection[]): Material[] {
  const map = new Map<string, Material>();
  sections.forEach((sec) => {
    sec.components.forEach((c) => {
      const meta = SYMBOL_META[c.type];
      if (!meta) return;
      const name = meta.ko;
      const spec = c.spec || sec.newPipe;
      const key = `${c.type}|${spec}`;
      const prev = map.get(key);
      if (prev) prev.qty += c.qty;
      else map.set(key, { name, spec, unit: meta.unit, qty: c.qty });
    });
  });
  // 정규 순서대로 정렬
  return [...map.values()].sort((a, b) => {
    const ai = SYMBOL_ORDER.findIndex((t) => SYMBOL_META[t].ko === a.name);
    const bi = SYMBOL_ORDER.findIndex((t) => SYMBOL_META[t].ko === b.name);
    if (ai !== bi) return ai - bi;
    return a.spec.localeCompare(b.spec);
  });
}

// ── 설계기준 결정론적 검증 (LLM 의존도 완화) ───────────────────
/** 관경 문자열(D200, D400mm 등)에서 숫자만 추출 */
function pipeMm(spec: string): number {
  const m = spec.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** 맨홀 직선부 최대 간격 (KDS, 관경별) */
function manholeMaxSpacing(mm: number): number {
  if (mm <= 600) return 75;
  if (mm <= 1000) return 100;
  if (mm <= 1500) return 150;
  return 200;
}

/**
 * 구간 데이터에 대한 설계기준 자동 점검.
 * gemini 프롬프트 경고와 별개로 클라이언트에서 한 번 더 검증.
 */
export function validateSections(sections: DrawingSection[]): string[] {
  const warns: string[] = [];
  sections.forEach((sec) => {
    const mm = pipeMm(sec.newPipe || sec.existingPipe);
    const has = (t: SymbolType) => sec.components.some((c) => c.type === t && c.qty > 0);

    // 공기밸브: 관경 400mm 이상 급속공기밸브 필요
    if (has('airvalve') && mm > 0 && mm < 400) {
      warns.push(`${sec.id}: 공기밸브가 있으나 관경 ${mm}mm(<400) — 소형 공기밸브 적용 여부 확인`);
    }
    // 맨홀 간격: 구간 연장이 기준 초과면 맨홀 부족 가능
    if (mm > 0 && sec.length > 0) {
      const maxGap = manholeMaxSpacing(mm);
      const mhCount = sec.components.filter((c) => c.type === 'manhole').reduce((s, c) => s + c.qty, 0);
      const needed = Math.floor(sec.length / maxGap);
      if (needed > 0 && mhCount < needed) {
        warns.push(`${sec.id}: 연장 ${sec.length}m / 관경 ${mm}mm 기준 맨홀 최소 ${needed}개소 권장 (현재 ${mhCount}개소)`);
      }
    }
  });
  return warns;
}

// ── 물량 → 견적 항목 변환 (Phase 2 seam) ──────────────────────
export function materialsToEstimateItems(
  materials: Material[],
  estimateId: string,
): EstimateItem[] {
  return materials.map((m, i) => ({
    id: `bp-${Date.now()}-${i}`,
    estimate_id: estimateId,
    category: '배관공',
    work_name: `${m.name} ${m.spec}`.trim(),
    spec: m.spec,
    unit: m.unit,
    quantity: m.qty,
    unit_price: 0,
    labor_amount: 0,
    material_amount: 0,
    expense_amount: 0,
    total_amount: 0,
    is_night: false,
    sort_order: i,
  }));
}
