'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Sparkles, FileDown, Printer, Link2, RotateCcw, Pencil, Loader2, Save, Check,
  LayoutTemplate, FolderOpen, Trash2,
} from 'lucide-react';
import type { EstimateItem } from '@/types';
import {
  aggregateMaterials, validateSections, materialsToEstimateItems, sketchToHint,
} from '@/types/drawing';
import type { DrawingData } from '@/types/drawing';
import DrawingCanvas from './DrawingCanvas';
import MaterialTable from './MaterialTable';
import SketchPad, { type SketchPadHandle } from './SketchPad';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const EXAMPLES = [
  'D200 노후관 250m 교체, 중간에 제수밸브 2개, 끝에 공기밸브 1개',
  '삼거리부터 다리까지 D300 신설 120m, 소화전 1개, 이토변 1개',
  'D400 노후관 교체 500m, 제수밸브 1개, 공기밸브 1개, 맨홀 2개소',
];

export interface BlueprintAIProps {
  /** 공사에 연결된 경우 projectId, 독립 사용 시 'standalone' 등 */
  projectId: string;
  /** 견적서에 자재 추가 (Phase 2 seam). 없으면 버튼 숨김 */
  onAddItems?: (items: EstimateItem[]) => void;
  /** 직접 수정(수동 에디터)로 전환 */
  onManualEdit?: (data: DrawingData) => void;
}

export default function BlueprintAI({ projectId, onAddItems, onManualEdit }: BlueprintAIProps) {
  const [description, setDescription] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [drawing, setDrawing] = useState<DrawingData | null>(null);
  const [aiMessage, setAiMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refine, setRefine] = useState('');
  const [saved, setSaved] = useState(false);
  const [linked, setLinked] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; name: string; description?: string; category?: string; drawing_data: DrawingData }[]>([]);
  const [savedList, setSavedList] = useState<{ id: string; name: string; drawing_data: DrawingData; updated_at?: string }[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const sketchRef = useRef<SketchPadHandle>(null);

  // 임시 복원
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`bp_ai_${projectId}`);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.messages) setMessages(d.messages);
      if (d.drawing) setDrawing(d.drawing);
      if (d.aiMessage) setAiMessage(d.aiMessage);
    } catch {}
  }, [projectId]);

  function persist(patch: Partial<{ messages: ChatMessage[]; drawing: DrawingData | null; aiMessage: string }>) {
    sessionStorage.setItem(`bp_ai_${projectId}`, JSON.stringify({ messages, drawing, aiMessage, ...patch }));
  }

  // 도면 데이터에 결정론적 검증 경고를 병합
  function withValidation(d: DrawingData): DrawingData {
    const extra = validateSections(d.sections);
    const all = [...new Set([...(d.warnings ?? []), ...extra])];
    return { ...d, warnings: all, totalMaterials: aggregateMaterials(d.sections) };
  }

  async function openLibrary() {
    setShowLibrary(true);
    try {
      const [t, s] = await Promise.all([
        fetch('/api/blueprint/templates').then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/blueprint/drawings${projectId !== 'standalone' ? `?project_id=${projectId}` : ''}`)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
      ]);
      setTemplates(Array.isArray(t) ? t : []);
      setSavedList(Array.isArray(s) ? s : []);
    } catch {
      setTemplates([]);
      setSavedList([]);
    }
  }

  function applyDrawing(d: DrawingData) {
    const dd = withValidation(d);
    setDrawing(dd);
    setMessages([]);
    setAiMessage('');
    setShowLibrary(false);
    persist({ drawing: dd, messages: [], aiMessage: '' });
  }

  async function deleteSaved(id: string) {
    try {
      await fetch(`/api/blueprint/drawings?id=${id}`, { method: 'DELETE' });
      setSavedList((prev) => prev.filter((x) => x.id !== id));
    } catch {}
  }

  async function callAI(history: ChatMessage[]) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/blueprint/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error('AI 응답 오류');
      const data = await res.json();
      const next: ChatMessage[] = [...history, { role: 'assistant', content: data.message ?? '' }];
      setMessages(next);
      setAiMessage(data.message ?? '');
      let dd: DrawingData | null = null;
      if (data.drawingData && Array.isArray(data.drawingData.sections)) {
        dd = withValidation(data.drawingData as DrawingData);
        setDrawing(dd);
      }
      persist({ messages: next, drawing: dd ?? drawing, aiMessage: data.message ?? '' });
    } catch (e) {
      setError('AI 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!description.trim() && sketchRef.current?.isEmpty()) {
      setError('노선을 그리거나 내용을 입력해주세요.');
      return;
    }
    const hint = sketchRef.current ? sketchToHint(sketchRef.current.getData()) : '';
    const content = [hint, description.trim()].filter(Boolean).join('\n');
    const history: ChatMessage[] = [{ role: 'user', content }];
    setMessages(history);
    await callAI(history);
  }

  async function handleRefine() {
    if (!refine.trim()) return;
    const history: ChatMessage[] = [...messages, { role: 'user', content: refine.trim() }];
    setRefine('');
    await callAI(history);
  }

  function handleReset() {
    setDescription('');
    setMessages([]);
    setDrawing(null);
    setAiMessage('');
    setError('');
    sketchRef.current?.clear();
    sessionStorage.removeItem(`bp_ai_${projectId}`);
  }

  async function handleDxf() {
    if (!drawing) return;
    try {
      const res = await fetch('/api/blueprint/export-dxf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drawingData: drawing }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${drawing.projectName || '계통도'}.dxf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('DXF 생성에 실패했습니다.');
    }
  }

  async function handleSave() {
    if (!drawing) return;
    try {
      const sketch = sketchRef.current?.getData();
      const res = await fetch('/api/blueprint/drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId === 'standalone' ? null : projectId,
          name: drawing.projectName || '제목 없는 도면',
          drawing_data: drawing,
          sketch_data: sketch ?? null,
        }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('저장에 실패했습니다. (DB 연결을 확인하세요)');
    }
  }

  function handleEstimate() {
    if (!drawing || !onAddItems) return;
    onAddItems(materialsToEstimateItems(aggregateMaterials(drawing.sections), projectId));
    setLinked(true);
    setTimeout(() => setLinked(false), 3000);
  }

  const bigBtn = 'flex items-center justify-center gap-2 h-12 px-5 rounded-xl text-[15px] font-semibold transition-colors';

  return (
    <div className="max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-6">
      {/* ── 입력 영역 ── */}
      {!drawing && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[20px] font-bold text-[#111827]">도면 자동 만들기</h2>
              <p className="text-[14px] text-[#6b7280] mt-1">
                노선을 대충 그리고, 공사 내용을 글로 적으면 계통도와 물량집계표를 자동으로 만들어 드립니다.
              </p>
            </div>
            <button
              type="button"
              onClick={openLibrary}
              className="flex items-center gap-1.5 px-3 h-10 rounded-lg border border-[#e5e7eb] text-[14px] text-[#374151] hover:bg-[#f3f4f6] whitespace-nowrap"
            >
              <FolderOpen size={16} /> 템플릿·저장함
            </button>
          </div>

          {/* 템플릿 / 저장된 도면 라이브러리 */}
          {showLibrary && (
            <div className="rounded-xl border border-[#e5e7eb] p-4 space-y-4 bg-[#f8fafc]">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-semibold text-[#111827] flex items-center gap-1.5">
                  <LayoutTemplate size={16} /> 표준 템플릿
                </p>
                <button type="button" onClick={() => setShowLibrary(false)} className="text-[13px] text-[#6b7280] hover:text-[#374151]">닫기</button>
              </div>
              <div className="grid sm:grid-cols-3 gap-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyDrawing(t.drawing_data)}
                    className="text-left rounded-lg border border-[#e5e7eb] bg-white p-3 hover:border-[#1e3a5f]"
                  >
                    <p className="text-[14px] font-medium text-[#111827]">{t.name}</p>
                    {t.description && <p className="text-[12px] text-[#6b7280] mt-1">{t.description}</p>}
                  </button>
                ))}
                {templates.length === 0 && <p className="text-[13px] text-[#9ca3af]">템플릿을 불러오는 중…</p>}
              </div>

              {savedList.length > 0 && (
                <>
                  <p className="text-[14px] font-semibold text-[#111827] pt-2">저장된 도면</p>
                  <div className="space-y-2">
                    {savedList.map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded-lg border border-[#e5e7eb] bg-white p-3">
                        <button type="button" onClick={() => applyDrawing(s.drawing_data)} className="text-left flex-1">
                          <p className="text-[14px] font-medium text-[#111827]">{s.name}</p>
                          {s.updated_at && <p className="text-[12px] text-[#6b7280]">{new Date(s.updated_at).toLocaleString('ko-KR')}</p>}
                        </button>
                        <button type="button" onClick={() => deleteSaved(s.id)} className="text-[#9ca3af] hover:text-red-500 p-2">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <SketchPad ref={sketchRef} />

          <div>
            <label className="block text-[14px] font-medium text-[#374151] mb-2">공사 내용 설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="예) 다름고개 삼거리부터 신성교까지 D200 노후관 250m 교체, 중간에 제수밸브 2개, 끝에 공기밸브 1개"
              className="w-full rounded-xl border border-[#e5e7eb] px-4 py-3 text-[15px] text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a5f]"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setDescription(ex)}
                  className="text-[13px] px-3 py-1.5 rounded-full border border-[#e5e7eb] text-[#6b7280] hover:bg-[#f3f4f6]"
                >
                  {ex.length > 28 ? ex.slice(0, 28) + '…' : ex}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[14px] text-red-600">{error}</p>}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className={`${bigBtn} w-full bg-[#1e3a5f] text-white hover:bg-[#16304d] disabled:opacity-60`}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {loading ? 'AI가 도면을 그리는 중…' : '도면 자동 생성'}
          </button>

          {/* AI가 추가 질문을 한 경우 (도면 없이 메시지만) */}
          {!loading && aiMessage && !drawing && (
            <div className="bg-[#f8fafc] border border-[#e5e7eb] rounded-xl p-4 text-[14px] text-[#374151] whitespace-pre-wrap">
              {aiMessage}
            </div>
          )}
        </div>
      )}

      {/* ── 결과 영역 ── */}
      {drawing && (
        <div className="space-y-5">
          {aiMessage && (
            <div className="bg-[#f8fafc] border border-[#e5e7eb] rounded-xl p-4 text-[14px] text-[#374151] whitespace-pre-wrap">
              {aiMessage}
            </div>
          )}

          <div className="rounded-xl border border-[#e5e7eb] p-4 bg-white print-area">
            <DrawingCanvas data={drawing} />
            <div className="mt-6">
              <MaterialTable materials={drawing.totalMaterials} />
            </div>
          </div>

          {error && <p className="text-[14px] text-red-600">{error}</p>}

          {/* 액션 버튼 */}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleSave} className={`${bigBtn} bg-[#1e3a5f] text-white hover:bg-[#16304d]`}>
              {saved ? <Check size={18} /> : <Save size={18} />}{saved ? '저장됨' : '저장'}
            </button>
            <button type="button" onClick={handleDxf} className={`${bigBtn} border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]`}>
              <FileDown size={18} /> DXF 다운로드
            </button>
            <button type="button" onClick={() => window.print()} className={`${bigBtn} border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]`}>
              <Printer size={18} /> 인쇄 (PDF)
            </button>
            {onAddItems && (
              <button type="button" onClick={handleEstimate} className={`${bigBtn} border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]`}>
                {linked ? <Check size={18} /> : <Link2 size={18} />}{linked ? '추가됨' : '견적서에 넣기'}
              </button>
            )}
            {onManualEdit && (
              <button type="button" onClick={() => onManualEdit(drawing)} className={`${bigBtn} text-[#6b7280] hover:bg-[#f3f4f6]`}>
                <Pencil size={18} /> 직접 수정
              </button>
            )}
          </div>

          {/* 다시 설명하기 (대화형 교정) */}
          <div className="rounded-xl border border-[#e5e7eb] p-4 space-y-3 no-print">
            <p className="text-[14px] font-medium text-[#374151]">고치고 싶은 부분을 말로 적어주세요</p>
            <div className="flex gap-2">
              <input
                value={refine}
                onChange={(e) => setRefine(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRefine(); }}
                placeholder="예) 제수밸브를 3개로 바꿔줘"
                className="flex-1 rounded-lg border border-[#e5e7eb] px-4 h-11 text-[15px] text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a5f]"
              />
              <button
                type="button"
                onClick={handleRefine}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 h-11 rounded-lg bg-[#1e3a5f] text-white text-[14px] font-medium disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} 적용
              </button>
            </div>
            <button type="button" onClick={handleReset} className="flex items-center gap-1.5 text-[13px] text-[#6b7280] hover:text-[#374151]">
              <RotateCcw size={14} /> 처음부터 다시 만들기
            </button>
          </div>
        </div>
      )}

      {/* 인쇄용 스타일 */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
