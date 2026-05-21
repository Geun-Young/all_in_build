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

    // JSON 감지 방법 3가지 시도
    let drawingData = null;

    const jsonMatch1 = text.match(/```json\n?([\s\S]*?)\n?```/);
    const jsonMatch2 = text.match(/```\n?([\s\S]*?)\n?```/);
    const jsonMatch3 = text.match(/\{[\s\S]*"pipes"[\s\S]*\}/);

    const rawJson = jsonMatch1?.[1] || jsonMatch2?.[1] || jsonMatch3?.[0];

    if (rawJson) {
      try {
        drawingData = JSON.parse(rawJson);
        drawingData.pipes = drawingData.pipes ?? [];
        drawingData.manholes = drawingData.manholes ?? [];
        drawingData.valves = drawingData.valves ?? [];
        drawingData.warnings = drawingData.warnings ?? [];
      } catch (e) {
        console.error('JSON 파싱 실패:', e);
      }
    }

    const cleanMessage = text
      .replace(/```json\n?[\s\S]*?\n?```/g, '')
      .replace(/```\n?[\s\S]*?\n?```/g, '')
      .trim();

    return NextResponse.json({
      message: cleanMessage,
      drawingData,
    });
  } catch (error) {
    console.error('Gemini 오류 상세:', error);
    return NextResponse.json({ error: 'AI 응답 오류', detail: String(error) }, { status: 500 });
  }
}
