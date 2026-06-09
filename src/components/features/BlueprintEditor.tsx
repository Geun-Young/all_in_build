'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ChevronRight, ChevronLeft, Upload, MapPin,
  Trash2, Check, Zap, FileDown, Link2, Download,
} from 'lucide-react';
import type { EstimateItem } from '@/types';

// ── 타입 ─────────────────────────────────────────────
type SymType = 'kp' | 'isolation' | 'valve' | 'airvalve';
type ActiveTool = 'select' | SymType;

interface BpPin { id: string; label: string; x: number; y: number; }
interface BpSymbol { id: string; type: SymType; position: number; num: number; }
interface BpSection {
  id: string; label: string;
  existingPipe: string; newPipe: string; length: number;
  symbols: BpSymbol[];
}

const PIPE_SIZES = ['D100','D150','D200','D250','D300','D350','D400','D450','D500'];
const SYM_NAMES: Record<SymType, string> = {
  kp: 'KP매커니컬접합', isolation: '이탈방지접합', valve: '제수밸브', airvalve: '공기밸브',
};
const SYM_BTN: Record<SymType, string> = {
  kp: '○ KP매커니컬접합', isolation: '⊗ 이탈방지접합', valve: '× 제수밸브', airvalve: '◎ 공기밸브',
};
const CIRCLED = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮'];

// ── 기호 SVG ─────────────────────────────────────────
function SymSvg({ type, cx, cy, selected }: { type: SymType; cx: number; cy: number; selected?: boolean }) {
  const col = selected ? '#f59e0b' : '#1e3a5f';
  if (type === 'kp') return <circle cx={cx} cy={cy} r={10} fill="white" stroke={col} strokeWidth={2} />;
  if (type === 'isolation') return (
    <>
      <circle cx={cx} cy={cy} r={12} fill="white" stroke={col} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={6}  fill="white" stroke={col} strokeWidth={1.5} />
    </>
  );
  if (type === 'valve') return (
    <>
      <circle cx={cx} cy={cy} r={10} fill="white" stroke={col} strokeWidth={2} />
      <line x1={cx-7} y1={cy-7} x2={cx+7} y2={cy+7} stroke={col} strokeWidth={2} />
      <line x1={cx+7} y1={cy-7} x2={cx-7} y2={cy+7} stroke={col} strokeWidth={2} />
    </>
  );
  return <polygon points={`${cx},${cy-10} ${cx-8},${cy+8} ${cx+8},${cy+8}`} fill={col} />;
}

// ── 메인 컴포넌트 ─────────────────────────────────────
export interface BlueprintEditorProps {
  projectId: string;
  onAddItems: (items: EstimateItem[]) => void;
}

export default function BlueprintEditor({ projectId, onAddItems }: BlueprintEditorProps) {
  const [step, setStep] = useState(1);
  const [planImage, setPlanImage] = useState<string | null>(null);
  const [pins, setPins] = useState<BpPin[]>([]);
  const [sections, setSections] = useState<BpSection[]>([]);
  const [addingPin, setAddingPin] = useState(false);
  const [selectedSecId, setSelectedSecId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [selectedSymId, setSelectedSymId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const [estimateLinked, setEstimateLinked] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedSec = sections.find(s => s.id === selectedSecId) ?? null;

  // sessionStorage 복원
  useEffect(() => {
    try {
      const d = JSON.parse(sessionStorage.getItem(`bp_editor_${projectId}`) ?? 'null');
      if (!d) return;
      if (d.planImage) setPlanImage(d.planImage);
      if (d.pins) setPins(d.pins);
      if (d.sections) { setSections(d.sections); setSelectedSecId(d.sections[0]?.id ?? null); }
      if (d.step) setStep(d.step);
    } catch {}
  }, [projectId]);

  function persist(patch: { planImage?: string | null; pins?: BpPin[]; sections?: BpSection[]; step?: number }) {
    sessionStorage.setItem(`bp_editor_${projectId}`, JSON.stringify({
      planImage, pins, sections, step, ...patch,
    }));
  }

  // ── 1단계 ───────────────────────────────────────────
  function handleFile(file: File) {
    const r = new FileReader();
    r.onload = (e) => {
      const url = e.target?.result as string;
      setPlanImage(url);
      persist({ planImage: url });
    };
    r.readAsDataURL(file);
  }

  // ── 2단계 ───────────────────────────────────────────
  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!addingPin) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const num = pins.length + 1;
    const label = `No.${num}`;
    const newPin: BpPin = { id: `pin-${Date.now()}`, label, x, y };
    const newSec: BpSection = {
      id: `sec-${Date.now()}`, label,
      existingPipe: 'D350', newPipe: 'D400', length: 50, symbols: [],
    };
    const np = [...pins, newPin];
    const ns = [...sections, newSec];
    setPins(np);
    setSections(ns);
    persist({ pins: np, sections: ns });
    setAddingPin(false);
  }

  function deletePin(idx: number) {
    const np = pins.filter((_, i) => i !== idx);
    const ns = sections.filter((_, i) => i !== idx);
    setPins(np);
    setSections(ns);
    persist({ pins: np, sections: ns });
    if (selectedSecId === sections[idx]?.id) setSelectedSecId(ns[0]?.id ?? null);
  }

  // ── 3단계 ───────────────────────────────────────────
  function updateSec(id: string, patch: Partial<BpSection>) {
    const ns = sections.map(s => s.id === id ? { ...s, ...patch } : s);
    setSections(ns);
    persist({ sections: ns });
  }

  function deleteSym(secId: string, symId: string) {
    const sec = sections.find(s => s.id === secId);
    if (!sec) return;
    const syms = sec.symbols.filter(sy => sy.id !== symId).map((sy, i) => ({ ...sy, num: i + 1 }));
    updateSec(secId, { symbols: syms });
    setSelectedSymId(null);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSymId && selectedSec) {
        deleteSym(selectedSec.id, selectedSymId);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedSymId, selectedSec]);  // eslint-disable-line

  async function handleAi() {
    if (!selectedSec) return;
    setAiLoading(true); setAiMsg('');
    try {
      const prompt = `구간: ${selectedSec.label}, 기존관: ${selectedSec.existingPipe}, 신설관: ${selectedSec.newPipe}, 연장: ${selectedSec.length}m. 설계기준에 맞게 KP매커니컬접합/이탈방지접합/제수밸브/공기밸브 배치를 추천해줘. position은 0~1(관로 위치 비율). 응답 형식 {"symbols":[{"type":"kp","position":0.1}],"suggestions":["..."]}`;
      const res = await fetch('/api/blueprint/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await res.json();
      let syms: Array<{ type: string; position: number }> = [];
      const raw = data.message ?? '';
      const m = raw.match(/\{[\s\S]*"symbols"[\s\S]*\}/);
      if (m) { try { syms = JSON.parse(m[0]).symbols ?? []; } catch {} }
      if (syms.length > 0) {
        const newSyms: BpSymbol[] = syms.map((s, i) => ({
          id: `sym-ai-${Date.now()}-${i}`, type: s.type as SymType,
          position: Math.max(0.02, Math.min(0.98, s.position)), num: i + 1,
        }));
        updateSec(selectedSec.id, { symbols: newSyms });
        setAiMsg(`AI가 ${newSyms.length}개 기호를 배치했습니다.`);
      } else {
        setAiMsg(raw.slice(0, 100) || 'AI 추천을 받지 못했습니다.');
      }
    } catch { setAiMsg('AI 연결 오류가 발생했습니다.'); }
    finally { setAiLoading(false); }
  }

  function getMaterials() {
    const map: Record<string, number> = {};
    sections.forEach(sec => {
      sec.symbols.forEach(sym => {
        const k = `${SYM_NAMES[sym.type]}|${sec.newPipe}`;
        map[k] = (map[k] ?? 0) + 1;
      });
    });
    return Object.entries(map).map(([k, qty]) => {
      const [name, spec] = k.split('|');
      return { name, spec, unit: '개', qty };
    });
  }

  function handleEstimateLink() {
    const mats = getMaterials();
    onAddItems(mats.map((m, i) => ({
      id: `bp-${Date.now()}-${i}`, estimate_id: projectId, category: '배관공',
      work_name: `${m.name} ${m.spec}`.trim(), spec: m.spec, unit: m.unit, quantity: m.qty,
      unit_price: 0, labor_amount: 0, material_amount: 0, expense_amount: 0, total_amount: 0,
      is_night: false, sort_order: i,
    })));
    setEstimateLinked(true);
    setTimeout(() => setEstimateLinked(false), 4000);
  }

  async function handleDxf() {
    const drawingData = {
      projectName: `${projectId}_계통도`,
      sections: sections.map(sec => ({
        id: sec.label, existingPipe: sec.existingPipe, newPipe: sec.newPipe, length: sec.length,
        components: Object.entries(
          sec.symbols.reduce<Record<string, number>>((acc, s) => { acc[s.type] = (acc[s.type] ?? 0) + 1; return acc; }, {})
        ).map(([type, qty]) => ({ type, spec: sec.newPipe, qty })),
      })),
      warnings: [], totalMaterials: getMaterials(),
    };
    try {
      const res = await fetch('/api/blueprint/export-dxf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drawingData }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = '계통도.dxf'; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('DXF 생성 실패'); }
  }

  // ── SVG 캔버스 상수 ───────────────────────────────
  const W = 700; const PL = 80; const PR = 100; const pW = W - PL - PR;
  const YA = 28; const YE = 68; const YN = 116; const YS = 150; const YNM = 172; const SH = 198;

  const STEPS = ['① 평면도', '② 구간 설정', '③ 계통도 설계'];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── 스텝 바 ─────────────────────────────── */}
      <div className="bg-white border-b border-[#e5e7eb] flex items-center px-4 gap-2 flex-shrink-0" style={{ height: '52px' }}>
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = step > n; const active = step === n;
          return (
            <button key={n}
              onClick={() => n < step && setStep(n)}
              className={`flex items-center gap-1.5 px-3 rounded-lg transition-colors ${
                done  ? 'bg-[#1e3a5f] text-white cursor-pointer' :
                active ? 'border-2 border-[#1e3a5f] text-[#1e3a5f] font-medium cursor-default' :
                         'text-[#9ca3af] cursor-default'
              }`}
              style={{ height: '36px', fontSize: '13px' }}
            >
              {done && <Check size={12} />}
              {label}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════
          1단계: 평면도 업로드
      ════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex flex-col border-r border-[#e5e7eb] p-5 gap-4 overflow-y-auto flex-shrink-0" style={{ width: '40%' }}>
            <div>
              <h2 className="font-semibold text-[#111827]" style={{ fontSize: '17px' }}>공사 평면도 업로드</h2>
              <p className="text-[#6b7280] mt-1" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                발주처에서 받은 도면 파일을 업로드하세요.<br />
                지도 위에 구간을 직접 표시할 수 있습니다.
              </p>
            </div>

            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              className="border-2 border-dashed border-[#d1d5db] rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#1e3a5f] transition-colors"
              style={{ minHeight: '160px' }}
            >
              {planImage ? (
                <div className="flex items-center gap-2 text-green-700">
                  <Check size={18} />
                  <span style={{ fontSize: '14px' }}>파일 업로드 완료 — 다시 클릭하면 교체</span>
                </div>
              ) : (
                <>
                  <Upload size={28} className="text-[#9ca3af]" />
                  <p className="text-[#6b7280]" style={{ fontSize: '14px' }}>클릭하거나 드래그하세요</p>
                  <p className="text-[#9ca3af]" style={{ fontSize: '12px' }}>PNG · JPG 지원</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            <div className="flex flex-col gap-2 mt-auto">
              <button onClick={() => { setStep(2); persist({ step: 2 }); }} disabled={!planImage}
                className="w-full bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d5080] disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ height: '48px', fontSize: '15px' }}>
                다음 단계 <ChevronRight size={16} />
              </button>
              <button onClick={() => { setStep(2); persist({ step: 2 }); }}
                className="w-full border border-[#e5e7eb] rounded-xl text-[#6b7280] hover:bg-[#f3f4f6]"
                style={{ height: '48px', fontSize: '15px' }}>
                평면도 없이 진행
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center bg-[#f8fafc]">
            {planImage
              ? <img src={planImage} alt="평면도" className="max-w-full max-h-full object-contain p-4" />
              : <p className="text-[#9ca3af]" style={{ fontSize: '15px' }}>파일을 업로드하면 여기에 표시됩니다</p>
            }
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          2단계: 구간 설정 (핀 찍기)
      ════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 도구 모음 */}
          <div className="bg-white border-b border-[#e5e7eb] px-4 flex items-center gap-3 flex-shrink-0" style={{ height: '52px' }}>
            <button
              onClick={() => setAddingPin(!addingPin)}
              className={`flex items-center gap-1.5 px-3 rounded-lg transition-colors ${
                addingPin ? 'bg-[#1e3a5f] text-white' : 'border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]'
              }`}
              style={{ height: '36px', fontSize: '13px' }}>
              <MapPin size={14} /> {addingPin ? '캔버스를 클릭하여 핀 배치' : '📍 구간 추가'}
            </button>
            <span className="text-[#9ca3af]" style={{ fontSize: '13px' }}>총 {pins.length}개 구간</span>
            <div className="ml-auto flex gap-2">
              <button onClick={() => { setStep(1); persist({ step: 1 }); }}
                className="border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] flex items-center gap-1 px-3"
                style={{ height: '36px', fontSize: '13px' }}>
                <ChevronLeft size={14} /> 이전
              </button>
              <button
                onClick={() => { setStep(3); setSelectedSecId(sections[0]?.id ?? null); persist({ step: 3 }); }}
                disabled={pins.length === 0}
                className="bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d5080] disabled:opacity-40 flex items-center gap-1 px-4"
                style={{ height: '36px', fontSize: '13px' }}>
                계통도 설계 시작 <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* 캔버스 */}
          <div
            onClick={handleCanvasClick}
            className={`flex-1 relative overflow-hidden ${addingPin ? 'cursor-crosshair' : ''}`}
            style={{
              background: planImage
                ? `url(${planImage}) center/contain no-repeat #f8fafc`
                : `repeating-linear-gradient(0deg,transparent,transparent 39px,#e5e7eb 39px,#e5e7eb 40px),
                   repeating-linear-gradient(90deg,transparent,transparent 39px,#e5e7eb 39px,#e5e7eb 40px),#f8fafc`,
            }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {pins.slice(1).map((pin, i) => {
                const prev = pins[i];
                return <line key={pin.id}
                  x1={`${prev.x}%`} y1={`${prev.y}%`} x2={`${pin.x}%`} y2={`${pin.y}%`}
                  stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="6,4" />;
              })}
            </svg>
            {pins.map((pin, i) => (
              <div key={pin.id} className="absolute pointer-events-none flex flex-col items-center"
                style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%,-50%)' }}>
                <div className="w-9 h-9 rounded-full bg-[#ef4444] border-2 border-white shadow-md flex items-center justify-center text-white font-bold"
                  style={{ fontSize: '12px' }}>{i + 1}</div>
                <span className="bg-white text-[#374151] px-1.5 rounded shadow-sm mt-0.5" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                  {pin.label}
                </span>
              </div>
            ))}
          </div>

          {/* 구간 목록 */}
          {sections.length > 0 && (
            <div className="border-t border-[#e5e7eb] bg-white px-4 py-3 flex gap-3 overflow-x-auto flex-shrink-0">
              {sections.map((sec, i) => (
                <div key={sec.id} className="flex-shrink-0 border border-[#e5e7eb] rounded-lg px-3 py-2 flex items-center gap-2"
                  style={{ minWidth: '160px' }}>
                  <div className="w-7 h-7 rounded-full bg-[#ef4444] text-white flex items-center justify-center font-bold flex-shrink-0"
                    style={{ fontSize: '11px' }}>{i + 1}</div>
                  <span className="text-[#374151] font-medium flex-1" style={{ fontSize: '13px' }}>{sec.label}</span>
                  <button onClick={() => deletePin(i)} className="text-[#9ca3af] hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          3단계: 계통도 설계
      ════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="flex-1 flex overflow-hidden">
          {/* 좌측 패널 */}
          <div className="flex flex-col border-r border-[#e5e7eb] bg-white overflow-y-auto flex-shrink-0"
            style={{ width: '260px' }}>
            {/* 구간 선택 */}
            <div className="border-b border-[#e5e7eb] p-3">
              <p className="text-[#9ca3af] mb-2" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>구간 선택</p>
              <div className="space-y-1">
                {sections.map((sec) => (
                  <button key={sec.id}
                    onClick={() => { setSelectedSecId(sec.id); setSelectedSymId(null); setActiveTool('select'); }}
                    className={`w-full flex items-center gap-2 px-3 rounded-lg text-left transition-colors ${
                      selectedSecId === sec.id ? 'bg-[#1e3a5f] text-white' : 'text-[#374151] hover:bg-[#f3f4f6]'
                    }`}
                    style={{ height: '36px', fontSize: '13px' }}>
                    {sec.symbols.length > 0
                      ? <Check size={12} className={selectedSecId === sec.id ? 'text-green-300' : 'text-green-500'} />
                      : <span className="w-3 h-3" />}
                    {sec.label}
                    <span className={`ml-auto text-xs ${selectedSecId === sec.id ? 'text-blue-200' : 'text-[#9ca3af]'}`}>
                      {sec.symbols.length}개
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {selectedSec && (
              <>
                {/* 관로 설정 */}
                <div className="border-b border-[#e5e7eb] p-3 space-y-2.5">
                  <p className="text-[#9ca3af]" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>관로 설정</p>
                  {[
                    { label: '기존관', key: 'existingPipe' as const },
                    { label: '신설관', key: 'newPipe' as const },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="text-[#6b7280] block mb-1" style={{ fontSize: '11px' }}>{label}</label>
                      <select value={selectedSec[key]}
                        onChange={(e) => updateSec(selectedSec.id, { [key]: e.target.value })}
                        className="w-full border border-[#e5e7eb] rounded px-2 text-[#374151] focus:outline-none focus:border-[#1e3a5f]"
                        style={{ height: '32px', fontSize: '13px' }}>
                        {PIPE_SIZES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  ))}
                  <div>
                    <label className="text-[#6b7280] block mb-1" style={{ fontSize: '11px' }}>연장 (m)</label>
                    <input type="number" min={1} value={selectedSec.length}
                      onChange={(e) => updateSec(selectedSec.id, { length: parseInt(e.target.value) || 0 })}
                      className="w-full border border-[#e5e7eb] rounded px-2 text-[#374151] focus:outline-none focus:border-[#1e3a5f]"
                      style={{ height: '32px', fontSize: '13px' }} />
                  </div>
                </div>

                {/* 기호 추가 */}
                <div className="border-b border-[#e5e7eb] p-3 space-y-1.5">
                  <p className="text-[#9ca3af] mb-2" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>기호 추가</p>
                  {(Object.keys(SYM_BTN) as SymType[]).map(t => (
                    <button key={t}
                      onClick={() => setActiveTool(activeTool === t ? 'select' : t)}
                      className={`w-full text-left px-3 rounded-lg transition-colors ${
                        activeTool === t ? 'bg-[#1e3a5f] text-white' : 'border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]'
                      }`}
                      style={{ height: '34px', fontSize: '12px' }}>
                      {SYM_BTN[t]}
                    </button>
                  ))}
                  {activeTool !== 'select' && (
                    <p className="text-[#1e3a5f] bg-blue-50 rounded px-2 py-1.5" style={{ fontSize: '11px' }}>
                      캔버스를 클릭하여 배치
                    </p>
                  )}
                </div>

                {/* AI */}
                <div className="border-b border-[#e5e7eb] p-3 space-y-2">
                  <p className="text-[#9ca3af]" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI 도움</p>
                  <button onClick={handleAi} disabled={aiLoading}
                    className="w-full flex items-center justify-center gap-2 border border-[#1e3a5f] text-[#1e3a5f] rounded-lg hover:bg-[#f0f4f9] disabled:opacity-50"
                    style={{ height: '36px', fontSize: '13px' }}>
                    <Zap size={14} /> {aiLoading ? 'AI 분석 중...' : 'AI 자동 완성'}
                  </button>
                  {aiMsg && <p className="text-[#6b7280]" style={{ fontSize: '11px', lineHeight: '1.5' }}>{aiMsg}</p>}
                </div>

                {/* 자재 집계 */}
                <div className="p-3">
                  <p className="text-[#9ca3af] mb-2" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>이 구간 자재</p>
                  {selectedSec.symbols.length === 0
                    ? <p className="text-[#9ca3af]" style={{ fontSize: '12px' }}>기호를 추가하세요</p>
                    : Object.entries(
                        selectedSec.symbols.reduce<Record<string, number>>((a, s) => {
                          a[SYM_NAMES[s.type]] = (a[SYM_NAMES[s.type]] ?? 0) + 1; return a;
                        }, {})
                      ).map(([name, qty]) => (
                        <div key={name} className="flex justify-between py-0.5" style={{ fontSize: '12px' }}>
                          <span className="text-[#374151]">{name}</span>
                          <span className="font-semibold text-[#1e3a5f]">{qty}개</span>
                        </div>
                      ))
                  }
                </div>
              </>
            )}
          </div>

          {/* 우측 캔버스 영역 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 액션 바 */}
            <div className="bg-white border-b border-[#e5e7eb] px-4 flex items-center gap-2 flex-shrink-0"
              style={{ height: '52px' }}>
              <button onClick={() => { setStep(2); persist({ step: 2 }); }}
                className="border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] flex items-center gap-1 px-3"
                style={{ height: '36px', fontSize: '13px' }}>
                <ChevronLeft size={14} /> 이전
              </button>
              {selectedSymId && (
                <span className="text-[#9ca3af]" style={{ fontSize: '12px' }}>Delete 키로 삭제</span>
              )}
              {estimateLinked && (
                <span className="text-green-700 bg-green-50 px-3 rounded-lg flex items-center gap-1"
                  style={{ fontSize: '13px', height: '36px' }}>
                  <Check size={13} /> 내역서에 추가 완료
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <button onClick={handleDxf}
                  className="flex items-center gap-1.5 border border-[#e5e7eb] rounded-lg text-[#374151] hover:bg-[#f3f4f6] px-3"
                  style={{ height: '36px', fontSize: '13px' }}>
                  <FileDown size={13} /> DXF
                </button>
                <button onClick={() => window.print()}
                  className="flex items-center gap-1.5 border border-[#e5e7eb] rounded-lg text-[#374151] hover:bg-[#f3f4f6] px-3"
                  style={{ height: '36px', fontSize: '13px' }}>
                  <Download size={13} /> PDF
                </button>
                <button onClick={handleEstimateLink}
                  className="flex items-center gap-1.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d5080] px-3"
                  style={{ height: '36px', fontSize: '13px' }}>
                  <Link2 size={13} /> 견적 연동
                </button>
              </div>
            </div>

            {/* SVG 구간 카드들 */}
            <div className="flex-1 overflow-auto p-4 bg-[#f8fafc] space-y-4">
              {sections.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[#9ca3af]" style={{ fontSize: '15px' }}>2단계에서 구간을 추가하세요</p>
                </div>
              )}
              {sections.map((sec) => {
                const isSel = sec.id === selectedSecId;
                return (
                  <div key={sec.id}
                    onClick={() => { if (!isSel) { setSelectedSecId(sec.id); setSelectedSymId(null); setActiveTool('select'); } }}
                    className={`rounded-xl overflow-hidden transition-all ${isSel ? 'ring-2 ring-[#1e3a5f] shadow-md' : 'shadow-sm cursor-pointer'}`}
                  >
                    <svg
                      viewBox={`0 0 ${W} ${SH}`}
                      width="100%"
                      style={{
                        background: 'white',
                        cursor: isSel && activeTool !== 'select' ? 'crosshair' : 'default',
                        display: 'block',
                      }}
                      onClick={isSel ? (e) => {
                        if (activeTool === 'select') return;
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const scaleX = W / rect.width;
                        const pos = Math.max(0.02, Math.min(0.98, ((e.clientX - rect.left) * scaleX - PL) / pW));
                        const sym: BpSymbol = {
                          id: `sym-${Date.now()}`, type: activeTool as SymType,
                          position: pos, num: sec.symbols.length + 1,
                        };
                        updateSec(sec.id, { symbols: [...sec.symbols, sym] });
                        setActiveTool('select');
                      } : undefined}
                    >
                      {/* 구간 레이블 빨간 박스 */}
                      <rect x={W - PR + 6} y={6} width={64} height={22} fill="#ef4444" rx={2} />
                      <text x={W - PR + 38} y={21} textAnchor="middle" fontSize={11} fill="white" fontWeight="700">{sec.label}</text>

                      {/* 연장 화살표 */}
                      <text x={(PL + W - PR) / 2} y={YA - 6} textAnchor="middle" fontSize={11} fill="#9ca3af">L={sec.length}m</text>
                      <polygon points={`${PL},${YA} ${PL+9},${YA-4} ${PL+9},${YA+4}`} fill="#9ca3af" />
                      <line x1={PL} y1={YA} x2={W - PR} y2={YA} stroke="#9ca3af" strokeWidth={1} />
                      <polygon points={`${W-PR},${YA} ${W-PR-9},${YA-4} ${W-PR-9},${YA+4}`} fill="#9ca3af" />

                      {/* 기존관 */}
                      <line x1={PL} y1={YE} x2={W-PR} y2={YE} stroke="#1e3a5f" strokeWidth={3} />
                      <text x={PL-6} y={YE+4} textAnchor="end" fontSize={10} fill="#1e3a5f">기존관</text>
                      <text x={W-PR+56} y={YE+4} textAnchor="middle" fontSize={11} fill="#1e3a5f" fontWeight="600">{sec.existingPipe}</text>

                      {/* 신설관 */}
                      <line x1={PL} y1={YN} x2={W-PR} y2={YN} stroke="#ef4444" strokeWidth={2} strokeDasharray="8,4" />
                      <text x={PL-6} y={YN+4} textAnchor="end" fontSize={10} fill="#ef4444">신설관</text>
                      <text x={W-PR+56} y={YN+4} textAnchor="middle" fontSize={11} fill="#ef4444" fontWeight="600">{sec.newPipe}</text>

                      {/* 기호들 */}
                      {sec.symbols.map((sym, si) => {
                        const cx = PL + sym.position * pW;
                        const symSel = isSel && sym.id === selectedSymId;
                        return (
                          <g key={sym.id}
                            onClick={(e) => { e.stopPropagation(); if (isSel) setSelectedSymId(symSel ? null : sym.id); }}
                            style={{ cursor: 'pointer' }}>
                            {symSel && <circle cx={cx} cy={YS} r={18} fill="#fef3c7" stroke="#f59e0b" strokeWidth={1} />}
                            <line x1={cx} y1={YE} x2={cx} y2={YN} stroke="#9ca3af" strokeWidth={1} strokeDasharray="3,2" />
                            <SymSvg type={sym.type} cx={cx} cy={YS} selected={symSel} />
                            <text x={cx} y={YNM} textAnchor="middle" fontSize={11} fill={symSel ? '#f59e0b' : '#1e3a5f'}>
                              {CIRCLED[si] ?? `${si+1}`}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
