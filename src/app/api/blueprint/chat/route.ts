import { NextRequest, NextResponse } from 'next/server';
import { geminiModel } from '@/lib/gemini';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // JSON 도면 데이터 감지
    let drawingData = null;
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        drawingData = JSON.parse(jsonMatch[1]);
        if (drawingData) {
          drawingData.pipes = drawingData.pipes ?? [];
          drawingData.manholes = drawingData.manholes ?? [];
          drawingData.valves = drawingData.valves ?? [];
          drawingData.warnings = drawingData.warnings ?? [];
        }
      } catch {
        // JSON 파싱 실패 시 무시
      }
    }

    return NextResponse.json({
      message: text.replace(/```json\n[\s\S]*?\n```/, '').trim(),
      drawingData,
    });
  } catch (error) {
    console.error('Gemini 오류 상세:', error);
    return NextResponse.json({ error: 'AI 응답 오류', detail: String(error) }, { status: 500 });
  }
}
