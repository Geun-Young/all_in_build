import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface MachineCostItem {
  id: string;
  name: string;
  spec: string;
  unit: string;
  labor_price: number;
  material_price: number;
  expense_price: number;
  total_price: number;
}

const FALLBACK: MachineCostItem[] = [
  { id: 'm01', name: '굴삭기(무한궤도)',    spec: '0.2㎥',    unit: 'hr', labor_price: 58296, material_price: 8427,  expense_price: 13399, total_price: 80122 },
  { id: 'm02', name: '램머',               spec: '80kg',     unit: 'hr', labor_price: 35913, material_price: 1163,  expense_price: 507,   total_price: 37583 },
  { id: 'm03', name: '커터',               spec: '320~400mm', unit: 'hr', labor_price: 35913, material_price: 10153, expense_price: 1981,  total_price: 48047 },
  { id: 'm04', name: '동력분무기',          spec: '4.85kw',   unit: 'hr', labor_price: 0,     material_price: 2357,  expense_price: 252,   total_price: 2609  },
  { id: 'm05', name: '굴삭기+브레이커',     spec: '0.2㎥',    unit: 'hr', labor_price: 58296, material_price: 8079,  expense_price: 16326, total_price: 82701 },
  { id: 'm06', name: '트럭탑재형크레인',    spec: '5Ton',     unit: 'hr', labor_price: 45531, material_price: 8525,  expense_price: 9726,  total_price: 63782 },
  { id: 'm07', name: '크레인(무한궤도)',    spec: '10Ton',    unit: 'hr', labor_price: 58296, material_price: 9695,  expense_price: 13899, total_price: 81890 },
  { id: 'm08', name: '덤프트럭',           spec: '4.5Ton',   unit: 'hr', labor_price: 45531, material_price: 9611,  expense_price: 7472,  total_price: 62614 },
  { id: 'm09', name: '로우더(타이어)',      spec: '0.57㎥',   unit: 'hr', labor_price: 58296, material_price: 7020,  expense_price: 7237,  total_price: 72553 },
  { id: 'm10', name: '플레이트콤팩터',      spec: '1.5Ton',   unit: 'hr', labor_price: 35913, material_price: 1813,  expense_price: 599,   total_price: 38325 },
  { id: 'm11', name: '진동로울러',          spec: '0.7Ton',   unit: 'hr', labor_price: 35913, material_price: 3462,  expense_price: 1902,  total_price: 41277 },
  { id: 'm12', name: '물탱크',             spec: '5500ℓ',    unit: 'hr', labor_price: 45531, material_price: 16841, expense_price: 9765,  total_price: 72137 },
  { id: 'm13', name: '아스팔트스프레이어', spec: '400ℓ',     unit: 'hr', labor_price: 35913, material_price: 1921,  expense_price: 771,   total_price: 38605 },
];

export async function GET() {
  if (!supabase) return NextResponse.json(FALLBACK);

  try {
    const { data, error } = await supabase
      .from('machine_costs')
      .select('*')
      .order('id');

    if (error || !data || data.length === 0) {
      return NextResponse.json(FALLBACK);
    }

    const results: MachineCostItem[] = data.map((m) => ({
      id:             m.id,
      name:           m.name,
      spec:           m.spec,
      unit:           m.unit ?? 'hr',
      labor_price:    m.labor_price    ?? m.labor_cost    ?? 0,
      material_price: m.material_price ?? m.material_cost ?? 0,
      expense_price:  m.expense_price  ?? m.expense_cost  ?? 0,
      total_price:    m.total_price    ?? m.total_cost    ?? 0,
    }));

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
