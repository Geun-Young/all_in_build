import { NextRequest, NextResponse } from 'next/server';

interface Component {
  type: 'kp' | 'isolation' | 'valve' | 'airvalve';
  spec: string;
  qty: number;
}

interface Section {
  id: string;
  existingPipe: string;
  newPipe: string;
  length: number;
  components: Component[];
}

interface DrawingData {
  projectName: string;
  sections: Section[];
  warnings: string[];
  totalMaterials: { name: string; spec: string; unit: string; qty: number }[];
}

function generateDXF(data: DrawingData): string {
  const SECTION_HEIGHT = 10; // 구간 간격 (DXF 단위)
  const PIPE_SPACING = 3;   // 기존관↔신설관 간격

  let layers = '';
  layers += '0\nLAYER\n2\nEXISTING_PIPE\n70\n0\n62\n5\n6\nCONTINUOUS\n';
  layers += '0\nLAYER\n2\nNEW_PIPE\n70\n0\n62\n1\n6\nDASHED\n';
  layers += '0\nLAYER\n2\nKP_JOINT\n70\n0\n62\n3\n6\nCONTINUOUS\n';
  layers += '0\nLAYER\n2\nISO_JOINT\n70\n0\n62\n4\n6\nCONTINUOUS\n';
  layers += '0\nLAYER\n2\nVALVE\n70\n0\n62\n2\n6\nCONTINUOUS\n';
  layers += '0\nLAYER\n2\nAIR_VALVE\n70\n0\n62\n6\n6\nCONTINUOUS\n';
  layers += '0\nLAYER\n2\nLABEL\n70\n0\n62\n7\n6\nCONTINUOUS\n';

  let entities = '';

  data.sections.forEach((section, si) => {
    const yBase = si * SECTION_HEIGHT;
    const yExisting = yBase;
    const yNew = yBase + PIPE_SPACING;
    const pipeLength = section.length > 0 ? Math.min(section.length, 100) : 50;
    const x1 = 5;
    const x2 = x1 + pipeLength;

    // 기존관 — 실선
    entities += `0\nLINE\n8\nEXISTING_PIPE\n10\n${x1}\n20\n${yExisting}\n30\n0\n11\n${x2}\n21\n${yExisting}\n31\n0\n`;

    // 신설관 — 점선
    entities += `0\nLINE\n8\nNEW_PIPE\n10\n${x1}\n20\n${yNew}\n30\n0\n11\n${x2}\n21\n${yNew}\n31\n0\n`;

    // 구간 레이블
    entities += `0\nTEXT\n8\nLABEL\n10\n${x1 - 4}\n20\n${yExisting}\n30\n0\n40\n1\n1\n${section.id} (${section.existingPipe}→${section.newPipe}, ${section.length}m)\n`;

    // 기호 배치
    const totalSymbols = section.components.reduce((s, c) => s + c.qty, 0);
    const step = totalSymbols > 0 ? pipeLength / (totalSymbols + 1) : pipeLength / 2;
    let symIdx = 0;

    section.components.forEach((comp) => {
      for (let q = 0; q < comp.qty; q++) {
        symIdx++;
        const sx = x1 + step * symIdx;
        const sy = yExisting;

        if (comp.type === 'kp') {
          entities += `0\nCIRCLE\n8\nKP_JOINT\n10\n${sx}\n20\n${sy}\n30\n0\n40\n0.5\n`;
        } else if (comp.type === 'isolation') {
          entities += `0\nCIRCLE\n8\nISO_JOINT\n10\n${sx}\n20\n${sy}\n30\n0\n40\n0.8\n`;
          entities += `0\nCIRCLE\n8\nISO_JOINT\n10\n${sx}\n20\n${sy}\n30\n0\n40\n0.4\n`;
        } else if (comp.type === 'valve') {
          entities += `0\nTEXT\n8\nVALVE\n10\n${sx - 0.3}\n20\n${sy - 0.5}\n30\n0\n40\n0.8\n1\nGV\n`;
        } else if (comp.type === 'airvalve') {
          entities += `0\nTEXT\n8\nAIR_VALVE\n10\n${sx - 0.3}\n20\n${sy - 0.5}\n30\n0\n40\n0.8\n1\nAV\n`;
        }
      }
    });
  });

  return [
    '0', 'SECTION', '2', 'HEADER',
    '9', '$ACADVER', '1', 'AC1009',
    '9', '$INSUNITS', '70', '4',
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'TABLES',
    '0', 'TABLE', '2', 'LAYER',
    layers.trim(),
    '0', 'ENDTAB',
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES',
    entities.trim(),
    '0', 'ENDSEC',
    '0', 'EOF',
  ].join('\n');
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
