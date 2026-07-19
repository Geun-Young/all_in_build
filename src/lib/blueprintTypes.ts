import type { Pt } from './geometry';
import type { PipeMaterial, SymType } from './pipeSymbols';

export type { Pt } from './geometry';
export type { PipeMaterial, SymType } from './pipeSymbols';

/** 격점: 경로 누적길이 비율 t(0~1) 위치 */
export interface BpNode {
  id: string;
  t: number;
  label: string;
}

/** 경로 위 기호: t(0~1) 위치 */
export interface BpSymbol {
  id: string;
  type: SymType;
  spec: string;   // 규격 (보통 신설관 관경)
  t: number;
}

/** 인접 격점 사이의 구간 */
export interface BpSection {
  id: string;
  label: string;          // No.1, No.2 ...
  fromNodeId: string;
  toNodeId: string;
  t0: number;             // 시작 t
  t1: number;             // 끝 t
  material: PipeMaterial;
  existingPipe: string;
  newPipe: string;
  length: number;         // 연장(m)
  depthStart: number;     // 시작 심도 GL-(m)
  depthEnd: number;       // 끝 심도 GL-(m)
  detailRoute: { vertices: Pt[] };  // 구간 내부 상세 경로(sub-polyline, 비율 0~100)
  symbols: BpSymbol[];    // detailRoute 위의 위치 t(0~1)
}

export type BgKind = 'image' | 'grid' | 'map';

export interface BpBackground {
  kind: BgKind;
  image?: string;                 // dataURL (kind=image)
  opacity: number;                // 0~1
  map?: { lat: number; lng: number; zoom: number };
}

export interface BpDoc {
  background: BpBackground;
  scale: number;                  // m per 1.0 비율길이 (연장 자동계산)
  route: { vertices: Pt[] };
  nodes: BpNode[];
  sections: BpSection[];
  step: number;
}

export const PIPE_SIZES = ['D100','D150','D200','D250','D300','D350','D400','D450','D500','D600'];
export const CIRCLED = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮'];

export function emptyDoc(): BpDoc {
  return {
    background: { kind: 'grid', opacity: 0.6 },
    scale: 5,            // 기본: 비율 1.0당 5m (사용자 조정 가능)
    route: { vertices: [] },
    nodes: [],
    sections: [],
    step: 1,
  };
}

/** 복원된 doc의 누락 필드를 보정 (구버전 호환) */
export function normalizeDoc(d: BpDoc): BpDoc {
  return {
    ...emptyDoc(),
    ...d,
    background: { ...emptyDoc().background, ...(d.background ?? {}) },
    route: { vertices: d.route?.vertices ?? [] },
    nodes: d.nodes ?? [],
    sections: (d.sections ?? []).map((s) => ({
      ...s,
      detailRoute: { vertices: s.detailRoute?.vertices ?? [] },
      symbols: s.symbols ?? [],
    })),
  };
}

/** 자재 집계: 품명|규격 기준 합산 */
export function aggregateMaterials(
  sections: BpSection[],
  symbolName: (t: SymType) => string,
  symbolUnit: (t: SymType) => string,
): { name: string; spec: string; unit: string; qty: number }[] {
  const map = new Map<string, { name: string; spec: string; unit: string; qty: number }>();
  for (const sec of sections) {
    for (const sym of sec.symbols) {
      const name = symbolName(sym.type);
      const spec = sym.spec || sec.newPipe;
      const key = `${name}|${spec}`;
      const cur = map.get(key);
      if (cur) cur.qty += 1;
      else map.set(key, { name, spec, unit: symbolUnit(sym.type), qty: 1 });
    }
  }
  return [...map.values()];
}
