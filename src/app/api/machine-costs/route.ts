import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 문서 기준 기계경비 (machine_costs 테이블 미연결 시 폴백)
const FALLBACK_MACHINE_COSTS = [
  { id: 'm01', name: '굴삭기(무한궤도)',    spec: '0.2㎥',          labor_cost: 58296, material_cost: 8427,  expense_cost: 13399, total_cost: 80122 },
  { id: 'm02', name: '램머',               spec: '80kg',           labor_cost: 35913, material_cost: 1163,  expense_cost: 507,   total_cost: 37583 },
  { id: 'm03', name: '커터',               spec: '320~400mm',      labor_cost: 35913, material_cost: 10153, expense_cost: 1981,  total_cost: 48047 },
  { id: 'm04', name: '동력분무기',          spec: '4.85kw',         labor_cost: 0,     material_cost: 2357,  expense_cost: 252,   total_cost: 2609  },
  { id: 'm05', name: '굴삭기+브레이커',     spec: '0.2㎥',          labor_cost: 58296, material_cost: 8079,  expense_cost: 16326, total_cost: 82701 },
  { id: 'm06', name: '트럭탑재형크레인',    spec: '5Ton',           labor_cost: 45531, material_cost: 8525,  expense_cost: 9726,  total_cost: 63782 },
  { id: 'm07', name: '크레인(무한궤도)',    spec: '10Ton',          labor_cost: 58296, material_cost: 9695,  expense_cost: 13899, total_cost: 81890 },
  { id: 'm08', name: '덤프트럭',           spec: '4.5Ton',         labor_cost: 45531, material_cost: 9611,  expense_cost: 7472,  total_cost: 62614 },
  { id: 'm09', name: '로우더(타이어)',      spec: '0.57㎥',         labor_cost: 58296, material_cost: 7020,  expense_cost: 7237,  total_cost: 72553 },
  { id: 'm10', name: '플레이트콤팩터',      spec: '1.5Ton',         labor_cost: 35913, material_cost: 1813,  expense_cost: 599,   total_cost: 38325 },
  { id: 'm11', name: '진동로울러',          spec: '0.7Ton',         labor_cost: 35913, material_cost: 3462,  expense_cost: 1902,  total_cost: 41277 },
  { id: 'm12', name: '물탱크',             spec: '5500ℓ',          labor_cost: 45531, material_cost: 16841, expense_cost: 9765,  total_cost: 72137 },
  { id: 'm13', name: '아스팔트스프레이어', spec: '400ℓ',           labor_cost: 35913, material_cost: 1921,  expense_cost: 771,   total_cost: 38605 },
];

export async function GET() {
  if (!supabase) return NextResponse.json(FALLBACK_MACHINE_COSTS);

  try {
    const { data, error } = await supabase
      .from('machine_costs')
      .select('*')
      .order('id');

    if (error || !data || data.length === 0) {
      return NextResponse.json(FALLBACK_MACHINE_COSTS);
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(FALLBACK_MACHINE_COSTS);
  }
}
