import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { DrawingData } from '@/types/drawing';

// DB 미연결 시에도 동작하도록 한 기본 제공 템플릿 (마이그레이션 시드와 동일)
const FALLBACK_TEMPLATES: { id: string; name: string; category: string; description: string; drawing_data: DrawingData }[] = [
  {
    id: 'tpl-replace',
    name: '노후관 교체 기본형',
    category: '상수도',
    description: 'D200 노후관 교체 1구간 + 제수밸브·공기밸브',
    drawing_data: {
      projectName: '노후관 교체 (기본형)',
      sections: [{
        id: 'No.1', existingPipe: 'D200', newPipe: 'D200', length: 250,
        components: [
          { type: 'kp', spec: 'D200mm', qty: 6 },
          { type: 'valve', spec: 'D200mm', qty: 2 },
          { type: 'airvalve', spec: 'D200mm', qty: 1 },
        ],
      }],
      warnings: [], totalMaterials: [],
    },
  },
  {
    id: 'tpl-branch',
    name: '분기 신설형',
    category: '상수도',
    description: '본관 + 분기관 2구간 + 이형관·제수밸브',
    drawing_data: {
      projectName: '분기 신설 (기본형)',
      sections: [
        {
          id: 'No.1', existingPipe: 'D300', newPipe: 'D300', length: 300,
          components: [
            { type: 'kp', spec: 'D300mm', qty: 8 },
            { type: 'valve', spec: 'D300mm', qty: 1 },
            { type: 'bend', spec: 'D300mm', qty: 2 },
          ],
        },
        {
          id: 'No.2', existingPipe: 'D150', newPipe: 'D150', length: 80,
          components: [
            { type: 'kp', spec: 'D150mm', qty: 2 },
            { type: 'valve', spec: 'D150mm', qty: 1 },
          ],
        },
      ],
      warnings: [], totalMaterials: [],
    },
  },
  {
    id: 'tpl-sewer',
    name: '하수관 신설형',
    category: '하수도',
    description: 'D250 하수관 신설 + 맨홀 정기 배치',
    drawing_data: {
      projectName: '하수관 신설 (기본형)',
      sections: [{
        id: 'No.1', existingPipe: 'D250', newPipe: 'D250', length: 300,
        components: [
          { type: 'manhole', spec: 'D250mm', qty: 4 },
          { type: 'kp', spec: 'D250mm', qty: 8 },
        ],
      }],
      warnings: [], totalMaterials: [],
    },
  },
];

// GET /api/blueprint/templates  → 템플릿 목록
export async function GET(_req: NextRequest) {
  if (!supabase) return NextResponse.json(FALLBACK_TEMPLATES);
  try {
    const { data, error } = await supabase
      .from('drawing_templates')
      .select('id, name, category, description, drawing_data')
      .order('created_at', { ascending: true });
    if (error) throw error;
    // DB가 비어있으면 fallback 사용
    return NextResponse.json(data && data.length > 0 ? data : FALLBACK_TEMPLATES);
  } catch {
    return NextResponse.json(FALLBACK_TEMPLATES);
  }
}
