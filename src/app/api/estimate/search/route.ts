import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DUMMY_PRICES = [
  { id: 'd1', code: 'E001', category: '터파기', work_name: '터파기 (보통토)', spec: 'D150', unit: 'm³', unit_price: 15000, labor_ratio: 70, is_night: false, standard_year: '2024' },
  { id: 'd2', code: 'E002', category: '터파기', work_name: '터파기 (암반)', spec: 'D150', unit: 'm³', unit_price: 45000, labor_ratio: 65, is_night: false, standard_year: '2024' },
  { id: 'd3', code: 'E003', category: '터파기', work_name: '야간 터파기 (보통토)', spec: 'D150', unit: 'm³', unit_price: 19500, labor_ratio: 70, is_night: true, standard_year: '2024' },
  { id: 'd4', code: 'P001', category: '배관공', work_name: 'DCIP 이음 (소켓형) D150', spec: 'D150', unit: 'm', unit_price: 28000, labor_ratio: 60, is_night: false, standard_year: '2024' },
  { id: 'd5', code: 'P002', category: '배관공', work_name: 'DCIP 이음 (소켓형) D200', spec: 'D200', unit: 'm', unit_price: 35000, labor_ratio: 60, is_night: false, standard_year: '2024' },
  { id: 'd6', code: 'P003', category: '배관공', work_name: 'PE관 융착 D100', spec: 'D100', unit: 'm', unit_price: 22000, labor_ratio: 55, is_night: false, standard_year: '2024' },
  { id: 'd7', code: 'P004', category: '배관공', work_name: '야간 DCIP 이음 D150', spec: 'D150', unit: 'm', unit_price: 36400, labor_ratio: 60, is_night: true, standard_year: '2024' },
  { id: 'd8', code: 'B001', category: '되메우기', work_name: '되메우기 (다짐)', spec: '-', unit: 'm³', unit_price: 8000, labor_ratio: 75, is_night: false, standard_year: '2024' },
  { id: 'd9', code: 'B002', category: '되메우기', work_name: '되메우기 (모래)', spec: '-', unit: 'm³', unit_price: 12000, labor_ratio: 50, is_night: false, standard_year: '2024' },
  { id: 'd10', code: 'R001', category: '포장', work_name: '아스팔트 포장 복구 (t=5cm)', spec: 't=5cm', unit: 'm²', unit_price: 25000, labor_ratio: 40, is_night: false, standard_year: '2024' },
  { id: 'd11', code: 'R002', category: '포장', work_name: '콘크리트 포장 복구 (t=15cm)', spec: 't=15cm', unit: 'm²', unit_price: 38000, labor_ratio: 35, is_night: false, standard_year: '2024' },
  { id: 'd12', code: 'M001', category: '구조물공', work_name: '맨홀 신설 (1호, D=900)', spec: '1호', unit: '개소', unit_price: 850000, labor_ratio: 45, is_night: false, standard_year: '2024' },
  { id: 'd13', code: 'M002', category: '구조물공', work_name: '맨홀 신설 (2호, D=1200)', spec: '2호', unit: '개소', unit_price: 1200000, labor_ratio: 45, is_night: false, standard_year: '2024' },
  { id: 'd14', code: 'V001', category: '배관공', work_name: '제수밸브 설치 D150', spec: 'D150', unit: '개소', unit_price: 180000, labor_ratio: 65, is_night: false, standard_year: '2024' },
  { id: 'd15', code: 'C001', category: '콘크리트타설', work_name: '콘크리트 타설 (무근, 25MPa)', spec: '25MPa', unit: 'm³', unit_price: 95000, labor_ratio: 30, is_night: false, standard_year: '2024' },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const night = searchParams.get('night') === 'true';

  try {
    let query = supabase
      .from('standard_prices')
      .select('*')
      .eq('is_night', night)
      .order('unit_price', { ascending: true })
      .limit(20);

    if (q) query = query.ilike('work_name', `%${q}%`);
    if (category && category !== '전체') query = query.eq('category', category);

    const { data, error } = await query;

    if (error) throw error;
    if (data && data.length > 0) {
      return NextResponse.json(data);
    }
  } catch {
    // Supabase 미연결 시 더미 데이터 반환
  }

  // 더미 데이터 필터링
  let results = DUMMY_PRICES.filter((p) => p.is_night === night);
  if (q) results = results.filter((p) => p.work_name.includes(q) || p.code.includes(q));
  if (category && category !== '전체') results = results.filter((p) => p.category === category);

  return NextResponse.json(results.slice(0, 20));
}
