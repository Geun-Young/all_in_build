import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_REF = 'dignsnjyjetzrcrlawuv';

export async function POST(req: NextRequest) {
  const token = process.env.SUPABASE_MANAGEMENT_TOKEN;

  // SQL 파일 읽기
  const sqlPath = join(process.cwd(), 'supabase', 'migrations', '20260526_work_tables.sql');
  let sql: string;
  try {
    sql = readFileSync(sqlPath, 'utf-8');
  } catch {
    return NextResponse.json({ error: 'SQL 파일을 찾을 수 없습니다.' }, { status: 500 });
  }

  if (!token) {
    // 토큰 없으면 SQL 반환 (수동 실행 안내)
    return NextResponse.json({
      message: 'SUPABASE_MANAGEMENT_TOKEN이 없습니다. 아래 SQL을 Supabase SQL Editor에 붙여넣어 실행하세요.',
      sql,
    }, { status: 200 });
  }

  // Supabase Management API로 SQL 실행
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: 'Management API 오류', detail: data }, { status: res.status });
  }

  return NextResponse.json({ success: true, message: 'work_types, work_components 테이블 생성 완료', result: data });
}

// GET: SQL 텍스트만 반환
export async function GET() {
  const sqlPath = join(process.cwd(), 'supabase', 'migrations', '20260526_work_tables.sql');
  try {
    const sql = readFileSync(sqlPath, 'utf-8');
    return new Response(sql, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch {
    return NextResponse.json({ error: 'SQL 파일 없음' }, { status: 500 });
  }
}
