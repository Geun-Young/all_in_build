import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calcUnitPrice, DEFAULT_LABOR_WAGES } from '@/lib/calcUnitPrice';
import { WorkComponent } from '@/types';

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
    const { data: workTypes, error } = await supabase
      .from('work_types')
      .select('*, work_components(*)')
      .order('category')
      .order('name');

    if (error || !workTypes || workTypes.length === 0) {
      return NextResponse.json(FALLBACK);
    }

    const { data: wages } = await supabase.from('labor_wages').select('job_type, unit_price');
    const laborWages: Record<string, number> = wages
      ? Object.fromEntries(wages.map((w: { job_type: string; unit_price: number }) => [w.job_type, w.unit_price]))
      : DEFAULT_LABOR_WAGES;

    const results: WorkTypeItem[] = [];

    for (const wt of workTypes) {
      const components = (wt.work_components ?? []) as WorkComponent[];

      const dayPrices = calcUnitPrice(components, wt.expense_rate, wt.expense_base, false, laborWages, wt.night_surcharge);
      results.push({
        id: wt.id,
        category: wt.category,
        name: wt.name,
        spec: wt.spec,
        unit: wt.unit,
        is_night: false,
        labor_price:    dayPrices.labor,
        material_price: dayPrices.material,
        expense_price:  dayPrices.expense,
        total_price:    dayPrices.total,
      });

      if (wt.night_surcharge > 0) {
        const nightPrices = calcUnitPrice(components, wt.expense_rate, wt.expense_base, true, laborWages, wt.night_surcharge);
        results.push({
          id: `${wt.id}_night`,
          category: wt.category,
          name: wt.name,
          spec: wt.spec,
          unit: wt.unit,
          is_night: true,
          labor_price:    nightPrices.labor,
          material_price: nightPrices.material,
          expense_price:  nightPrices.expense,
          total_price:    nightPrices.total,
        });
      }
    }

    return NextResponse.json(results);
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
