import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface WorkTypeItem {
  id: string;
  category: string;
  name: string;
  spec: string;
  unit: string;
  is_night: boolean;
  labor_price: number;
  material_price: number;
  expense_price: number;
  total_price: number;
}

const FALLBACK: WorkTypeItem[] = [
  { id: 'd1',  category: '배관공', name: 'KP매커니컬접합', spec: 'Φ150mm', unit: '개소', is_night: false, labor_price: 32296,  material_price: 645,  expense_price: 0, total_price: 32941  },
  { id: 'd1n', category: '배관공', name: 'KP매커니컬접합', spec: 'Φ150mm', unit: '개소', is_night: true,  labor_price: 60555,  material_price: 645,  expense_price: 0, total_price: 61200  },
  { id: 'd2',  category: '배관공', name: 'KP매커니컬접합', spec: 'Φ200mm', unit: '개소', is_night: false, labor_price: 51731,  material_price: 1029, expense_price: 0, total_price: 52760  },
  { id: 'd2n', category: '배관공', name: 'KP매커니컬접합', spec: 'Φ200mm', unit: '개소', is_night: true,  labor_price: 96995,  material_price: 1029, expense_price: 0, total_price: 98024  },
  { id: 'd3',  category: '배관공', name: 'KP매커니컬접합', spec: 'Φ300mm', unit: '개소', is_night: false, labor_price: 79387,  material_price: 1587, expense_price: 0, total_price: 80974  },
  { id: 'd3n', category: '배관공', name: 'KP매커니컬접합', spec: 'Φ300mm', unit: '개소', is_night: true,  labor_price: 148850, material_price: 1587, expense_price: 0, total_price: 150437 },
  { id: 'd4',  category: '배관공', name: '이탈방지접합',   spec: 'Φ150mm', unit: '개소', is_night: false, labor_price: 41985,  material_price: 839,  expense_price: 0, total_price: 42824  },
  { id: 'd4n', category: '배관공', name: '이탈방지접합',   spec: 'Φ150mm', unit: '개소', is_night: true,  labor_price: 78721,  material_price: 839,  expense_price: 0, total_price: 79560  },
  { id: 'd5',  category: '배관공', name: '이탈방지접합',   spec: 'Φ200mm', unit: '개소', is_night: false, labor_price: 67230,  material_price: 1345, expense_price: 0, total_price: 68575  },
  { id: 'd5n', category: '배관공', name: '이탈방지접합',   spec: 'Φ200mm', unit: '개소', is_night: true,  labor_price: 126056, material_price: 1345, expense_price: 0, total_price: 127401 },
  { id: 'd6',  category: '배관공', name: '주철관절단',     spec: 'Φ150mm', unit: '개소', is_night: false, labor_price: 23744,  material_price: 1187, expense_price: 0, total_price: 24931  },
  { id: 'd6n', category: '배관공', name: '주철관절단',     spec: 'Φ150mm', unit: '개소', is_night: true,  labor_price: 44520,  material_price: 1187, expense_price: 0, total_price: 45707  },
  { id: 'd7',  category: '배관공', name: '주철관절단',     spec: 'Φ300mm', unit: '개소', is_night: false, labor_price: 37991,  material_price: 1899, expense_price: 0, total_price: 39890  },
  { id: 'd7n', category: '배관공', name: '주철관절단',     spec: 'Φ300mm', unit: '개소', is_night: true,  labor_price: 71232,  material_price: 1899, expense_price: 0, total_price: 73131  },
  { id: 'd8',  category: '배관공', name: '주철관절단',     spec: 'Φ800mm', unit: '개소', is_night: false, labor_price: 95838,  material_price: 4842, expense_price: 0, total_price: 100680 },
  { id: 'd8n', category: '배관공', name: '주철관절단',     spec: 'Φ800mm', unit: '개소', is_night: true,  labor_price: 179696, material_price: 4842, expense_price: 0, total_price: 184538 },
  { id: 'g1',  category: '토공',   name: '터파기(기계)',   spec: 'D150',   unit: 'm',    is_night: false, labor_price: 34207,  material_price: 684,  expense_price: 0, total_price: 34891  },
  { id: 'g2',  category: '토공',   name: '되메우기(기계)', spec: 'D150',   unit: 'm',    is_night: false, labor_price: 17103,  material_price: 342,  expense_price: 0, total_price: 17445  },
  { id: 'g3',  category: '토공',   name: '터파기(기계)',   spec: 'D200',   unit: 'm',    is_night: false, labor_price: 34207,  material_price: 684,  expense_price: 0, total_price: 34891  },
  { id: 'g4',  category: '토공',   name: '되메우기(기계)', spec: 'D200',   unit: 'm',    is_night: false, labor_price: 17103,  material_price: 342,  expense_price: 0, total_price: 17445  },
];

export async function GET() {
  if (!supabase) return NextResponse.json(FALLBACK);

  try {
    // Step 1: work_types 전체 조회 (JOIN 없이)
    const { data: workTypes, error: wtError } = await supabase
      .from('work_types')
      .select('id, category, name, spec, unit, is_night')
      .order('category')
      .order('name');

    if (wtError || !workTypes || workTypes.length === 0) {
      return NextResponse.json(FALLBACK);
    }

    // Step 2: work_components 별도 조회
    const wtIds = workTypes.map((w: { id: string }) => w.id);
    const { data: components, error: compError } = await supabase
      .from('work_components')
      .select('work_type_id, component_type, quantity')
      .in('work_type_id', wtIds);

    if (compError) {
      return NextResponse.json(FALLBACK);
    }

    // Step 3: work_type_id별로 fixed_* 타입 합산
    const compMap: Record<string, { labor: number; material: number; expense: number }> = {};
    for (const comp of (components ?? []) as { work_type_id: string; component_type: string; quantity: number }[]) {
      if (!compMap[comp.work_type_id]) {
        compMap[comp.work_type_id] = { labor: 0, material: 0, expense: 0 };
      }
      if (comp.component_type === 'fixed_labor') {
        compMap[comp.work_type_id].labor += comp.quantity;
      } else if (comp.component_type === 'fixed_material') {
        compMap[comp.work_type_id].material += comp.quantity;
      } else if (comp.component_type === 'fixed_expense') {
        compMap[comp.work_type_id].expense += comp.quantity;
      }
    }

    // Step 4: work_type 1개 → 정확히 1행
    const results: WorkTypeItem[] = (workTypes as { id: string; category: string; name: string; spec: string; unit: string; is_night: boolean }[]).map((wt) => {
      const p = compMap[wt.id] ?? { labor: 0, material: 0, expense: 0 };
      return {
        id: wt.id,
        category: wt.category,
        name: wt.name,
        spec: wt.spec,
        unit: wt.unit,
        is_night: wt.is_night,
        labor_price:    Math.floor(p.labor),
        material_price: Math.floor(p.material),
        expense_price:  Math.floor(p.expense),
        total_price:    Math.floor(p.labor + p.material + p.expense),
      };
    });

    return NextResponse.json(results);
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
