import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { estimate_name, project_id } = body;

    const { data, error } = await supabase
      .from('estimates')
      .insert({
        estimate_name,
        project_id: project_id ?? null,
        status: 'draft',
        total_labor: 0,
        total_material: 0,
        total_expense: 0,
        total_amount: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, estimate_name, status, items } = body;

    const total_labor = items.reduce((s: number, i: { labor_amount: number }) => s + i.labor_amount, 0);
    const total_material = items.reduce((s: number, i: { material_amount: number }) => s + i.material_amount, 0);
    const total_expense = items.reduce((s: number, i: { expense_amount: number }) => s + i.expense_amount, 0);
    const total_amount = total_labor + total_material + total_expense;

    const { error: estimateError } = await supabase
      .from('estimates')
      .update({ estimate_name, status, total_labor, total_material, total_expense, total_amount })
      .eq('id', id);

    if (estimateError) throw estimateError;

    // 기존 항목 삭제 후 재삽입
    await supabase.from('estimate_items').delete().eq('estimate_id', id);

    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from('estimate_items')
        .insert(items.map((item: object, idx: number) => ({ ...item, estimate_id: id, sort_order: idx })));
      if (itemsError) throw itemsError;
    }

    return NextResponse.json({ success: true, total_amount });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
