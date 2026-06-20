import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/blueprint/drawings?project_id=...  → 도면 목록
export async function GET(req: NextRequest) {
  if (!supabase) return NextResponse.json({ error: 'Supabase 미연결' }, { status: 503 });
  try {
    const projectId = req.nextUrl.searchParams.get('project_id');
    let query = supabase
      .from('drawings')
      .select('id, project_id, name, drawing_data, thumbnail, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(100);
    if (projectId) query = query.eq('project_id', projectId);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/blueprint/drawings  → 새 도면 저장
export async function POST(req: NextRequest) {
  if (!supabase) return NextResponse.json({ error: 'Supabase 미연결' }, { status: 503 });
  try {
    const body = await req.json();
    const { project_id, name, drawing_data, sketch_data, thumbnail } = body;
    const { data, error } = await supabase
      .from('drawings')
      .insert({
        project_id: project_id ?? null,
        name: name ?? '제목 없는 도면',
        drawing_data,
        sketch_data: sketch_data ?? null,
        thumbnail: thumbnail ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PUT /api/blueprint/drawings  → 기존 도면 수정
export async function PUT(req: NextRequest) {
  if (!supabase) return NextResponse.json({ error: 'Supabase 미연결' }, { status: 503 });
  try {
    const body = await req.json();
    const { id, name, drawing_data, sketch_data, thumbnail } = body;
    if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });
    const { data, error } = await supabase
      .from('drawings')
      .update({
        ...(name !== undefined && { name }),
        ...(drawing_data !== undefined && { drawing_data }),
        ...(sketch_data !== undefined && { sketch_data }),
        ...(thumbnail !== undefined && { thumbnail }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/blueprint/drawings?id=...
export async function DELETE(req: NextRequest) {
  if (!supabase) return NextResponse.json({ error: 'Supabase 미연결' }, { status: 503 });
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });
    const { error } = await supabase.from('drawings').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
