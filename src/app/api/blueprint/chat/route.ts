import { NextRequest, NextResponse } from 'next/server';
import { geminiModel } from '@/lib/gemini';

type ChatMessage = { role: string; content: string };

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: ChatMessage[] } = await req.json();

    // Gemini 히스토리는 user로 시작해야 함 — 첫 assistant 메시지 제거
    const historySource = messages.slice(0, -1);
    const firstUserIdx = historySource.findIndex((m) => m.role === 'user');
    const validHistory = firstUserIdx >= 0 ? historySource.slice(firstUserIdx) : [];

    const chat = geminiModel.startChat({
      history: validHistory.map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('model' as const),
        parts: [{ text: m.content }],
      })),
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const text = result.response.text();

    // <<<DRAWING_DATA>>> ... <<<END>>> 구분자로 JSON 파싱
    let drawingData = null;
    const delimMatch = text.match(/<<<DRAWING_DATA>>>\s*([\s\S]*?)\s*<<<END>>>/);

    if (delimMatch?.[1]) {
      try {
        drawingData = JSON.parse(delimMatch[1]);
        drawingData.sections = drawingData.sections ?? [];
        drawingData.warnings = drawingData.warnings ?? [];
        drawingData.totalMaterials = drawingData.totalMaterials ?? [];
      } catch (e) {
        console.error('JSON 파싱 실패:', e);
      }
    }

    const cleanMessage = text
      .replace(/<<<DRAWING_DATA>>>[\s\S]*?<<<END>>>/g, '')
      .trim();

    return NextResponse.json({ message: cleanMessage, drawingData });
  } catch (error) {
    console.error('Gemini 오류:', error);
    return NextResponse.json({ error: 'AI 응답 오류', detail: String(error) }, { status: 500 });
  }
}
