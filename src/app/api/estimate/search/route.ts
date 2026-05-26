import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calcUnitPrice, DEFAULT_LABOR_WAGES } from '@/lib/calcUnitPrice';
import { WorkComponent, WorkTypeResult } from '@/types';

// work_types 테이블이 없을 때 사용하는 더미 (품셈 기반 계산 결과)
const DUMMY_WORK_TYPES: Omit<WorkTypeResult, 'is_night'>[] = [
  { id: 'd1', code: '6-2-2',   category: '배관공', name: 'KP매커니컬접합', spec: 'Φ150mm',    unit: '개소', expense_rate: 2, expense_base: 'labor', night_surcharge: 87.5, unit_price: 32941,  labor_price: 32296,  material_price: 0, expense_price: 645 },
  { id: 'd2', code: '6-2-2',   category: '배관공', name: 'KP매커니컬접합', spec: 'Φ200mm',    unit: '개소', expense_rate: 2, expense_base: 'labor', night_surcharge: 87.5, unit_price: 52760,  labor_price: 51731,  material_price: 0, expense_price: 1029 },
  { id: 'd3', code: '6-2-2',   category: '배관공', name: 'KP매커니컬접합', spec: 'Φ300mm',    unit: '개소', expense_rate: 2, expense_base: 'labor', night_surcharge: 87.5, unit_price: 80974,  labor_price: 79387,  material_price: 0, expense_price: 1587 },
  { id: 'd4', code: '6-2-2-T', category: '배관공', name: '이탈방지접합',   spec: 'Φ150mm',    unit: '개소', expense_rate: 2, expense_base: 'labor', night_surcharge: 87.5, unit_price: 42824,  labor_price: 41985,  material_price: 0, expense_price: 839 },
  { id: 'd5', code: '6-2-2-T', category: '배관공', name: '이탈방지접합',   spec: 'Φ200mm',    unit: '개소', expense_rate: 2, expense_base: 'labor', night_surcharge: 87.5, unit_price: 68575,  labor_price: 67230,  material_price: 0, expense_price: 1345 },
  { id: 'd6', code: '6-2-3',   category: '배관공', name: '주철관절단',     spec: 'Φ150mm',    unit: '개소', expense_rate: 5, expense_base: 'labor', night_surcharge: 87.5, unit_price: 24931,  labor_price: 23744,  material_price: 0, expense_price: 1187 },
  { id: 'd7', code: '6-2-3',   category: '배관공', name: '주철관절단',     spec: 'Φ300mm',    unit: '개소', expense_rate: 5, expense_base: 'labor', night_surcharge: 87.5, unit_price: 39906,  labor_price: 37991,  material_price: 0, expense_price: 1899 },
  { id: 'd8', code: '6-2-3',   category: '배관공', name: '주철관절단',     spec: 'Φ800mm',    unit: '개소', expense_rate: 5, expense_base: 'labor', night_surcharge: 87.5, unit_price: 100680, labor_price: 95838,  material_price: 0, expense_price: 4842 },
];

function applyNight(base: Omit<WorkTypeResult, 'is_night'>, isNight: boolean): WorkTypeResult {
  if (!isNight) return { ...base, is_night: false };
  const nightAdd = Math.round(base.labor_price * 0.875);
  const labor = base.labor_price + nightAdd;
  return {
    ...base,
    labor_price: labor,
    unit_price: labor + base.material_price + base.expense_price,
    is_night: true,
  };
}

function filterDummy(q: string, category: string, isNight: boolean): WorkTypeResult[] {
  let results = [...DUMMY_WORK_TYPES];
  if (q) results = results.filter(r => r.name.includes(q) || r.spec.includes(q) || r.code.includes(q));
  if (category && category !== '전체') results = results.filter(r => r.category === category);
  return results.slice(0, 20).map(r => applyNight(r, isNight));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q        = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const isNight  = searchParams.get('night') === 'true';

  if (!supabase) return NextResponse.json(filterDummy(q, category, isNight));

  try {
    // work_types + 중첩 work_components 조회
    let query = supabase
      .from('work_types')
      .select('*, work_components(*)')
      .order('code')
      .limit(20);

    if (q) query = query.or(`name.ilike.%${q}%,spec.ilike.%${q}%,code.ilike.%${q}%`);
    if (category && category !== '전체') query = query.eq('category', category);

    const { data: workTypes, error } = await query;

    if (error) {
      // work_types 테이블 미생성 시 더미 반환
      if (error.code === 'PGRST205' || error.message?.includes('not found')) {
        return NextResponse.json(filterDummy(q, category, isNight));
      }
      throw error;
    }

    // 노임단가 조회
    const { data: wages } = await supabase.from('labor_wages').select('job_type, unit_price');
    const laborWages: Record<string, number> = wages
      ? Object.fromEntries(wages.map((w: { job_type: string; unit_price: number }) => [w.job_type, w.unit_price]))
      : DEFAULT_LABOR_WAGES;

    // 품셈 기반 단가 계산
    const results: WorkTypeResult[] = (workTypes ?? []).map((wt) => {
      const components = ((wt.work_components ?? []) as WorkComponent[]);
      const prices = calcUnitPrice(
        components,
        wt.expense_rate,
        wt.expense_base,
        isNight,
        laborWages,
        wt.night_surcharge,
      );
      return {
        id: wt.id, code: wt.code, category: wt.category, name: wt.name,
        spec: wt.spec, unit: wt.unit,
        expense_rate: wt.expense_rate, expense_base: wt.expense_base,
        night_surcharge: wt.night_surcharge,
        unit_price:    prices.total,
        labor_price:   prices.labor,
        material_price: prices.material,
        expense_price: prices.expense,
        is_night:      isNight,
      };
    });

    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json(filterDummy(q, category, isNight));
  }
}
