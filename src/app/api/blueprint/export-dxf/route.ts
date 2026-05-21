import { NextRequest, NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateDXF(data: any): string {
  const { pipes = [], manholes = [], valves = [] } = data;

  let entities = '';

  pipes.forEach((pipe: any) => {
    const { x1 = 0, y1 = 0, x2 = 100, y2 = 0, layer = 'PIPE' } = pipe;
    entities += `0\nLINE\n8\n${layer}\n10\n${x1}\n20\n${y1}\n30\n0\n11\n${x2}\n21\n${y2}\n31\n0\n`;
  });

  manholes.forEach((mh: any) => {
    const { x = 0, y = 0, radius = 0.45, layer = 'MANHOLE' } = mh;
    entities += `0\nCIRCLE\n8\n${layer}\n10\n${x}\n20\n${y}\n30\n0\n40\n${radius}\n`;
  });

  valves.forEach((v: any) => {
    const { x = 0, y = 0, type = 'GV', layer = 'VALVE' } = v;
    entities += `0\nTEXT\n8\n${layer}\n10\n${x}\n20\n${y}\n30\n0\n40\n0.5\n1\n${type}\n`;
  });

  return [
    '0', 'SECTION', '2', 'HEADER',
    '9', '$ACADVER', '1', 'AC1009',
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'TABLES',
    '0', 'TABLE', '2', 'LAYER',
    '0', 'LAYER', '2', 'PIPE', '70', '0', '62', '5', '6', 'CONTINUOUS',
    '0', 'LAYER', '2', 'MANHOLE', '70', '0', '62', '3', '6', 'CONTINUOUS',
    '0', 'LAYER', '2', 'VALVE', '70', '0', '62', '1', '6', 'CONTINUOUS',
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
    const { drawingData } = await req.json();
    const dxf = generateDXF(drawingData);

    return new NextResponse(dxf, {
      headers: {
        'Content-Type': 'application/dxf',
        'Content-Disposition': `attachment; filename="${drawingData.projectName || 'drawing'}.dxf"`,
      },
    });
  } catch (error) {
    console.error('DXF export error:', error);
    return NextResponse.json({ error: 'DXF 생성 오류' }, { status: 500 });
  }
}
