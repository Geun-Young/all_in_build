'use client';

import { useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Pencil, Eraser, Undo2, Trash2, ImageUp } from 'lucide-react';
import type { SketchData, SketchStroke } from '@/types/drawing';

// 좌표는 0~100 퍼센트 정규화 (반응형·해상도 독립)
const VIEW_W = 1000;
const VIEW_H = 600;

export interface SketchPadHandle {
  /** 현재 스케치 데이터(좌표 + 배경) */
  getData: () => SketchData;
  /** 미리보기 PNG dataURL (배경 흰색 합성) */
  toPNG: () => Promise<string>;
  /** 비어있는지 (선·배경 모두 없음) */
  isEmpty: () => boolean;
  clear: () => void;
}

type Tool = 'pen' | 'eraser';

function pct(e: React.PointerEvent, el: SVGSVGElement): [number, number] {
  const r = el.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * 100;
  const y = ((e.clientY - r.top) / r.height) * 100;
  return [Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y))];
}

function strokeToPath(s: SketchStroke): string {
  if (s.points.length === 0) return '';
  return s.points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${(x / 100) * VIEW_W} ${(y / 100) * VIEW_H}`)
    .join(' ');
}

const SketchPad = forwardRef<SketchPadHandle, { className?: string }>(function SketchPad(
  { className },
  ref,
) {
  const [strokes, setStrokes] = useState<SketchStroke[]>([]);
  const [baseImage, setBaseImage] = useState<string | undefined>(undefined);
  const [tool, setTool] = useState<Tool>('pen');
  const drawing = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    getData: () => ({ strokes, baseImage }),
    isEmpty: () => strokes.length === 0 && !baseImage,
    clear: () => { setStrokes([]); setBaseImage(undefined); },
    toPNG: () =>
      new Promise<string>((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = VIEW_W;
        canvas.height = VIEW_H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);

        const drawStrokes = () => {
          ctx.strokeStyle = '#1e3a5f';
          ctx.lineWidth = 4;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          strokes.forEach((s) => {
            if (s.points.length === 0) return;
            ctx.beginPath();
            s.points.forEach(([x, y], i) => {
              const px = (x / 100) * VIEW_W;
              const py = (y / 100) * VIEW_H;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.stroke();
          });
          resolve(canvas.toDataURL('image/png'));
        };

        if (baseImage) {
          const img = new Image();
          img.onload = () => {
            ctx.globalAlpha = 0.6;
            ctx.drawImage(img, 0, 0, VIEW_W, VIEW_H);
            ctx.globalAlpha = 1;
            drawStrokes();
          };
          img.onerror = () => drawStrokes();
          img.src = baseImage;
        } else {
          drawStrokes();
        }
      }),
  }), [strokes, baseImage]);

  function onDown(e: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = pct(e, svgRef.current);
    if (tool === 'pen') {
      setStrokes((prev) => [...prev, { points: [p] }]);
    } else {
      eraseAt(p);
    }
  }

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drawing.current || !svgRef.current) return;
    const p = pct(e, svgRef.current);
    if (tool === 'pen') {
      setStrokes((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        return [...prev.slice(0, -1), { points: [...last.points, p] }];
      });
    } else {
      eraseAt(p);
    }
  }

  function onUp() {
    drawing.current = false;
  }

  // 지우개: 일정 거리 내 점을 가진 stroke 제거
  function eraseAt([x, y]: [number, number]) {
    const R = 4; // 퍼센트 반경
    setStrokes((prev) =>
      prev.filter((s) => !s.points.some(([px, py]) => Math.hypot(px - x, py - y) < R)),
    );
  }

  function undo() {
    setStrokes((prev) => prev.slice(0, -1));
  }

  function clearAll() {
    setStrokes([]);
    setBaseImage(undefined);
  }

  function onUpload(file: File) {
    const r = new FileReader();
    r.onload = (ev) => setBaseImage(ev.target?.result as string);
    r.readAsDataURL(file);
  }

  const btn = 'flex items-center gap-1.5 px-3 h-11 rounded-lg text-[14px] font-medium transition-colors';

  return (
    <div className={className}>
      {/* 도구 바 */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setTool('pen')}
          className={`${btn} ${tool === 'pen' ? 'bg-[#1e3a5f] text-white' : 'border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]'}`}
        >
          <Pencil size={16} /> 펜
        </button>
        <button
          type="button"
          onClick={() => setTool('eraser')}
          className={`${btn} ${tool === 'eraser' ? 'bg-[#1e3a5f] text-white' : 'border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]'}`}
        >
          <Eraser size={16} /> 지우개
        </button>
        <button type="button" onClick={undo} className={`${btn} border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]`}>
          <Undo2 size={16} /> 되돌리기
        </button>
        <button type="button" onClick={clearAll} className={`${btn} border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]`}>
          <Trash2 size={16} /> 전체 지우기
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className={`${btn} border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]`}>
          <ImageUp size={16} /> 사진 불러오기
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }}
        />
      </div>

      {/* 그리기 영역 */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full rounded-xl border border-[#e5e7eb] bg-white"
        style={{ touchAction: 'none', aspectRatio: `${VIEW_W} / ${VIEW_H}`, cursor: tool === 'pen' ? 'crosshair' : 'cell' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        {baseImage && (
          <image href={baseImage} x={0} y={0} width={VIEW_W} height={VIEW_H} opacity={0.6} preserveAspectRatio="xMidYMid meet" />
        )}
        {strokes.map((s, i) => (
          <path key={i} d={strokeToPath(s)} fill="none" stroke="#1e3a5f" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {strokes.length === 0 && !baseImage && (
          <text x={VIEW_W / 2} y={VIEW_H / 2} textAnchor="middle" fontSize={22} fill="#9ca3af">
            여기에 손가락이나 마우스로 노선을 대충 그려보세요
          </text>
        )}
      </svg>
    </div>
  );
});

export default SketchPad;
