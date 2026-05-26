import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calcUnitPrice, DEFAULT_LABOR_WAGES } from '@/lib/calcUnitPrice';
import { WorkComponent } from '@/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workTypeId = searchParams.get('work_type_id');
  const isNight = searchParams.get('is_night') === 'true';

  if (!workTypeId) {
    return NextResponse.json({ error: 'work_type_id 필수' }, { status: 400 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase 미연결' }, { status: 503 });
  }

  try {
    // 공종 메타 조회
    const { data: workType, error: wtErr } = await supabase
      .from('work_types')
      .select('*')
      .eq('id', workTypeId)
      .single();
    if (wtErr) throw wtErr;

    // 품셈 구성 조회
    const { data: components, error: compErr } = await supabase
      .from('work_components')
      .select('*')
      .eq('work_type_id', workTypeId)
      .order('sort_order');
    if (compErr) throw compErr;

    // 노임단가 조회
    const { data: wages } = await supabase
      .from('labor_wages')
      .select('job_type, unit_price');

    const laborWages: Record<string, number> = wages
      ? Object.fromEntries(wages.map((w: { job_type: string; unit_price: number }) => [w.job_type, w.unit_price]))
      : DEFAULT_LABOR_WAGES;

    const result = calcUnitPrice(
      (components ?? []) as WorkComponent[],
      workType.expense_rate,
      workType.expense_base,
      isNight,
      laborWages,
      workType.night_surcharge,
    );

    return NextResponse.json({ ...result, work_type: workType });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
