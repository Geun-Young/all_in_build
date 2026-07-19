'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronRight, ChevronLeft, Upload, Check, Zap, FileDown,
  Link2, Download, Trash2, MapPin, Pencil, Grid3x3, Map as MapIcon, Ruler,
  Search, Plus, Minus, ArrowLeft,
} from 'lucide-react';
import type { EstimateItem, ProjectType } from '@/types';
import type { BpDoc, BpNode, BpSection, BpSymbol, Pt, SymType, PipeMaterial, BgKind } from '@/lib/blueprintTypes';
import { emptyDoc, PIPE_SIZES, aggregateMaterials, normalizeDoc } from '@/lib/blueprintTypes';
import { SYMBOLS, SYM_ORDER, PIPE_MATERIALS, symbolAvailable } from '@/lib/pipeSymbols';
import { pathLength, pointAt, nearestT, lengthBetween } from '@/lib/geometry';
import { suggestDepth } from '@/lib/depthSuggest';
import DrawingCanvas from './DrawingCanvas';

export interface BlueprintEditorProps {
  projectId: string;
  projectType?: ProjectType;
  onAddItems: (items: EstimateItem[]) => void;
}

const STEPS = ['① 배경 선택', '② 경로 그리기', '③ 구간 설계', '④ 결과'];
const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const GRID_BG = `repeating-linear-gradient(0deg,transparent,transparent 39px,#e5e7eb 39px,#e5e7eb 40px),
  repeating-linear-gradient(90deg,transparent,transparent 39px,#e5e7eb 39px,#e5e7eb 40px),#f8fafc`;

// 중심 (lat,lng,zoom) 의 OSM 타일 인덱스
function mapTileIndex(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const xtile = Math.floor(((lng + 180) / 360) * n);
  const ytile = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
  );
  return { xtile, ytile };
}

// ── 지도 배경 (무의존 OSM 타일) ───────────────────────
function MapBg({ map, opacity }: { map: NonNullable<BpDoc['background']['map']>; opacity: number }) {
  const { xtile, ytile } = mapTileIndex(map.lat, map.lng, map.zoom);
  const tiles = [];
  for (let dx = -2; dx <= 2; dx++) for (let dy = -1; dy <= 1; dy++) {
    tiles.push(
      // eslint-disable-next-line @next/next/no-img-element
      <img key={`${dx}_${dy}`} alt=""
        src={`https://tile.openstreetmap.org/${map.zoom}/${xtile + dx}/${ytile + dy}.png`}
        style={{ position: 'absolute', width: 256, height: 256,
          left: `calc(50% + ${dx * 256 - 128}px)`, top: `calc(50% + ${dy * 256 - 128}px)` }}
        draggable={false} />
    );
  }
  return <div className="absolute inset-0 overflow-hidden" style={{ opacity }}>{tiles}</div>;
}

// ── 캔버스 배경 ───────────────────────────────────────
function CanvasBg({ background }: { background: BpDoc['background'] }) {
  if (background.kind === 'image' && background.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={background.image} alt="" className="absolute inset-0 w-full h-full object-contain"
      style={{ opacity: background.opacity }} draggable={false} />;
  }
  if (background.kind === 'map' && background.map) return <MapBg map={background.map} opacity={background.opacity} />;
  return null;
}

// ── 개요 오버레이: 메인 경로 + 격점 (기호 없음) ────────
function OverviewOverlay({ doc, drawing, cursor, showNodes }: {
  doc: BpDoc; drawing: boolean; cursor: Pt | null; showNodes: boolean;
}) {
  const verts = doc.route.vertices;
  return (
    <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
      {verts.length > 0 && (
        <polyline points={verts.map((p) => `${p.x}%,${p.y}%`).join(' ')}
          fill="none" stroke="#ef4444" strokeWidth={2.5} strokeDasharray="8,4" />
      )}
      {drawing && cursor && verts.length > 0 && (
        <line x1={`${verts[verts.length - 1].x}%`} y1={`${verts[verts.length - 1].y}%`}
          x2={`${cursor.x}%`} y2={`${cursor.y}%`} stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4,4" />
      )}
      {verts.map((p, i) => (
        <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r={3} fill="#ef4444" />
      ))}
      {showNodes && doc.nodes.map((n, i) => {
        const p = pointAt(verts, n.t);
        return (
          <g key={n.id}>
            <circle cx={`${p.x}%`} cy={`${p.y}%`} r={8} fill="#1e3a5f" stroke="white" strokeWidth={2} />
            <text x={`${p.x}%`} y={`${p.y}%`} dy={3} textAnchor="middle" fontSize={9} fill="white" fontWeight="700">{i + 1}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── 상세 오버레이: 구간 내부 detailRoute + 기호 ────────
function DetailOverlay({ section, drawing, cursor, selSymId, onSelectSym }: {
  section: BpSection; drawing: boolean; cursor: Pt | null;
  selSymId: string | null; onSelectSym: (id: string) => void;
}) {
  const verts = section.detailRoute.vertices;
  return (
    <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
      {verts.length > 0 && (
        <polyline points={verts.map((p) => `${p.x}%,${p.y}%`).join(' ')}
          fill="none" stroke="#1e3a5f" strokeWidth={2.5} strokeLinejoin="round" />
      )}
      {drawing && cursor && verts.length > 0 && (
        <line x1={`${verts[verts.length - 1].x}%`} y1={`${verts[verts.length - 1].y}%`}
          x2={`${cursor.x}%`} y2={`${cursor.y}%`} stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4,4" />
      )}
      {verts.map((p, i) => (
        <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r={3} fill="#1e3a5f" />
      ))}
      {section.symbols.map((sym) => {
        const p = pointAt(verts, sym.t);
        return (
          <svg key={sym.id} x={`${p.x}%`} y={`${p.y}%`} overflow="visible"
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); onSelectSym(sym.id); }}>
            {SYMBOLS[sym.type].render(0, 0, sym.id === selSymId)}
          </svg>
        );
      })}
    </svg>
  );
}

export default function BlueprintEditor({ projectId, projectType, onAddItems }: BlueprintEditorProps) {
  const [doc, setDoc] = useState<BpDoc>(() => {
    if (typeof window === 'undefined') return emptyDoc();
    try {
      const raw = sessionStorage.getItem(`bp_editor2_${projectId}`);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.route && Array.isArray(d.route.vertices)) return normalizeDoc(d);
      }
    } catch { /* 구버전/손상 데이터 무시 */ }
    return emptyDoc();
  });
  const [drawing, setDrawing] = useState(false);          // 경로/상세경로 그리는 중
  const [cursor, setCursor] = useState<Pt | null>(null);  // 러버밴드 미리보기
  const [placingNode, setPlacingNode] = useState(false);
  const [activeSym, setActiveSym] = useState<SymType | null>(null);
  const [editingSecId, setEditingSecId] = useState<string | null>(null); // null=개요, 값=상세뷰
  const [selSymId, setSelSymId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const [linked, setLinked] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<{ display: string; lat: number; lng: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const mapPanRef = useRef<{ sx: number; sy: number; lat: number; lng: number } | null>(null);

  const step = doc.step;
  const verts = doc.route.vertices;
  const editingSec = doc.sections.find((s) => s.id === editingSecId) ?? null;

  const update = useCallback((patch: Partial<BpDoc> | ((d: BpDoc) => BpDoc)) => {
    setDoc((prev) => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      try { sessionStorage.setItem(`bp_editor2_${projectId}`, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [projectId]);

  const setStep = (n: number) => { update({ step: n }); setEditingSecId(null); setDrawing(false); setActiveSym(null); setPlacingNode(false); };

  // ── 좌표 변환 (이벤트 → 비율 0~100) ──────────────────
  function evToPt(e: React.MouseEvent, el: HTMLElement): Pt {
    const r = el.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  }

  // ── 1단계: 배경 ──────────────────────────────────────
  function handleFile(file: File) {
    const r = new FileReader();
    r.onload = (e) => update((d) => ({ ...d, background: { ...d.background, kind: 'image', image: e.target?.result as string } }));
    r.readAsDataURL(file);
  }
  function setBgKind(kind: BgKind) {
    update((d) => ({
      ...d,
      background: {
        ...d.background, kind,
        map: kind === 'map' ? (d.background.map ?? { lat: 36.35, lng: 127.38, zoom: 15 }) : d.background.map,
      },
    }));
  }

  // 지도 검색 (Nominatim)
  async function handleSearch() {
    const q = searchQ.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=ko&q=${encodeURIComponent(q)}`,
        { headers: { 'Accept': 'application/json' } }
      );
      const data = await res.json();
      setSearchResults((data as Array<{ display_name: string; lat: string; lon: string }>).map((r) => ({
        display: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon),
      })));
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }
  function gotoResult(r: { lat: number; lng: number }) {
    update((d) => ({ ...d, background: { ...d.background, map: { lat: r.lat, lng: r.lng, zoom: d.background.map?.zoom ?? 16 } } }));
    setSearchResults([]);
  }
  function zoomMap(delta: number) {
    update((d) => {
      const m = d.background.map; if (!m) return d;
      return { ...d, background: { ...d.background, map: { ...m, zoom: Math.max(10, Math.min(19, m.zoom + delta)) } } };
    });
  }

  // 지도 드래그 (step1에서만) — 타일 1px당 경위도로 정확 환산
  function onMapDown(e: React.MouseEvent) {
    if (step !== 1 || doc.background.kind !== 'map') return;
    const m = doc.background.map!;
    mapPanRef.current = { sx: e.clientX, sy: e.clientY, lat: m.lat, lng: m.lng };
  }
  function onMapMove(e: React.MouseEvent) {
    const p = mapPanRef.current;
    if (!p || step !== 1) return;
    const m = doc.background.map!;
    const degPerPx = 360 / (256 * 2 ** m.zoom);        // 경도 1px
    const latRad = (m.lat * Math.PI) / 180;
    update((d) => ({ ...d, background: { ...d.background, map: { ...m,
      lng: p.lng - (e.clientX - p.sx) * degPerPx,
      lat: p.lat + (e.clientY - p.sy) * degPerPx * Math.cos(latRad) } } }));
  }
  function onMapUp() { mapPanRef.current = null; }

  // ── 2단계: 메인 경로 그리기 ──────────────────────────
  function finishRoute() {
    setDrawing(false); setCursor(null);
    if (verts.length >= 2) buildNodesFromEnds();
  }
  function undoVertex() {
    update((d) => ({ ...d, route: { vertices: d.route.vertices.slice(0, -1) } }));
  }
  function clearRoute() {
    update((d) => ({ ...d, route: { vertices: [] }, nodes: [], sections: [] }));
  }
  function buildNodesFromEnds() {
    update((d) => {
      const start: BpNode = { id: uid('node'), t: 0, label: 'No.1' };
      const end: BpNode = { id: uid('node'), t: 1, label: 'No.2' };
      const existing = d.nodes.filter((n) => n.t > 0.0001 && n.t < 0.9999);
      const nodes = relabel([start, ...existing, end]);
      return { ...d, nodes, sections: rebuildSections(d, nodes) };
    });
  }

  // ── 3단계: 격점/구간 ─────────────────────────────────
  function placeNode(p: Pt) {
    if (verts.length < 2) return;
    const t = nearestT(verts, p);
    update((d) => {
      if (d.nodes.some((n) => Math.abs(n.t - t) < 0.01)) return d;
      const nodes = relabel([...d.nodes, { id: uid('node'), t, label: '' }].sort((a, b) => a.t - b.t));
      return { ...d, nodes, sections: rebuildSections(d, nodes) };
    });
    setPlacingNode(false);
  }
  function deleteNode(id: string) {
    update((d) => {
      const node = d.nodes.find((n) => n.id === id);
      if (!node || node.t <= 0.0001 || node.t >= 0.9999) return d;
      const nodes = relabel(d.nodes.filter((n) => n.id !== id));
      return { ...d, nodes, sections: rebuildSections(d, nodes) };
    });
  }
  function relabel(nodes: BpNode[]): BpNode[] {
    return [...nodes].sort((a, b) => a.t - b.t).map((n, i) => ({ ...n, label: `No.${i + 1}` }));
  }

  // 격점 사이마다 구간 생성. 기존 구간의 속성·detailRoute·기호는 t범위로 계승.
  function rebuildSections(d: BpDoc, nodes: BpNode[]): BpSection[] {
    const sorted = [...nodes].sort((a, b) => a.t - b.t);
    const out: BpSection[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i], b = sorted[i + 1];
      const prev = d.sections.find((s) => Math.abs(s.t0 - a.t) < 0.02 && Math.abs(s.t1 - b.t) < 0.02);
      const lenM = Math.round(lengthBetween(d.route.vertices, a.t, b.t) * d.scale);
      out.push({
        id: prev?.id ?? uid('sec'),
        label: `No.${i + 1}`,
        fromNodeId: a.id, toNodeId: b.id,
        t0: a.t, t1: b.t,
        material: prev?.material ?? 'DCIP',
        existingPipe: prev?.existingPipe ?? 'D350',
        newPipe: prev?.newPipe ?? 'D400',
        length: prev?.length ?? (lenM > 0 ? lenM : 50),
        depthStart: prev?.depthStart ?? 1.2,
        depthEnd: prev?.depthEnd ?? 1.2,
        detailRoute: prev?.detailRoute ?? { vertices: [] },
        symbols: prev?.symbols ?? [],
      });
    }
    return out;
  }

  function updateSec(id: string, patch: Partial<BpSection>) {
    update((d) => ({ ...d, sections: d.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  }

  // ── 구간 상세뷰: detailRoute 그리기 ──────────────────
  function detailUndoVertex() {
    if (!editingSec) return;
    updateSec(editingSec.id, { detailRoute: { vertices: editingSec.detailRoute.vertices.slice(0, -1) } });
  }
  function detailClearRoute() {
    if (!editingSec) return;
    updateSec(editingSec.id, { detailRoute: { vertices: [] }, symbols: [] });
  }

  // 자재(기호) 배치 — 상세경로 위 클릭
  function placeSymbol(p: Pt) {
    if (!activeSym || !editingSec) return;
    const dv = editingSec.detailRoute.vertices;
    const t = dv.length >= 2 ? nearestT(dv, p) : 0.5;
    const sym: BpSymbol = { id: uid('sym'), type: activeSym, spec: editingSec.newPipe, t };
    updateSec(editingSec.id, { symbols: [...editingSec.symbols, sym] });
    setActiveSym(null);
  }
  function deleteSym(secId: string, symId: string) {
    update((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === secId ? { ...s, symbols: s.symbols.filter((x) => x.id !== symId) } : s)),
    }));
    setSelSymId(null);
  }

  function autoDepth(sec: BpSection) {
    const dpt = suggestDepth(sec.newPipe, projectType);
    updateSec(sec.id, { depthStart: dpt, depthEnd: dpt });
  }

  function enterDetail(secId: string) {
    setEditingSecId(secId);
    setSelSymId(null); setActiveSym(null); setPlacingNode(false); setDrawing(false); setCursor(null);
  }
  function exitDetail() {
    setEditingSecId(null); setSelSymId(null); setActiveSym(null); setDrawing(false); setCursor(null);
  }

  // ── 캔버스 클릭 라우팅 ───────────────────────────────
  function onCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    const p = evToPt(e, e.currentTarget);
    if (step === 2 && drawing) {
      if (mapPanRef.current) return;
      update((d) => ({ ...d, route: { vertices: [...d.route.vertices, p] } }));
      return;
    }
    if (step === 3 && !editingSec && placingNode) { placeNode(p); return; }
    if (step === 3 && editingSec) {
      if (drawing) { updateSec(editingSec.id, { detailRoute: { vertices: [...editingSec.detailRoute.vertices, p] } }); return; }
      if (activeSym) { placeSymbol(p); return; }
    }
  }

  // 키보드
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (drawing) {
        if (e.key === 'Enter' || e.key === 'Escape') { setDrawing(false); setCursor(null); if (step === 2) finishRoute(); }
        else if (e.key === 'Backspace') { e.preventDefault(); if (step === 2) undoVertex(); else if (editingSec) detailUndoVertex(); }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selSymId && editingSec) {
        deleteSym(editingSec.id, selSymId);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ── 견적/DXF ─────────────────────────────────────────
  function getMaterials() {
    return aggregateMaterials(doc.sections, (t) => SYMBOLS[t].name, (t) => SYMBOLS[t].unit);
  }
  function handleEstimateLink() {
    const mats = getMaterials();
    onAddItems(mats.map((m, i) => ({
      id: uid('bp'), estimate_id: projectId, category: '배관공',
      work_name: `${m.name} ${m.spec}`.trim(), spec: m.spec, unit: m.unit, quantity: m.qty,
      unit_price: 0, labor_amount: 0, material_amount: 0, expense_amount: 0, total_amount: 0,
      is_night: false, sort_order: i,
    })));
    setLinked(true);
    setTimeout(() => setLinked(false), 4000);
  }
  async function handleDxf() {
    try {
      const res = await fetch('/api/blueprint/export-dxf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc, projectName: `${projectId}_계통도` }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = '계통도.dxf'; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('DXF 생성 실패'); }
  }

  async function handleAi() {
    if (!editingSec) return;
    const sec = editingSec;
    setAiLoading(true); setAiMsg('');
    try {
      const names = SYM_ORDER.filter((t) => symbolAvailable(t, sec.material)).map((t) => `${t}=${SYMBOLS[t].name}`).join(', ');
      const prompt = `구간 ${sec.label}: 관종 ${sec.material}, 기존관 ${sec.existingPipe}, 신설관 ${sec.newPipe}, 연장 ${sec.length}m, 심도 ${sec.depthStart}m. 설계기준에 맞는 자재(기호) 배치를 추천. 사용 가능 type: ${names}. position은 0~1(상세경로 내 위치). 응답 {"symbols":[{"type":"gate_valve","position":0.1}]}`;
      const res = await fetch('/api/blueprint/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await res.json();
      const raw = data.message ?? '';
      const m = raw.match(/\{[\s\S]*"symbols"[\s\S]*\}/);
      let syms: Array<{ type: string; position: number }> = [];
      if (m) { try { syms = JSON.parse(m[0]).symbols ?? []; } catch {} }
      const valid = syms.filter((s) => (SYM_ORDER as string[]).includes(s.type));
      if (valid.length > 0) {
        const newSyms: BpSymbol[] = valid.map((s) => ({
          id: uid('sym-ai'), type: s.type as SymType, spec: sec.newPipe,
          t: Math.max(0.02, Math.min(0.98, s.position)),
        }));
        updateSec(sec.id, { symbols: [...sec.symbols, ...newSyms] });
        setAiMsg(`AI가 ${newSyms.length}개 자재를 배치했습니다.`);
      } else setAiMsg(raw.slice(0, 100) || 'AI 추천을 받지 못했습니다.');
    } catch { setAiMsg('AI 연결 오류가 발생했습니다.'); }
    finally { setAiLoading(false); }
  }

  const canvasBg = <CanvasBg background={doc.background} />;
  const crosshair = (step === 2 && drawing) ||
    (step === 3 && !editingSec && placingNode) ||
    (step === 3 && editingSec && (drawing || activeSym));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 스텝 바 */}
      <div className="bg-white border-b border-[#e5e7eb] flex items-center px-4 gap-2 flex-shrink-0" style={{ height: '52px' }}>
        {STEPS.map((label, i) => {
          const n = i + 1; const done = step > n; const active = step === n;
          return (
            <button key={n} onClick={() => n < step && setStep(n)}
              className={`flex items-center gap-1.5 px-3 rounded-lg transition-colors ${
                done ? 'bg-[#1e3a5f] text-white cursor-pointer'
                : active ? 'border-2 border-[#1e3a5f] text-[#1e3a5f] font-medium cursor-default'
                : 'text-[#9ca3af] cursor-default'}`}
              style={{ height: '36px', fontSize: '13px' }}>
              {done && <Check size={12} />}{label}
            </button>
          );
        })}
      </div>

      {/* ── 1단계: 배경 선택 ───────────────────────────── */}
      {step === 1 && (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex flex-col border-r border-[#e5e7eb] p-5 gap-4 overflow-y-auto flex-shrink-0" style={{ width: '320px' }}>
            <div>
              <h2 className="font-semibold text-[#111827]" style={{ fontSize: '17px' }}>설계 배경 선택</h2>
              <p className="text-[#6b7280] mt-1" style={{ fontSize: '13px', lineHeight: '1.6' }}>경로를 그릴 바탕을 고르세요.</p>
            </div>
            {([
              { k: 'image' as BgKind, icon: <Upload size={15} />, label: '평면도 이미지' },
              { k: 'grid' as BgKind, icon: <Grid3x3 size={15} />, label: '빈 격자' },
              { k: 'map' as BgKind, icon: <MapIcon size={15} />, label: '지도' },
            ]).map(({ k, icon, label }) => (
              <button key={k} onClick={() => setBgKind(k)}
                className={`w-full flex items-center gap-2 px-3 rounded-lg transition-colors ${
                  doc.background.kind === k ? 'bg-[#1e3a5f] text-white' : 'border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]'}`}
                style={{ height: '44px', fontSize: '14px' }}>
                {icon} {label}
              </button>
            ))}

            {doc.background.kind === 'image' && (
              <div onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                className="border-2 border-dashed border-[#d1d5db] rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#1e3a5f]"
                style={{ minHeight: '120px' }}>
                {doc.background.image
                  ? <span className="text-green-700 flex items-center gap-2" style={{ fontSize: '13px' }}><Check size={16} /> 업로드 완료 — 다시 클릭하면 교체</span>
                  : <><Upload size={24} className="text-[#9ca3af]" /><p className="text-[#6b7280]" style={{ fontSize: '13px' }}>클릭/드래그 · PNG·JPG</p></>}
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            {doc.background.kind === 'map' && (
              <div className="space-y-2">
                <label className="text-[#6b7280] block" style={{ fontSize: '12px' }}>주소·지명 검색</label>
                <div className="flex gap-1.5">
                  <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                    placeholder="예: 대전 신성동"
                    className="flex-1 border border-[#e5e7eb] rounded px-2 focus:outline-none focus:border-[#1e3a5f]" style={{ height: '34px', fontSize: '13px' }} />
                  <button onClick={handleSearch} disabled={searching}
                    className="bg-[#1e3a5f] text-white rounded px-3 hover:bg-[#2d5080] disabled:opacity-50 flex items-center" style={{ height: '34px' }}>
                    <Search size={15} />
                  </button>
                </div>
                {searching && <p className="text-[#9ca3af]" style={{ fontSize: '11px' }}>검색 중...</p>}
                {searchResults.length > 0 && (
                  <div className="border border-[#e5e7eb] rounded-lg divide-y divide-[#f3f4f6] max-h-48 overflow-y-auto">
                    {searchResults.map((r, i) => (
                      <button key={i} onClick={() => gotoResult(r)}
                        className="w-full text-left px-2 py-1.5 hover:bg-[#f3f4f6] text-[#374151]" style={{ fontSize: '11px', lineHeight: '1.4' }}>
                        {r.display}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[#9ca3af]" style={{ fontSize: '11px' }}>지도를 드래그하고 +/− 로 확대를 맞추세요. 다음 단계부터 지도는 고정됩니다.</p>
              </div>
            )}

            {(doc.background.kind === 'image' || doc.background.kind === 'map') && (
              <div>
                <label className="text-[#6b7280] block mb-1" style={{ fontSize: '12px' }}>배경 불투명도</label>
                <input type="range" min={0.1} max={1} step={0.1} value={doc.background.opacity}
                  onChange={(e) => update((d) => ({ ...d, background: { ...d.background, opacity: parseFloat(e.target.value) } }))}
                  className="w-full" />
              </div>
            )}

            <div>
              <label className="text-[#6b7280] flex items-center gap-1 mb-1" style={{ fontSize: '12px' }}><Ruler size={12} /> 축척 (비율 1.0당 m)</label>
              <input type="number" min={1} value={doc.scale}
                onChange={(e) => update({ scale: parseFloat(e.target.value) || 1 })}
                className="w-full border border-[#e5e7eb] rounded px-2" style={{ height: '32px', fontSize: '13px' }} />
            </div>

            <button onClick={() => setStep(2)}
              className="w-full bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d5080] flex items-center justify-center gap-2 mt-auto"
              style={{ height: '48px', fontSize: '15px' }}>
              경로 그리기 <ChevronRight size={16} />
            </button>
          </div>
          <div
            onMouseDown={onMapDown} onMouseMove={onMapMove} onMouseUp={onMapUp} onMouseLeave={onMapUp}
            className={`flex-1 relative overflow-hidden bg-[#f8fafc] ${doc.background.kind === 'map' ? 'cursor-move' : ''}`}
            style={{ background: doc.background.kind === 'grid' ? GRID_BG : undefined }}>
            {canvasBg}
            {doc.background.kind === 'map' && (
              <div className="absolute top-3 right-3 flex flex-col gap-1">
                <button onClick={() => zoomMap(1)} className="w-8 h-8 bg-white border border-[#e5e7eb] rounded shadow-sm flex items-center justify-center hover:bg-[#f3f4f6]"><Plus size={16} /></button>
                <button onClick={() => zoomMap(-1)} className="w-8 h-8 bg-white border border-[#e5e7eb] rounded shadow-sm flex items-center justify-center hover:bg-[#f3f4f6]"><Minus size={16} /></button>
                <span className="text-center text-[#6b7280] bg-white border border-[#e5e7eb] rounded shadow-sm" style={{ fontSize: '10px', lineHeight: '20px' }}>z{doc.background.map?.zoom}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 2단계: 메인 경로 그리기 ───────────────────── */}
      {step === 2 && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b border-[#e5e7eb] px-4 flex items-center gap-2 flex-shrink-0" style={{ height: '52px' }}>
            <button onClick={() => setStep(1)} className="border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] flex items-center gap-1 px-3" style={{ height: '36px', fontSize: '13px' }}>
              <ChevronLeft size={14} /> 이전
            </button>
            <button onClick={() => { setDrawing(!drawing); setCursor(null); }}
              className={`flex items-center gap-1.5 px-3 rounded-lg ${drawing ? 'bg-[#1e3a5f] text-white' : 'border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]'}`}
              style={{ height: '36px', fontSize: '13px' }}>
              <Pencil size={14} /> {drawing ? '그리는 중 (더블클릭/Enter 완료)' : '경로 그리기 시작'}
            </button>
            {drawing && <button onClick={undoVertex} className="border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] px-3" style={{ height: '36px', fontSize: '13px' }}>마지막 점 취소</button>}
            {drawing && <button onClick={finishRoute} className="bg-green-600 text-white rounded-lg hover:bg-green-700 px-3" style={{ height: '36px', fontSize: '13px' }}>완료</button>}
            {!drawing && verts.length > 0 && <button onClick={clearRoute} className="border border-[#e5e7eb] rounded-lg text-red-500 hover:bg-red-50 flex items-center gap-1 px-3" style={{ height: '36px', fontSize: '13px' }}><Trash2 size={13} /> 경로 삭제</button>}
            <span className="text-[#9ca3af]" style={{ fontSize: '12px' }}>꼭짓점 {verts.length}개 · 총 {Math.round(pathLength(verts) * doc.scale)}m</span>
            <div className="ml-auto">
              <button onClick={() => setStep(3)} disabled={verts.length < 2}
                className="bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d5080] disabled:opacity-40 flex items-center gap-1 px-4" style={{ height: '36px', fontSize: '13px' }}>
                구간 설계 <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <div
            onClick={onCanvasClick}
            onDoubleClick={() => { if (drawing) finishRoute(); }}
            onMouseMove={(e) => { if (drawing) setCursor(evToPt(e, e.currentTarget)); }}
            className={`flex-1 relative overflow-hidden ${crosshair ? 'cursor-crosshair' : ''}`}
            style={{ background: doc.background.kind === 'grid' ? GRID_BG : '#f8fafc' }}>
            {canvasBg}
            <OverviewOverlay doc={doc} drawing={drawing} cursor={cursor} showNodes={false} />
          </div>
        </div>
      )}

      {/* ── 3단계: 구간 설계 (개요 / 상세) ─────────────── */}
      {step === 3 && !editingSec && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b border-[#e5e7eb] px-4 flex items-center gap-2 flex-shrink-0" style={{ height: '52px' }}>
            <button onClick={() => setStep(2)} className="border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] flex items-center gap-1 px-3" style={{ height: '36px', fontSize: '13px' }}>
              <ChevronLeft size={14} /> 이전
            </button>
            <button onClick={() => setPlacingNode(!placingNode)}
              className={`flex items-center gap-1.5 px-3 rounded-lg ${placingNode ? 'bg-[#1e3a5f] text-white' : 'border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]'}`}
              style={{ height: '36px', fontSize: '13px' }}>
              <MapPin size={14} /> {placingNode ? '경로 위 클릭하여 격점 추가' : '격점 추가'}
            </button>
            <span className="text-[#9ca3af]" style={{ fontSize: '12px' }}>구간을 클릭하면 상세 설계 화면이 열립니다</span>
            <div className="ml-auto">
              <button onClick={() => setStep(4)} className="bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d5080] flex items-center gap-1 px-4" style={{ height: '36px', fontSize: '13px' }}>
                결과 보기 <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* 구간 목록 */}
            <div className="border-r border-[#e5e7eb] bg-white overflow-y-auto flex-shrink-0" style={{ width: '240px' }}>
              <div className="p-3">
                <p className="text-[#9ca3af] mb-2" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>구간 ({doc.sections.length})</p>
                <div className="space-y-1">
                  {doc.sections.map((sec) => (
                    <button key={sec.id} onClick={() => enterDetail(sec.id)}
                      className="w-full flex items-center gap-2 px-3 rounded-lg text-left text-[#374151] hover:bg-[#f3f4f6]"
                      style={{ height: '38px', fontSize: '13px' }}>
                      {sec.symbols.length > 0 && <Check size={12} className="text-green-500" />}
                      <span className="font-medium">{sec.label}</span>
                      <span className="ml-auto text-[#9ca3af]" style={{ fontSize: '11px' }}>{sec.newPipe}·기호{sec.symbols.length}</span>
                      <ChevronRight size={13} className="text-[#9ca3af]" />
                    </button>
                  ))}
                  {doc.sections.length === 0 && <p className="text-[#9ca3af]" style={{ fontSize: '12px' }}>격점을 찍어 구간을 만드세요</p>}
                </div>
              </div>
              {doc.nodes.length > 0 && (
                <div className="border-t border-[#e5e7eb] p-3">
                  <p className="text-[#9ca3af] mb-2" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>격점 ({doc.nodes.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {doc.nodes.map((n, i) => {
                      const end = n.t <= 0.0001 || n.t >= 0.9999;
                      return (
                        <div key={n.id} className="border border-[#e5e7eb] rounded-lg px-2 py-1 flex items-center gap-1" style={{ fontSize: '11px' }}>
                          <span className="w-4 h-4 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center font-bold" style={{ fontSize: '9px' }}>{i + 1}</span>
                          {!end && <button onClick={() => deleteNode(n.id)} className="text-[#9ca3af] hover:text-red-500"><Trash2 size={11} /></button>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 개요 캔버스 */}
            <div
              onClick={onCanvasClick}
              className={`flex-1 relative overflow-hidden ${crosshair ? 'cursor-crosshair' : ''}`}
              style={{ background: doc.background.kind === 'grid' ? GRID_BG : '#f8fafc' }}>
              {canvasBg}
              <OverviewOverlay doc={doc} drawing={false} cursor={null} showNodes={true} />
            </div>
          </div>
        </div>
      )}

      {/* ── 3단계: 구간 상세뷰 ────────────────────────── */}
      {step === 3 && editingSec && (
        <div className="flex-1 flex overflow-hidden">
          {/* 좌측 패널 */}
          <div className="flex flex-col border-r border-[#e5e7eb] bg-white overflow-y-auto flex-shrink-0" style={{ width: '280px' }}>
            <div className="border-b border-[#e5e7eb] p-3 space-y-2.5">
              <p className="text-[#9ca3af]" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>관로 설정 — {editingSec.label}</p>
              <div>
                <label className="text-[#6b7280] block mb-1" style={{ fontSize: '11px' }}>관종</label>
                <select value={editingSec.material} onChange={(e) => updateSec(editingSec.id, { material: e.target.value as PipeMaterial })}
                  className="w-full border border-[#e5e7eb] rounded px-2" style={{ height: '32px', fontSize: '13px' }}>
                  {PIPE_MATERIALS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              {([['기존관', 'existingPipe'], ['신설관', 'newPipe']] as const).map(([label, key]) => (
                <div key={key}>
                  <label className="text-[#6b7280] block mb-1" style={{ fontSize: '11px' }}>{label}</label>
                  <select value={editingSec[key]} onChange={(e) => updateSec(editingSec.id, { [key]: e.target.value })}
                    className="w-full border border-[#e5e7eb] rounded px-2" style={{ height: '32px', fontSize: '13px' }}>
                    {PIPE_SIZES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label className="text-[#6b7280] block mb-1" style={{ fontSize: '11px' }}>연장 (m)</label>
                <input type="number" min={1} value={editingSec.length}
                  onChange={(e) => updateSec(editingSec.id, { length: parseInt(e.target.value) || 0 })}
                  className="w-full border border-[#e5e7eb] rounded px-2" style={{ height: '32px', fontSize: '13px' }} />
              </div>
            </div>

            <div className="border-b border-[#e5e7eb] p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[#9ca3af]" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>심도 (GL-, m)</p>
                <button onClick={() => autoDepth(editingSec)} className="text-[#1e3a5f] hover:underline" style={{ fontSize: '11px' }}>KDS 자동제안</button>
              </div>
              <div className="flex gap-2">
                {([['시점', 'depthStart'], ['종점', 'depthEnd']] as const).map(([label, key]) => (
                  <div key={key} className="flex-1">
                    <label className="text-[#6b7280] block mb-1" style={{ fontSize: '11px' }}>{label}</label>
                    <input type="number" min={0} step={0.1} value={editingSec[key]}
                      onChange={(e) => updateSec(editingSec.id, { [key]: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-[#e5e7eb] rounded px-2" style={{ height: '32px', fontSize: '13px' }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="border-b border-[#e5e7eb] p-3">
              <p className="text-[#9ca3af] mb-2" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>자재 추가 (상세경로 위 클릭)</p>
              <div className="grid grid-cols-2 gap-1.5">
                {SYM_ORDER.filter((t) => symbolAvailable(t, editingSec.material)).map((t) => (
                  <button key={t} onClick={() => { setActiveSym(activeSym === t ? null : t); setDrawing(false); }}
                    disabled={editingSec.detailRoute.vertices.length < 2}
                    className={`text-left px-2 rounded-lg transition-colors disabled:opacity-40 ${
                      activeSym === t ? 'bg-[#1e3a5f] text-white' : 'border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]'}`}
                    style={{ height: '32px', fontSize: '11px' }}>
                    {SYMBOLS[t].name}
                  </button>
                ))}
              </div>
              {editingSec.detailRoute.vertices.length < 2 && <p className="text-[#9ca3af] mt-2" style={{ fontSize: '11px' }}>먼저 상세경로를 그리세요</p>}
            </div>

            <div className="border-b border-[#e5e7eb] p-3 space-y-2">
              <p className="text-[#9ca3af]" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>AI 도움</p>
              <button onClick={handleAi} disabled={aiLoading}
                className="w-full flex items-center justify-center gap-2 border border-[#1e3a5f] text-[#1e3a5f] rounded-lg hover:bg-[#f0f4f9] disabled:opacity-50"
                style={{ height: '36px', fontSize: '13px' }}>
                <Zap size={14} /> {aiLoading ? 'AI 분석 중...' : 'AI 자동 배치'}
              </button>
              {aiMsg && <p className="text-[#6b7280]" style={{ fontSize: '11px' }}>{aiMsg}</p>}
            </div>

            <div className="p-3">
              <p className="text-[#9ca3af] mb-2" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>이 구간 자재 ({editingSec.symbols.length})</p>
              {editingSec.symbols.length === 0
                ? <p className="text-[#9ca3af]" style={{ fontSize: '12px' }}>기호를 배치하세요</p>
                : Object.entries(editingSec.symbols.reduce<Record<string, number>>((a, s) => { a[SYMBOLS[s.type].name] = (a[SYMBOLS[s.type].name] ?? 0) + 1; return a; }, {}))
                    .map(([name, qty]) => (
                      <div key={name} className="flex justify-between py-0.5" style={{ fontSize: '12px' }}>
                        <span className="text-[#374151]">{name}</span><span className="font-semibold text-[#1e3a5f]">{qty}</span>
                      </div>
                    ))}
            </div>
          </div>

          {/* 상세 캔버스 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-white border-b border-[#e5e7eb] px-4 flex items-center gap-2 flex-shrink-0" style={{ height: '52px' }}>
              <button onClick={exitDetail} className="border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] flex items-center gap-1 px-3" style={{ height: '36px', fontSize: '13px' }}>
                <ArrowLeft size={14} /> 구간 목록
              </button>
              <span className="text-[#111827] font-medium" style={{ fontSize: '14px' }}>{editingSec.label} 상세 설계</span>
              <button onClick={() => { setDrawing(!drawing); setCursor(null); setActiveSym(null); }}
                className={`flex items-center gap-1.5 px-3 rounded-lg ml-2 ${drawing ? 'bg-[#1e3a5f] text-white' : 'border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]'}`}
                style={{ height: '36px', fontSize: '13px' }}>
                <Pencil size={14} /> {drawing ? '그리는 중 (더블클릭/Enter 완료)' : '상세경로 그리기'}
              </button>
              {drawing && <button onClick={detailUndoVertex} className="border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] px-3" style={{ height: '36px', fontSize: '13px' }}>마지막 점 취소</button>}
              {drawing && <button onClick={() => { setDrawing(false); setCursor(null); }} className="bg-green-600 text-white rounded-lg hover:bg-green-700 px-3" style={{ height: '36px', fontSize: '13px' }}>완료</button>}
              {!drawing && editingSec.detailRoute.vertices.length > 0 && <button onClick={detailClearRoute} className="border border-[#e5e7eb] rounded-lg text-red-500 hover:bg-red-50 flex items-center gap-1 px-3" style={{ height: '36px', fontSize: '13px' }}><Trash2 size={13} /> 상세경로 삭제</button>}
              {selSymId && <span className="text-[#9ca3af]" style={{ fontSize: '12px' }}>Delete 키로 기호 삭제</span>}
            </div>
            <div
              onClick={onCanvasClick}
              onDoubleClick={() => { if (drawing) { setDrawing(false); setCursor(null); } }}
              onMouseMove={(e) => { if (drawing) setCursor(evToPt(e, e.currentTarget)); }}
              className={`flex-1 relative overflow-hidden ${crosshair ? 'cursor-crosshair' : ''}`}
              style={{ background: GRID_BG }}>
              <DetailOverlay section={editingSec} drawing={drawing} cursor={cursor}
                selSymId={selSymId} onSelectSym={(id) => setSelSymId(id === selSymId ? null : id)} />
            </div>
          </div>
        </div>
      )}

      {/* ── 4단계: 결과 ───────────────────────────────── */}
      {step === 4 && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b border-[#e5e7eb] px-4 flex items-center gap-2 flex-shrink-0" style={{ height: '52px' }}>
            <button onClick={() => setStep(3)} className="border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] flex items-center gap-1 px-3" style={{ height: '36px', fontSize: '13px' }}>
              <ChevronLeft size={14} /> 이전
            </button>
            {linked && <span className="text-green-700 bg-green-50 px-3 rounded-lg flex items-center gap-1" style={{ fontSize: '13px', height: '36px' }}><Check size={13} /> 내역서에 추가 완료</span>}
            <div className="ml-auto flex gap-2">
              <button onClick={handleDxf} className="flex items-center gap-1.5 border border-[#e5e7eb] rounded-lg text-[#374151] hover:bg-[#f3f4f6] px-3" style={{ height: '36px', fontSize: '13px' }}><FileDown size={13} /> DXF</button>
              <button onClick={() => window.print()} className="flex items-center gap-1.5 border border-[#e5e7eb] rounded-lg text-[#374151] hover:bg-[#f3f4f6] px-3" style={{ height: '36px', fontSize: '13px' }}><Download size={13} /> PDF</button>
              <button onClick={handleEstimateLink} className="flex items-center gap-1.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d5080] px-3" style={{ height: '36px', fontSize: '13px' }}><Link2 size={13} /> 견적 연동</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 bg-[#f8fafc]">
            <DrawingCanvas doc={doc} projectName={`${projectId}_계통도`} />
          </div>
        </div>
      )}
    </div>
  );
}
