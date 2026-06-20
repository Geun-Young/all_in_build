import { NextRequest, NextResponse } from 'next/server';
import Drawing from 'dxf-writer';
import { aggregateMaterials, SYMBOL_META, symbolTypeByKo } from '@/types/drawing';
import type { SymbolType, DrawingData } from '@/types/drawing';

// 구간/관 레이아웃 상수 (DXF 단위 = m 느낌)
const SECTION_GAP = 14;   // 구간 간 세로 간격
const PIPE_GAP = 3;       // 기존관↔신설관 간격
const X_START = 5;
const MAX_LEN = 120;      // 도면상 최대 가로 길이 (실제 연장과 무관한 표시 스케일)

const NAVY = Drawing.ACI.BLUE;
const RED = Drawing.ACI.RED;
const GRAY = 8;

// 기호 레이어 색상
const SYM_COLOR: Record<SymbolType, number> = {
  kp: Drawing.ACI.GREEN,
  isolation: Drawing.ACI.CYAN,
  valve: Drawing.ACI.YELLOW,
  airvalve: Drawing.ACI.MAGENTA,
  drainvalve: Drawing.ACI.GREEN,
  hydrant: Drawing.ACI.RED,
  bend: Drawing.ACI.CYAN,
  manhole: Drawing.ACI.WHITE,
};

function drawSymbol(d: Drawing, type: SymbolType, x: number, y: number) {
  const r = 0.6;
  switch (type) {
    case 'kp':
      d.drawCircle(x, y, r);
      break;
    case 'isolation':
      d.drawCircle(x, y, r);
      d.drawCircle(x, y, r * 0.5);
      break;
    case 'valve':
      d.drawCircle(x, y, r);
      d.drawLine(x - r, y - r, x + r, y + r);
      d.drawLine(x + r, y - r, x - r, y + r);
      break;
    case 'airvalve':
      d.drawPolyline([[x, y + r], [x - r, y - r], [x + r, y - r]], true);
      break;
    case 'drainvalve':
      d.drawPolyline([[x - r, y + r], [x + r, y + r], [x, y - r]], true);
      break;
    case 'hydrant':
      d.drawCircle(x, y, r);
      d.drawText(x, y, r * 0.9, 0, 'H', 'center', 'middle');
      break;
    case 'bend':
      d.drawPolyline([[x - r, y - r], [x - r, y + r * 0.4], [x + r, y + r * 0.4]], false);
      break;
    case 'manhole':
      d.drawRect(x - r, y - r, x + r, y + r);
      d.drawCircle(x, y, r * 0.5);
      break;
  }
}

function generateDXF(data: DrawingData): string {
  const d: Drawing = new Drawing();
  d.setUnits('Meters');

  // 점선 라인타입 (신설관)
  d.addLineType('DASHED', '_ _ _ _', [0.5, -0.25]);

  // 레이어
  d.addLayer('EXISTING_PIPE', NAVY, 'CONTINUOUS');
  d.addLayer('NEW_PIPE', RED, 'DASHED');
  d.addLayer('LABEL', GRAY, 'CONTINUOUS');
  d.addLayer('TABLE', Drawing.ACI.WHITE, 'CONTINUOUS');
  (Object.keys(SYM_COLOR) as SymbolType[]).forEach((t) => {
    d.addLayer(`SYM_${t.toUpperCase()}`, SYM_COLOR[t], 'CONTINUOUS');
  });

  // 제목
  d.setActiveLayer('LABEL');
  d.drawText(X_START, SECTION_GAP * 0.6, 1.2, 0, `${data.projectName || '계통도'} - 상하수도 관로 계통도`);

  data.sections.forEach((section, si) => {
    const yBase = -(si + 1) * SECTION_GAP;
    const yExisting = yBase;
    const yNew = yBase - PIPE_GAP;
    const len = section.length > 0 ? Math.min(section.length, MAX_LEN) : 50;
    const x1 = X_START;
    const x2 = x1 + len;

    // 기존관 (실선)
    d.setActiveLayer('EXISTING_PIPE');
    d.drawLine(x1, yExisting, x2, yExisting);

    // 신설관 (점선)
    d.setActiveLayer('NEW_PIPE');
    d.drawLine(x1, yNew, x2, yNew);

    // 구간 레이블
    d.setActiveLayer('LABEL');
    d.drawText(x1, yExisting + 1.2, 0.9, 0,
      `${section.id} (${section.existingPipe} -> ${section.newPipe}, L=${section.length}m)`);
    d.drawText(x2 + 1, yExisting, 0.8, 0, section.existingPipe, 'left', 'middle');
    d.drawText(x2 + 1, yNew, 0.8, 0, section.newPipe, 'left', 'middle');

    // 기호 균등 배치
    const total = section.components.reduce((s, c) => s + c.qty, 0);
    const step = total > 0 ? len / (total + 1) : len / 2;
    let idx = 0;
    section.components.forEach((comp) => {
      for (let q = 0; q < comp.qty; q++) {
        idx++;
        const sx = x1 + step * idx;
        d.setActiveLayer(`SYM_${comp.type.toUpperCase()}`);
        drawSymbol(d, comp.type, sx, yExisting - PIPE_GAP / 2);
        // ASCII 약어 라벨 (한글 깨짐 방지)
        d.setActiveLayer('LABEL');
        d.drawText(sx, yExisting - PIPE_GAP - 1.2, 0.6, 0, SYMBOL_META[comp.type].dxf, 'center', 'top');
      }
    });
  });

  // 물량집계표 (도면 하단)
  const materials = aggregateMaterials(data.sections);
  if (materials.length > 0) {
    d.setActiveLayer('TABLE');
    const tableY = -(data.sections.length + 2) * SECTION_GAP;
    const rowH = 2;
    const cols = [0, 4, 20, 36, 44]; // 번호/품명/규격/단위/수량 x오프셋
    const colW = 52;
    const headerY = tableY;

    d.drawText(X_START, headerY + rowH, 1, 0, '[물량집계표 / Material List]');
    // 헤더
    const head = ['No', 'ITEM', 'SPEC', 'UNIT', 'QTY'];
    head.forEach((h, i) => d.drawText(X_START + cols[i], headerY, 0.8, 0, h, 'left', 'middle'));
    // 가로줄
    d.drawLine(X_START, headerY - rowH / 2, X_START + colW, headerY - rowH / 2);

    materials.forEach((m, i) => {
      const ry = headerY - rowH * (i + 1);
      const t = symbolTypeByKo(m.name);
      const row = [
        String(i + 1),
        t ? SYMBOL_META[t].dxf : m.name,
        m.spec,
        'EA',
        String(m.qty),
      ];
      row.forEach((c, ci) => d.drawText(X_START + cols[ci], ry, 0.7, 0, c, 'left', 'middle'));
    });
  }

  return d.toDxfString();
}

export async function POST(req: NextRequest) {
  try {
    const { drawingData }: { drawingData: DrawingData } = await req.json();
    const dxf = generateDXF(drawingData);
    const fileName = encodeURIComponent(`${drawingData.projectName || 'drawing'}_계통도.dxf`);

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
