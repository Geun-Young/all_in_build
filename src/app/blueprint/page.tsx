'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import Header from '@/components/layout/Header';
import { Send, Download, PenTool, Loader2, RotateCcw } from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type Pipe = { x1: number; y1: number; x2: number; y2: number; label: string };
type Manhole = { x: number; y: number; type: string; id: string };
type Valve = { x: number; y: number; type: string };

type DrawingData = {
  projectName: string;
  pipeType: string;
  diameter: number;
  totalLength: number;
  pipes: Pipe[];
  manholes: Manhole[];
  valves: Valve[];
  warnings: string[];
  designBasis?: {
    minDepth: string;
    minVelocity: string;
    manholeSpacing: string;
  };
};

const SESSION_KEY = 'blueprint_messages';

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content:
    '안녕하세요! 상하수도 관로 도면 설계를 도와드리겠습니다. 어떤 공사를 진행하실 예정인가요? (예: 오수관 신설, 상수도 교체 등)',
};

// ── SVG 도면 렌더링 컴포넌트 ──────────────────────────────────
function DrawingCanvas({ data }: { data: DrawingData }) {
  const PAD = 80;
  const LEGEND_W = 155;

  const allX = [
    ...data.pipes.flatMap((p) => [p.x1, p.x2]),
    ...data.manholes.map((m) => m.x),
    ...data.valves.map((v) => v.x),
  ];
  const allY = [
    ...data.pipes.flatMap((p) => [p.y1, p.y2]),
    ...data.manholes.map((m) => m.y),
    ...data.valves.map((v) => v.y),
  ];

  const minX = allX.length ? Math.min(...allX) : 0;
  const maxX = allX.length ? Math.max(...allX) : 500;
  const minY = allY.length ? Math.min(...allY) : 200;
  const maxY = allY.length ? Math.max(...allY) : 400;

  const vbX = minX - PAD;
  const vbY = minY - PAD;
  const vbW = maxX - minX + PAD * 2 + LEGEND_W;
  const vbH = Math.max(maxY - minY + PAD * 2, 200);

  const legendX = maxX + 35;
  const legendY = minY;

  return (
    <div className="w-full h-full flex flex-col gap-3">
      {/* 경고 배너 */}
      {data.warnings.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg space-y-1">
          {data.warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-800">
              ⚠️ {w}
            </p>
          ))}
        </div>
      )}

      {/* 공사 요약 */}
      <div>
        <p className="text-sm font-medium text-[#111827]">{data.projectName}</p>
        <p className="text-xs text-[#6b7280]">
          {data.pipeType} φ{data.diameter} / 연장 {data.totalLength}m
        </p>
      </div>

      {/* SVG 캔버스 */}
      <div className="flex-1 min-h-0">
        <svg
          viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
          className="w-full h-full border border-[#e5e7eb] rounded-xl bg-white"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 치수선 */}
          {data.pipes.map((pipe, i) => (
            <g key={`dim-${i}`}>
              <line
                x1={pipe.x1} y1={pipe.y1 - 28}
                x2={pipe.x2} y2={pipe.y2 - 28}
                stroke="#9ca3af" strokeWidth="0.8" strokeDasharray="4,3"
              />
              <line x1={pipe.x1} y1={pipe.y1} x2={pipe.x1} y2={pipe.y1 - 28}
                stroke="#9ca3af" strokeWidth="0.8" />
              <line x1={pipe.x2} y1={pipe.y2} x2={pipe.x2} y2={pipe.y2 - 28}
                stroke="#9ca3af" strokeWidth="0.8" />
            </g>
          ))}

          {/* 관로 */}
          {data.pipes.map((pipe, i) => (
            <g key={`pipe-${i}`}>
              <line
                x1={pipe.x1} y1={pipe.y1}
                x2={pipe.x2} y2={pipe.y2}
                stroke="#1e3a5f" strokeWidth="4" strokeLinecap="round"
              />
              {pipe.label && (
                <text
                  x={(pipe.x1 + pipe.x2) / 2}
                  y={(pipe.y1 + pipe.y2) / 2 - 38}
                  textAnchor="middle" fontSize="11" fill="#374151"
                >
                  {pipe.label}
                </text>
              )}
            </g>
          ))}

          {/* 맨홀 */}
          {data.manholes.map((mh, i) => (
            <g key={`mh-${i}`}>
              <circle cx={mh.x} cy={mh.y} r="20"
                fill="white" stroke="#1e3a5f" strokeWidth="2.5" />
              <text x={mh.x} y={mh.y + 4}
                textAnchor="middle" fontSize="9" fill="#1e3a5f" fontWeight="bold">
                MH
              </text>
              <text x={mh.x} y={mh.y + 36}
                textAnchor="middle" fontSize="9" fill="#6b7280">
                {mh.id}
              </text>
              <text x={mh.x} y={mh.y + 48}
                textAnchor="middle" fontSize="8" fill="#9ca3af">
                {mh.type}
              </text>
            </g>
          ))}

          {/* 밸브 (마름모) */}
          {data.valves.map((v, i) => (
            <g key={`valve-${i}`}>
              <polygon
                points={`${v.x},${v.y - 13} ${v.x + 13},${v.y} ${v.x},${v.y + 13} ${v.x - 13},${v.y}`}
                fill="#f97316" stroke="white" strokeWidth="1.5"
              />
              <text x={v.x} y={v.y + 28}
                textAnchor="middle" fontSize="9" fill="#374151">
                {v.type}
              </text>
            </g>
          ))}

          {/* 범례 */}
          <g transform={`translate(${legendX}, ${legendY})`}>
            <rect x="-8" y="-8" width="145" height="105"
              fill="white" stroke="#e5e7eb" strokeWidth="1" rx="4" />
            <text x="5" y="12" fontSize="10" fontWeight="bold" fill="#374151">범례</text>
            <line x1="5" y1="29" x2="33" y2="29" stroke="#1e3a5f" strokeWidth="3" />
            <text x="42" y="33" fontSize="9" fill="#374151">관로</text>
            <circle cx="19" cy="50" r="9" fill="white" stroke="#1e3a5f" strokeWidth="1.5" />
            <text x="42" y="54" fontSize="9" fill="#374151">맨홀</text>
            <polygon points="19,65 29,74 19,83 9,74" fill="#f97316" />
            <text x="42" y="78" fontSize="9" fill="#374151">밸브</text>
          </g>
        </svg>
      </div>

      {/* 설계 기준 요약 */}
      {data.designBasis && (
        <div className="border-t border-[#e5e7eb] pt-2 space-y-0.5">
          <p className="text-xs text-[#6b7280]">매설깊이: {data.designBasis.minDepth}</p>
          <p className="text-xs text-[#6b7280]">최소유속: {data.designBasis.minVelocity}</p>
          <p className="text-xs text-[#6b7280]">맨홀간격: {data.designBasis.manholeSpacing}</p>
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function BlueprintPage() {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return [INITIAL_MESSAGE];
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      return saved ? (JSON.parse(saved) as Message[]) : [INITIAL_MESSAGE];
    } catch {
      return [INITIAL_MESSAGE];
    }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [drawingData, setDrawingData] = useState<DrawingData | null>(null);
  const [mobileTab, setMobileTab] = useState<'chat' | 'drawing'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 메시지 변경 시 sessionStorage에 저장
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages));
    } catch {
      // sessionStorage 용량 초과 등 예외 무시
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleReset() {
    sessionStorage.removeItem(SESSION_KEY);
    setMessages([INITIAL_MESSAGE]);
    setDrawingData(null);
    setMobileTab('chat');
  }

  async function handleSend() {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/blueprint/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
      if (data.drawingData) {
        setDrawingData(data.drawingData);
        setMobileTab('drawing');
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'AI 응답 오류가 발생했습니다. 다시 시도해주세요.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExportDXF() {
    if (!drawingData) return;
    try {
      const res = await fetch('/api/blueprint/export-dxf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drawingData }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${drawingData.projectName || 'drawing'}.dxf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('DXF 내보내기 오류가 발생했습니다.');
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div>
      <Header title="도면 설계" />

      {/* 모바일 탭 */}
      <div className="md:hidden flex border-b border-[#e5e7eb] bg-white">
        {(['chat', 'drawing'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
              mobileTab === tab
                ? 'border-[#1e3a5f] text-[#1e3a5f] font-medium'
                : 'border-transparent text-[#6b7280]'
            }`}
          >
            {tab === 'chat' ? 'AI 대화' : '도면 미리보기'}
          </button>
        ))}
      </div>

      {/* 분할 패널 */}
      <div
        className="flex flex-col md:flex-row overflow-hidden pb-16 md:pb-0"
        style={{ height: 'calc(100svh - 56px)' }}
      >
        {/* ── 좌측: AI 대화 패널 ── */}
        <div
          className={`${
            mobileTab === 'chat' ? 'flex' : 'hidden'
          } md:flex flex-col w-full md:w-2/5 border-r border-[#e5e7eb] bg-white min-h-0`}
        >
          {/* 패널 헤더 */}
          <div className="px-5 py-3 border-b border-[#e5e7eb] flex-shrink-0 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#111827]">AI 도면 설계</p>
              <p className="text-xs text-[#6b7280]">AI와 대화로 도면을 자동 생성합니다</p>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-[#9ca3af] hover:text-[#6b7280] transition-colors"
            >
              <RotateCcw size={12} />
              대화 초기화
            </button>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#1e3a5f] text-white rounded-tr-sm'
                      : 'bg-white border border-[#e5e7eb] text-[#111827] rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#e5e7eb] rounded-2xl rounded-tl-sm px-4 py-3">
                  <Loader2 size={16} className="animate-spin text-[#9ca3af]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 입력 영역 */}
          <div className="p-4 border-t border-[#e5e7eb] flex-shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지 입력... (Enter 전송, Shift+Enter 줄바꿈)"
                rows={2}
                className="flex-1 resize-none border border-[#e5e7eb] rounded-xl px-3 py-2.5 text-sm text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:border-[#1e3a5f] transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="p-2.5 rounded-xl bg-[#1e3a5f] text-white hover:bg-[#2d5080] disabled:opacity-40 disabled:pointer-events-none transition-colors flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── 우측: 도면 미리보기 패널 ── */}
        <div
          className={`${
            mobileTab === 'drawing' ? 'flex' : 'hidden'
          } md:flex flex-col flex-1 bg-[#f8fafc] min-h-0`}
        >
          {/* 패널 헤더 */}
          <div className="px-5 py-3.5 bg-white border-b border-[#e5e7eb] flex items-center justify-between flex-shrink-0">
            <p className="text-sm font-medium text-[#111827]">도면 미리보기</p>
            <button
              onClick={handleExportDXF}
              disabled={!drawingData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <Download size={13} />
              DXF 내보내기
            </button>
          </div>

          {/* 도면 영역 */}
          <div className="flex-1 overflow-auto p-5 min-h-0">
            {drawingData ? (
              <DrawingCanvas data={drawingData} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                <PenTool size={44} className="text-[#d1d5db]" />
                <p className="text-sm text-[#9ca3af] leading-relaxed">
                  AI와 대화를 시작하면
                  <br />
                  도면이 여기에 표시됩니다
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
