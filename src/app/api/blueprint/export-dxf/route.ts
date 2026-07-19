import { NextRequest, NextResponse } from 'next/server';

// 경로(폴리라인) 기반 DXF 생성
// doc.route.vertices(비율 0~100) → scale 적용해 실좌표(m)로 변환.

type Pt = { x: number; y: number };
type SymType =
  | 'gate_valve' | 'air_valve' | 'restraint' | 'socket' | 'bend'
  | 'tee' | 'cap' | 'flange' | 'reducer' | 'kp' | 'hydrant' | 'manhole';

interface BpSymbol { id: string; type: SymType; spec: string; t: number; }
interface BpNode { id: string; t: number; label: string; }
interface BpSection {
  id: string; label: string; t0: number; t1: number;
  existingPipe: string; newPipe: string; length: number;
  depthStart: number; depthEnd: number;
  detailRoute?: { vertices: Pt[] };
  symbols: BpSymbol[];
}
interface BpDoc {
  scale: number;
  route: { vertices: Pt[] };
  nodes: BpNode[];
  sections: BpSection[];
}

const SYM_LABEL: Record<SymType, string> = {
  gate_valve: 'GV', air_valve: 'AV', restraint: 'RJ', socket: 'SO', bend: 'BD',
  tee: 'TEE', cap: 'CAP', flange: 'FL', reducer: 'RD', kp: 'KP', hydrant: 'HY', manhole: 'MH',
};

function pathLength(v: Pt[]): number {
  let l = 0;
  for (let i = 1; i < v.length; i++) l += Math.hypot(v[i].x - v[i - 1].x, v[i].y - v[i - 1].y);
  return l;
}
function pointAt(v: Pt[], t: number): Pt {
  if (v.length === 0) return { x: 0, y: 0 };
  if (v.length === 1) return v[0];
  const total = pathLength(v);
  if (total === 0) return v[0];
  let target = Math.max(0, Math.min(1, t)) * total;
  for (let i = 1; i < v.length; i++) {
    const seg = Math.hypot(v[i].x - v[i - 1].x, v[i].y - v[i - 1].y);
    if (target <= seg || i === v.length - 1) {
      const f = seg === 0 ? 0 : target / seg;
      return { x: v[i - 1].x + (v[i].x - v[i - 1].x) * f, y: v[i - 1].y + (v[i].y - v[i - 1].y) * f };
    }
    target -= seg;
  }
  return v[v.length - 1];
}

function generateDXF(doc: BpDoc): string {
  const s = doc.scale || 1;
  // 비율좌표→실좌표(m). y는 DXF 상향이 +이므로 반전.
  const MX = (x: number) => x * s;
  const MY = (y: number) => (100 - y) * s;

  let layers = '';
  layers += '0\nLAYER\n2\nROUTE\n70\n0\n62\n1\n6\nDASHED\n';
  layers += '0\nLAYER\n2\nNODE\n70\n0\n62\n5\n6\nCONTINUOUS\n';
  layers += '0\nLAYER\n2\nNEW_PIPE\n70\n0\n62\n1\n6\nCONTINUOUS\n';
  layers += '0\nLAYER\n2\nSYMBOL\n70\n0\n62\n3\n6\nCONTINUOUS\n';
  layers += '0\nLAYER\n2\nLABEL\n70\n0\n62\n7\n6\nCONTINUOUS\n';

  let e = '';
  const verts = doc.route.vertices ?? [];

  // 경로 폴리라인
  if (verts.length >= 2) {
    e += `0\nPOLYLINE\n8\nROUTE\n66\n1\n70\n0\n`;
    for (const v of verts) e += `0\nVERTEX\n8\nROUTE\n10\n${MX(v.x)}\n20\n${MY(v.y)}\n30\n0\n`;
    e += `0\nSEQEND\n`;
  }

  // 격점 마커 + 라벨
  (doc.nodes ?? []).forEach((n) => {
    const p = pointAt(verts, n.t);
    e += `0\nCIRCLE\n8\nNODE\n10\n${MX(p.x)}\n20\n${MY(p.y)}\n30\n0\n40\n${0.6 * s}\n`;
    e += `0\nTEXT\n8\nLABEL\n10\n${MX(p.x) + s}\n20\n${MY(p.y)}\n30\n0\n40\n${1.2 * s}\n1\n${n.label}\n`;
  });

  // 구간 라벨 + 구간 상세도(detailRoute + 기호)
  (doc.sections ?? []).forEach((sec) => {
    const mid = pointAt(verts, (sec.t0 + sec.t1) / 2);
    e += `0\nTEXT\n8\nLABEL\n10\n${MX(mid.x)}\n20\n${MY(mid.y) + s}\n30\n0\n40\n${1 * s}\n1\n${sec.label} ${sec.newPipe} L=${sec.length}m H=-${sec.depthStart}m\n`;

    const dv = sec.detailRoute?.vertices ?? [];
    if (dv.length < 2) return;
    // 상세경로(비율 0~100)를 구간 중앙 부근에 축소 배치 (10x10 m 박스)
    const BOX = 10;
    const dX = (x: number) => MX(mid.x) + (x / 100 - 0.5) * BOX;
    const dY = (y: number) => MY(mid.y) - 6 * s - (y / 100 - 0.5) * BOX;

    // 상세 관로 폴리라인
    e += `0\nPOLYLINE\n8\nNEW_PIPE\n66\n1\n70\n0\n`;
    for (const v of dv) e += `0\nVERTEX\n8\nNEW_PIPE\n10\n${dX(v.x)}\n20\n${dY(v.y)}\n30\n0\n`;
    e += `0\nSEQEND\n`;

    sec.symbols.forEach((sym) => {
      const p = pointAt(dv, sym.t);
      e += `0\nCIRCLE\n8\nSYMBOL\n10\n${dX(p.x)}\n20\n${dY(p.y)}\n30\n0\n40\n${0.5 * s}\n`;
      e += `0\nTEXT\n8\nSYMBOL\n10\n${dX(p.x) - 0.4 * s}\n20\n${dY(p.y) - 0.4 * s}\n30\n0\n40\n${0.8 * s}\n1\n${SYM_LABEL[sym.type]}\n`;
    });
  });

  return [
    '0', 'SECTION', '2', 'HEADER',
    '9', '$ACADVER', '1', 'AC1009',
    '9', '$INSUNITS', '70', '6',
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'TABLES',
    '0', 'TABLE', '2', 'LAYER',
    layers.trim(),
    '0', 'ENDTAB',
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES',
    e.trim(),
    '0', 'ENDSEC',
    '0', 'EOF',
  ].join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const { doc, projectName }: { doc: BpDoc; projectName?: string } = await req.json();
    const dxf = generateDXF(doc);
    const fileName = encodeURIComponent(`${projectName || 'drawing'}_계통도.dxf`);
    return new NextResponse(dxf, {
      headers: {
        'Content-Type': 'application/dxf',
        'Content-Disposition': `attachment; filename*=UTF-8''${fileName}`,
      },
    });
  } catch (error) {
    console.error('DXF export error:', error);
    return NextResponse.json({ error: 'DXF 생성 오류' }, { status: 500 });
  }
}
