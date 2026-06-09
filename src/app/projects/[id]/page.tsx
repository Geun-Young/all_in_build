'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { EstimateItem, WorkTypeResult, Project, WorkRecord } from '@/types';
import { exportEstimateToExcel } from '@/lib/exportExcel';
import { calcFinalAmount } from '@/lib/calcFinalAmount';
import Badge from '@/components/ui/Badge';
import AddWorkModal, { WorkFormData } from '@/components/features/AddWorkModal';
import {
  ChevronLeft, Plus, MoreHorizontal,
  Download, CheckCircle, X, Search, Sun, Moon,
  Trash2, ChevronDown, Send, RotateCcw, FileDown, Link2,
} from 'lucide-react';
import DrawingCanvas, { DrawingData } from '@/components/features/DrawingCanvas';

interface WorkTypeItem {
  id: string;
  category: string;
  name: string;
  spec: string;
  unit: string;
  is_night: boolean;
  labor_price: number;
  material_price: number;
  expense_price: number;
  total_price: number;
}

interface MachineCostItem {
  id: string;
  name: string;
  spec: string;
  unit: string;
  labor_price: number;
  material_price: number;
  expense_price: number;
  total_price: number;
}

// ── 더미 데이터 ───────────────────────────────────────
const DUMMY_PROJECTS: Project[] = [
  {
    id: '1',
    name: '중부관내4구역',
    client: '중부사업소',
    contractor: '칠성건설(주)',
    location: '대전시 중구 문화동 311~20',
    type: '상수도',
    status: '진행중',
    startDate: '2025-03-01',
    endDate: '2025-06-30',
    photoCount: 7,
    createdAt: '2025-03-01',
  },
  {
    id: '2',
    name: '유성구 관평동 상수도 관로 교체',
    client: '유성사업소',
    contractor: '칠성건설(주)',
    location: '대전시 유성구 관평동',
    type: '상수도',
    status: '완료',
    startDate: '2025-01-15',
    endDate: '2025-04-30',
    photoCount: 23,
    createdAt: '2025-01-15',
  },
  {
    id: '3',
    name: '서구 둔산동 급수관 신설',
    client: '서부사업소',
    contractor: '칠성건설(주)',
    location: '대전시 서구 둔산동',
    type: '상수도',
    status: '대기',
    startDate: '2025-06-01',
    endDate: '2025-09-30',
    photoCount: 0,
    createdAt: '2025-06-01',
  },
];

const DUMMY_WORK_RECORDS: WorkRecord[] = [
  { id: '1', projectId: '1', date: '2025-05-21', diameter: '', content: '지하누수', timeOfDay: 'day', hasPhoto: true, createdAt: '2025-05-21T09:00:00' },
  { id: '2', projectId: '1', date: '2025-05-21', diameter: 'D25', content: '지하누수', timeOfDay: 'day', hasPhoto: true, createdAt: '2025-05-21T10:30:00' },
  { id: '3', projectId: '1', date: '2025-05-21', diameter: 'D25', content: '지하누수', timeOfDay: 'night', hasPhoto: true, createdAt: '2025-05-21T22:00:00' },
  { id: '4', projectId: '1', date: '2025-05-20', diameter: 'D25', content: '아1×2.5', timeOfDay: 'day', hasPhoto: true, createdAt: '2025-05-20T09:00:00' },
  { id: '5', projectId: '1', date: '2025-05-20', diameter: 'D25', content: '지하누수', timeOfDay: 'night', hasPhoto: true, createdAt: '2025-05-20T21:00:00' },
];

const DUMMY_ITEMS_1: EstimateItem[] = [
  { id: 'i1', estimate_id: '1', category: '배관공', work_name: 'KP매커니컬접합 Φ150mm', spec: 'Φ150mm', unit: '개소', quantity: 2, unit_price: 32941, labor_amount: 64592, material_amount: 0, expense_amount: 1290, total_amount: 65882, is_night: false, sort_order: 0 },
  { id: 'i2', estimate_id: '1', category: '배관공', work_name: 'KP매커니컬접합 Φ150mm', spec: 'Φ150mm', unit: '개소', quantity: 2, unit_price: 61200, labor_amount: 121110, material_amount: 0, expense_amount: 1290, total_amount: 122400, is_night: true, sort_order: 1 },
  { id: 'i3', estimate_id: '1', category: '배관공', work_name: '이탈방지접합 Φ150mm', spec: 'Φ150mm', unit: '개소', quantity: 10, unit_price: 42824, labor_amount: 419850, material_amount: 0, expense_amount: 8390, total_amount: 428240, is_night: false, sort_order: 2 },
  { id: 'i4', estimate_id: '1', category: '배관공', work_name: '이탈방지접합 Φ150mm', spec: 'Φ150mm', unit: '개소', quantity: 16, unit_price: 79561, labor_amount: 1259552, material_amount: 0, expense_amount: 13424, total_amount: 1272976, is_night: true, sort_order: 3 },
  { id: 'i5', estimate_id: '1', category: '배관공', work_name: '주철관절단 Φ150mm', spec: 'Φ150mm', unit: '개소', quantity: 6, unit_price: 24931, labor_amount: 142464, material_amount: 0, expense_amount: 7122, total_amount: 149586, is_night: false, sort_order: 4 },
];

const CATEGORIES = ['전체', '배관공', '토공', '터파기', '되메우기', '포장', '구조물공', '부대공'];

// ── 유틸 ──────────────────────────────────────────────
function fmt(n: number) { return n.toLocaleString('ko-KR'); }
function formatDate(d: string) { return d.replace(/-/g, '.').slice(0, 10); }
function formatDateKo(d: string) {
  const [year, month, day] = d.split('-');
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
}
function formatTime(iso: string) { return iso.split('T')[1]?.slice(0, 5) ?? ''; }

// ── 수량 입력 모달 ────────────────────────────────────
interface QuantityModalProps {
  price: WorkTypeResult;
  onConfirm: (quantity: number) => void;
  onClose: () => void;
}

function QuantityModal({ price, onConfirm, onClose }: QuantityModalProps) {
  const [quantity, setQuantity] = useState(1);
  const labor    = Math.floor(price.labor_price    * quantity);
  const material = Math.floor(price.material_price * quantity);
  const expense  = Math.floor(price.expense_price  * quantity);
  const total    = labor + material + expense;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-medium text-[#111827]" style={{ fontSize: '16px' }}>
              {price.name}
              {price.is_night && <span className="ml-1.5 text-[#6b7280]" style={{ fontSize: '14px' }}>(야간)</span>}
            </h3>
            <p className="text-[#6b7280] mt-0.5" style={{ fontSize: '14px' }}>{price.spec} / {price.unit}</p>
          </div>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#6b7280]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-[#6b7280]" style={{ fontSize: '15px' }}>단위단가</span>
            <span className="font-medium text-[#1e3a5f]" style={{ fontSize: '15px' }}>{fmt(price.unit_price)}원/{price.unit}</span>
          </div>
          <div>
            <label className="text-[#6b7280] mb-1 block" style={{ fontSize: '14px' }}>수량</label>
            <input
              type="number"
              min={0.001}
              step={0.001}
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full border border-[#e5e7eb] rounded-lg px-3 text-[#111827] focus:outline-none focus:border-[#1e3a5f]"
              style={{ fontSize: '16px', height: '48px' }}
            />
          </div>
          <div className="bg-[#f8fafc] rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between" style={{ fontSize: '14px' }}>
              <span className="text-[#9ca3af]">노무비</span>
              <span className="text-[#374151]">{fmt(labor)}원</span>
            </div>
            <div className="flex justify-between" style={{ fontSize: '14px' }}>
              <span className="text-[#9ca3af]">재료비</span>
              <span className="text-[#374151]">{fmt(material)}원</span>
            </div>
            <div className="flex justify-between" style={{ fontSize: '14px' }}>
              <span className="text-[#9ca3af]">경비 (공구손료)</span>
              <span className="text-[#374151]">{fmt(expense)}원</span>
            </div>
            <div className="flex justify-between font-medium pt-1.5 border-t border-[#e5e7eb]" style={{ fontSize: '15px' }}>
              <span className="text-[#374151]">예상 금액</span>
              <span className="text-[#1e3a5f]">{fmt(total)}원</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6]"
            style={{ height: '48px', fontSize: '16px' }}
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(quantity)}
            disabled={!quantity || quantity <= 0}
            className="flex-1 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d5080] disabled:opacity-40"
            style={{ height: '48px', fontSize: '16px' }}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 원가계산서 행 컴포넌트 ────────────────────────────
interface CostRowProps {
  label: string;
  rate?: string;
  sym?: string;
  value: number;
  bold?: boolean;
  accent?: boolean;
  sub?: boolean;
}

function CostRow({ label, rate, sym, value, bold, accent, sub }: CostRowProps) {
  return (
    <tr className={accent ? 'bg-[#f0f4f9]' : ''}>
      <td className={`px-4 py-2.5 ${sub ? 'pl-8 text-[#6b7280]' : bold ? 'font-semibold text-[#111827]' : 'text-[#374151]'}`}
          style={{ fontSize: '14px' }}>
        {label}
        {rate && <span className="ml-1.5 text-[#9ca3af]" style={{ fontSize: '12px' }}>({rate})</span>}
      </td>
      <td className="px-3 py-2.5 text-center text-[#9ca3af]" style={{ fontSize: '12px' }}>{sym}</td>
      <td className={`px-4 py-2.5 text-right tabular-nums ${bold ? 'font-semibold text-[#1e3a5f]' : sub ? 'text-[#6b7280]' : 'text-[#374151]'}`}
          style={{ fontSize: '14px' }}>
        {fmt(value)}
      </td>
    </tr>
  );
}

const INITIAL_BP_MSG = {
  role: 'assistant' as const,
  content: '안녕하세요! 상하수도 관로 도면 설계를 도와드리겠습니다.\n어떤 공사를 진행하실 예정인가요?\n예) 신성동 D400 상수도 이설공사, 기존 D350 → 신설 D400',
};

// ── 메인 페이지 ──────────────────────────────────────
export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const tab = searchParams.get('tab') ?? 'site';
  const sub = searchParams.get('sub') ?? 'ledger';

  const project = DUMMY_PROJECTS.find((p) => p.id === id);

  // ── 공사현장 상태 ─
  const [workRecords, setWorkRecords] = useState<WorkRecord[]>(
    () => DUMMY_WORK_RECORDS.filter((r) => r.projectId === id)
  );
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WorkRecord | null>(null);
  const [openWorkMenuId, setOpenWorkMenuId] = useState<string | null>(null);

  // ── 견적관리 상태 ─
  const [estimateName, setEstimateName] = useState(
    id === '1' ? '금고동 상수도 이설공 D150' : '견적서'
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [estimateStatus, setEstimateStatus] = useState<'draft' | 'confirmed'>(
    id === '1' ? 'confirmed' : 'draft'
  );
  const [items, setItems] = useState<EstimateItem[]>(id === '1' ? DUMMY_ITEMS_1 : []);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [isNightSearch, setIsNightSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<WorkTypeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<WorkTypeResult | null>(null);
  const [estimateSubTab, setEstimateSubTab] = useState<'table' | 'search'>('table');

  // ── 기계경비 상태 ─
  const [machineCosts, setMachineCosts] = useState<MachineCostItem[]>([]);
  const [mcLoading, setMcLoading] = useState(false);
  const [mcError, setMcError] = useState(false);

  // ── 일위대가 상태 ─
  const [workTypes, setWorkTypes] = useState<WorkTypeItem[]>([]);
  const [wtLoading, setWtLoading] = useState(false);
  const [wtError, setWtError] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (isEditingName) nameInputRef.current?.focus(); }, [isEditingName]);

  // ── 도면설계 상태 ─
  const [bpMessages, setBpMessages] = useState<Array<{role: 'user'|'assistant', content: string}>>([]);
  const [bpInput, setBpInput] = useState('');
  const [bpLoading, setBpLoading] = useState(false);
  const [bpDrawingData, setBpDrawingData] = useState<DrawingData | null>(null);
  const [bpDrawingTab, setBpDrawingTab] = useState<'diagram'|'materials'>('diagram');
  const [bpMobileView, setBpMobileView] = useState<'chat'|'preview'>('chat');
  const [bpEstimateSuccess, setBpEstimateSuccess] = useState(false);
  const bpEndRef = useRef<HTMLDivElement>(null);

  // Blueprint: sessionStorage 복원 + 초기 메시지
  useEffect(() => {
    if (tab !== 'blueprint') return;
    const stored = sessionStorage.getItem(`blueprint_messages_${id}`);
    if (stored) {
      try { setBpMessages(JSON.parse(stored)); return; } catch {}
    }
    setBpMessages([INITIAL_BP_MSG]);
  }, [tab, id]);

  // Blueprint: 스크롤 자동
  useEffect(() => {
    bpEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [bpMessages]);

  const doSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      const p = new URLSearchParams({ q: searchQuery, category, night: String(isNightSearch) });
      const res = await fetch(`/api/estimate/search?${p}`);
      setSearchResults(await res.json());
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, category, isNightSearch]);

  useEffect(() => {
    const t = setTimeout(doSearch, 300);
    return () => clearTimeout(t);
  }, [doSearch]);

  // 기계경비 탭 진입 시 데이터 로드
  useEffect(() => {
    if (tab === 'estimate' && sub === 'equipment') {
      setMcLoading(true);
      setMcError(false);
      fetch('/api/estimate/machine-costs')
        .then((r) => r.json())
        .then((d) => setMachineCosts(d))
        .catch(() => { setMcError(true); setMachineCosts([]); })
        .finally(() => setMcLoading(false));
    }
  }, [tab, sub]);

  // 일위대가/단가산출 탭 진입 시 데이터 로드
  useEffect(() => {
    if (tab === 'estimate' && (sub === 'unitprice' || sub === 'calculation')) {
      setWtLoading(true);
      setWtError(false);
      fetch('/api/estimate/work-types')
        .then((r) => r.json())
        .then((d) => setWorkTypes(d))
        .catch(() => { setWtError(true); setWorkTypes([]); })
        .finally(() => setWtLoading(false));
    }
  }, [tab, sub]);

  if (!project) {
    return (
      <div className="p-10 text-center text-[#6b7280]" style={{ fontSize: '16px' }}>
        프로젝트를 찾을 수 없습니다.
      </div>
    );
  }

  // ── 공사현장 핸들러 ─
  const groupedByDate = workRecords.reduce<Record<string, WorkRecord[]>>((acc, r) => {
    (acc[r.date] ??= []).push(r);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const INFO_ROWS = [
    { label: '시행청', value: project.client },
    { label: '시행사', value: project.contractor },
    { label: '위치', value: project.location },
    { label: '공사 유형', value: project.type },
    { label: '기간', value: `${formatDate(project.startDate)} ~ ${formatDate(project.endDate)}` },
  ];

  function handleSaveWork(data: WorkFormData) {
    if (editingRecord) {
      setWorkRecords((prev) =>
        prev.map((r) => (r.id === editingRecord.id ? { ...r, ...data } : r))
      );
    } else {
      const newRecord: WorkRecord = {
        id: String(Date.now()),
        projectId: id,
        createdAt: new Date().toISOString(),
        ...data,
      };
      setWorkRecords((prev) => [...prev, newRecord]);
    }
    setEditingRecord(null);
    setIsWorkModalOpen(false);
  }

  function handleDeleteWork(recordId: string) {
    setWorkRecords((prev) => prev.filter((r) => r.id !== recordId));
    setOpenWorkMenuId(null);
  }

  // ── 견적 핸들러 ─
  function handleAddItem(price: WorkTypeResult, quantity: number) {
    const labor    = Math.floor(price.labor_price    * quantity);
    const material = Math.floor(price.material_price * quantity);
    const expense  = Math.floor(price.expense_price  * quantity);
    const newItem: EstimateItem = {
      id:              `item-${Date.now()}`,
      estimate_id:     id,
      category:        price.category,
      work_name:       `${price.name} ${price.spec}`.trim(),
      spec:            price.spec,
      unit:            price.unit,
      quantity,
      unit_price:      price.unit_price,
      labor_amount:    labor,
      material_amount: material,
      expense_amount:  expense,
      total_amount:    labor + material + expense,
      is_night:        price.is_night,
      sort_order:      items.length,
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedPrice(null);
    setEstimateSubTab('table');
  }

  function handleDeleteItem(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  const totalLabor    = items.reduce((s, i) => s + i.labor_amount,    0);
  const totalMaterial = items.reduce((s, i) => s + i.material_amount, 0);
  const totalExpense  = items.reduce((s, i) => s + i.expense_amount,  0);
  const totalAmount   = totalLabor + totalMaterial + totalExpense;

  const groups = items.reduce<Record<string, EstimateItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // 원가계산서 계산 (costsheet 탭이고 항목이 있을 때만)
  const costSheet = tab === 'estimate' && sub === 'costsheet' && items.length > 0
    ? calcFinalAmount(totalMaterial, totalLabor, totalExpense)
    : null;

  // ── 도면설계 핸들러 ─
  function handleBpReset() {
    setBpMessages([INITIAL_BP_MSG]);
    setBpDrawingData(null);
    setBpEstimateSuccess(false);
    sessionStorage.removeItem(`blueprint_messages_${id}`);
  }

  async function handleBpSend() {
    const text = bpInput.trim();
    if (!text || bpLoading) return;
    const userMsg = { role: 'user' as const, content: text };
    const newMsgs = [...bpMessages, userMsg];
    setBpMessages(newMsgs);
    setBpInput('');
    setBpLoading(true);
    try {
      const res = await fetch('/api/blueprint/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs }),
      });
      const data = await res.json();
      const aiMsg = { role: 'assistant' as const, content: data.message || '응답을 받지 못했습니다.' };
      const finalMsgs = [...newMsgs, aiMsg];
      setBpMessages(finalMsgs);
      sessionStorage.setItem(`blueprint_messages_${id}`, JSON.stringify(finalMsgs));
      if (data.drawingData) {
        setBpDrawingData(data.drawingData);
        setBpMobileView('preview');
      }
    } catch {
      setBpMessages((prev) => [...prev, { role: 'assistant' as const, content: 'AI 연결에 오류가 발생했습니다. 다시 시도해 주세요.' }]);
    } finally {
      setBpLoading(false);
    }
  }

  async function handleBpDxf() {
    if (!bpDrawingData) return;
    try {
      const res = await fetch('/api/blueprint/export-dxf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drawingData: bpDrawingData }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bpDrawingData.projectName}_계통도.dxf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('DXF 생성에 실패했습니다.');
    }
  }

  function handleBpEstimate() {
    if (!bpDrawingData) return;
    const newBpItems: EstimateItem[] = bpDrawingData.totalMaterials.map((m, i) => ({
      id: `bp-${Date.now()}-${i}`,
      estimate_id: id,
      category: '배관공',
      work_name: `${m.name} ${m.spec}`.trim(),
      spec: m.spec,
      unit: m.unit,
      quantity: m.qty,
      unit_price: 0,
      labor_amount: 0,
      material_amount: 0,
      expense_amount: 0,
      total_amount: 0,
      is_night: false,
      sort_order: items.length + i,
    }));
    setItems((prev) => [...prev, ...newBpItems]);
    setBpEstimateSuccess(true);
    setBpDrawingTab('materials');
  }

  return (
    <div className="flex flex-col h-screen" onClick={() => setOpenWorkMenuId(null)}>
      {/* 헤더 */}
      <header className="bg-white border-b border-[#e5e7eb] flex items-center px-4 gap-3 flex-shrink-0" style={{ height: '80px' }}>
        <button
          onClick={() => router.push('/')}
          className="flex items-center justify-center rounded-lg hover:bg-[#f3f4f6] transition-colors flex-shrink-0"
          style={{ width: '44px', height: '44px' }}
        >
          <ChevronLeft size={22} className="text-[#374151]" />
        </button>
        <span className="flex-1 text-[#111827] font-semibold truncate" style={{ fontSize: '20px' }}>
          {project.name}
        </span>
        <Badge variant={project.status}>{project.status}</Badge>
      </header>

      {/* ─── site: 공사현장 ───────────────────────────── */}
      {tab === 'site' && (
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
            <div className="divide-y divide-[#f3f4f6]">
              {INFO_ROWS.map(({ label, value }) => (
                <div key={label} className="flex px-5 py-3.5">
                  <span className="w-20 flex-shrink-0 text-[#6b7280]" style={{ fontSize: '15px' }}>{label}</span>
                  <span className="text-[#111827]" style={{ fontSize: '15px' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={(e) => { e.stopPropagation(); setEditingRecord(null); setIsWorkModalOpen(true); }}
              className="flex items-center gap-2 bg-[#1e3a5f] text-white px-5 rounded-xl font-medium hover:bg-[#2d5080] transition-colors"
              style={{ height: '48px', fontSize: '16px' }}
            >
              <Plus size={18} />
              작업 추가
            </button>
          </div>

          {sortedDates.length === 0 ? (
            <p className="text-center text-[#9ca3af] py-16" style={{ fontSize: '16px' }}>
              등록된 작업이 없습니다.
            </p>
          ) : (
            sortedDates.map((date) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-medium text-[#374151] whitespace-nowrap" style={{ fontSize: '15px' }}>
                    {formatDateKo(date)}
                  </span>
                  <div className="flex-1 h-px bg-[#e5e7eb]" />
                </div>

                <div className="space-y-3">
                  {groupedByDate[date].map((record) => (
                    <div
                      key={record.id}
                      className="relative bg-white border border-[#e5e7eb] rounded-xl overflow-hidden shadow-sm"
                    >
                      <div className="absolute top-2 right-2 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenWorkMenuId(openWorkMenuId === record.id ? null : record.id);
                          }}
                          className="flex items-center justify-center rounded-lg hover:bg-[#f3f4f6] transition-colors"
                          style={{ width: '44px', height: '44px' }}
                        >
                          <MoreHorizontal size={18} className="text-[#9ca3af]" />
                        </button>
                        {openWorkMenuId === record.id && (
                          <div className="absolute right-0 top-full mt-1 w-24 bg-white border border-[#e5e7eb] rounded-xl shadow-lg z-10 overflow-hidden">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingRecord(record); setIsWorkModalOpen(true); setOpenWorkMenuId(null); }}
                              className="w-full px-4 py-3 text-left text-[#374151] hover:bg-[#f3f4f6] transition-colors"
                              style={{ fontSize: '15px' }}
                            >
                              수정
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteWork(record.id); }}
                              className="w-full px-4 py-3 text-left text-[#6b7280] hover:bg-[#f3f4f6] transition-colors border-t border-[#f3f4f6]"
                              style={{ fontSize: '15px' }}
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex">
                        <div className="w-24 h-24 flex-shrink-0 bg-[#f0f4f9] flex items-center justify-center">
                          {record.hasPhoto ? (
                            <span className="text-[#6b7280]" style={{ fontSize: '13px' }}>사진</span>
                          ) : (
                            <span className="text-[#9ca3af]" style={{ fontSize: '13px' }}>없음</span>
                          )}
                        </div>
                        <div className="flex-1 px-4 py-3 pr-14 space-y-1.5">
                          {record.diameter && (
                            <div className="flex gap-2">
                              <span className="text-[#9ca3af] w-10 flex-shrink-0" style={{ fontSize: '14px' }}>구경</span>
                              <span className="text-[#111827]" style={{ fontSize: '14px' }}>{record.diameter}</span>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <span className="text-[#9ca3af] w-10 flex-shrink-0" style={{ fontSize: '14px' }}>내용</span>
                            <span className="text-[#111827]" style={{ fontSize: '14px' }}>{record.content}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-[#9ca3af] w-10 flex-shrink-0" style={{ fontSize: '14px' }}>시행사</span>
                            <span className="text-[#111827]" style={{ fontSize: '14px' }}>{project.contractor}</span>
                          </div>
                          <p className="text-[#9ca3af] pt-0.5" style={{ fontSize: '12px' }}>
                            {formatTime(record.createdAt)}{' '}
                            {record.timeOfDay === 'day' ? '🌤' : '🌙'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── estimate: 견적관리 ───────────────────────── */}
      {tab === 'estimate' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 공통 헤더 바 */}
          <div className="bg-white border-b border-[#e5e7eb] px-4 flex items-center gap-3 flex-shrink-0" style={{ height: '60px' }}>
            {isEditingName ? (
              <input
                ref={nameInputRef}
                value={estimateName}
                onChange={(e) => setEstimateName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                className="flex-1 font-medium text-[#111827] border-b border-[#1e3a5f] focus:outline-none bg-transparent"
                style={{ fontSize: '16px' }}
              />
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="flex-1 text-left font-medium text-[#111827] hover:text-[#1e3a5f] transition-colors truncate"
                style={{ fontSize: '16px' }}
              >
                {estimateName}
              </button>
            )}

            <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
              estimateStatus === 'confirmed' ? 'bg-[#dbeafe] text-[#1e40af]' : 'bg-[#f3f4f6] text-[#6b7280]'
            }`} style={{ fontSize: '13px' }}>
              {estimateStatus === 'confirmed' ? '확정' : '작성중'}
            </span>

            {sub === 'ledger' && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => exportEstimateToExcel({ estimateName, items })}
                  disabled={items.length === 0}
                  className="flex items-center gap-1.5 border border-[#e5e7eb] rounded-lg text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-40 transition-colors"
                  style={{ fontSize: '13px', padding: '6px 10px', height: '36px' }}
                >
                  <Download size={13} /> 엑셀
                </button>
                {estimateStatus === 'draft' && (
                  <button
                    onClick={() => setEstimateStatus('confirmed')}
                    className="flex items-center gap-1.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d5080] transition-colors"
                    style={{ fontSize: '13px', padding: '6px 10px', height: '36px' }}
                  >
                    <CheckCircle size={13} /> 확정
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ─ 내역서 (ledger) ─ */}
          {sub === 'ledger' && (
            <>
              {/* 모바일 서브탭 */}
              <div className="md:hidden flex border-b border-[#e5e7eb] bg-white flex-shrink-0">
                {(['table', 'search'] as const).map((st) => (
                  <button key={st} onClick={() => setEstimateSubTab(st)}
                    className={`flex-1 transition-colors border-b-2 -mb-px ${
                      estimateSubTab === st ? 'border-[#1e3a5f] text-[#1e3a5f] font-medium' : 'border-transparent text-[#6b7280]'
                    }`}
                    style={{ fontSize: '15px', minHeight: '44px' }}
                  >
                    {st === 'table' ? '내역서' : '공종추가'}
                  </button>
                ))}
              </div>

              {/* 테이블 + 검색 패널 */}
              <div className="flex-1 flex overflow-hidden">
                <div className={`flex-1 flex flex-col overflow-hidden ${estimateSubTab === 'search' ? 'hidden md:flex' : 'flex'}`}>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse min-w-[700px]" style={{ fontSize: '13px' }}>
                      <thead>
                        <tr className="bg-[#f0f4f9] border-b border-[#e5e7eb]">
                          {['번호', '공종', '품명', '규격', '단위', '수량', '단가', '노무비', '재료비', '경비', '합계', ''].map((h) => (
                            <th key={h} className="px-2 py-2.5 text-left text-[#374151] font-medium whitespace-nowrap first:pl-4">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(groups).length === 0 ? (
                          <tr>
                            <td colSpan={12} className="text-center py-12 text-[#9ca3af]" style={{ fontSize: '15px' }}>
                              우측 패널에서 공종을 검색하여 추가하세요
                            </td>
                          </tr>
                        ) : (
                          Object.entries(groups).map(([cat, groupItems]) => {
                            const sL = groupItems.reduce((s, i) => s + i.labor_amount, 0);
                            const sM = groupItems.reduce((s, i) => s + i.material_amount, 0);
                            const sE = groupItems.reduce((s, i) => s + i.expense_amount, 0);
                            const sT = groupItems.reduce((s, i) => s + i.total_amount, 0);
                            return [
                              <tr key={`g-${cat}`} className="bg-[#f0f4f9] border-y border-[#e5e7eb]">
                                <td className="pl-4 py-2 font-medium text-[#374151]" colSpan={7}>[{cat}]</td>
                                <td className="px-2 py-2 text-[#374151]">{fmt(sL)}</td>
                                <td className="px-2 py-2 text-[#374151]">{fmt(sM)}</td>
                                <td className="px-2 py-2 text-[#374151]">{fmt(sE)}</td>
                                <td className="px-2 py-2 font-medium text-[#1e3a5f]">{fmt(sT)}</td>
                                <td />
                              </tr>,
                              ...groupItems.map((item, idx) => (
                                <tr key={item.id} className="border-b border-[#f3f4f6] hover:bg-[#f8fafc] group">
                                  <td className="pl-4 py-2 text-[#9ca3af]">{idx + 1}</td>
                                  <td className="px-2 py-2 text-[#6b7280]">{item.category}</td>
                                  <td className="px-2 py-2 text-[#111827]">
                                    {item.work_name}
                                    {item.is_night && <span className="ml-1 text-[#6b7280]">(야간)</span>}
                                  </td>
                                  <td className="px-2 py-2 text-[#6b7280]">{item.spec}</td>
                                  <td className="px-2 py-2 text-[#6b7280]">{item.unit}</td>
                                  <td className="px-2 py-2 text-[#374151]">{item.quantity}</td>
                                  <td className="px-2 py-2 text-[#374151]">{fmt(item.unit_price)}</td>
                                  <td className="px-2 py-2 text-[#374151]">{fmt(item.labor_amount)}</td>
                                  <td className="px-2 py-2 text-[#374151]">{fmt(item.material_amount)}</td>
                                  <td className="px-2 py-2 text-[#374151]">{fmt(item.expense_amount)}</td>
                                  <td className="px-2 py-2 font-medium text-[#1e3a5f]">{fmt(item.total_amount)}</td>
                                  <td className="px-2 py-2">
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="opacity-0 group-hover:opacity-100 text-[#9ca3af] hover:text-red-500 transition-all"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </td>
                                </tr>
                              )),
                            ];
                          })
                        )}
                      </tbody>
                      {items.length > 0 && (
                        <tfoot>
                          <tr className="bg-[#f0f4f9] border-t-2 border-[#1e3a5f]">
                            <td className="pl-4 py-2.5 font-semibold text-[#111827]" colSpan={7}>합계</td>
                            <td className="px-2 py-2.5 font-semibold text-[#374151]">{fmt(totalLabor)}</td>
                            <td className="px-2 py-2.5 font-semibold text-[#374151]">{fmt(totalMaterial)}</td>
                            <td className="px-2 py-2.5 font-semibold text-[#374151]">{fmt(totalExpense)}</td>
                            <td className="px-2 py-2.5 font-bold text-[#1e3a5f]">{fmt(totalAmount)}</td>
                            <td />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                  <div className="border-t border-[#e5e7eb] p-3 flex-shrink-0 md:hidden">
                    <button onClick={() => setEstimateSubTab('search')}
                      className="flex items-center gap-1.5 text-[#6b7280] hover:text-[#1e3a5f] transition-colors"
                      style={{ fontSize: '14px' }}
                    >
                      <Plus size={14} /> 공종 추가
                    </button>
                  </div>
                </div>

                {/* 검색 패널 */}
                <div className={`w-full md:w-[40%] md:max-w-sm border-l border-[#e5e7eb] flex flex-col overflow-hidden ${
                  estimateSubTab === 'table' ? 'hidden md:flex' : 'flex'
                }`}>
                  <div className="p-4 border-b border-[#e5e7eb]">
                    <h2 className="text-[#111827] font-medium mb-3" style={{ fontSize: '15px' }}>공종 추가 (품셈 기반)</h2>
                    <div className="relative mb-2">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="공종명 또는 품셈코드 검색..."
                        className="w-full pl-8 pr-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#1e3a5f]"
                        style={{ fontSize: '15px', height: '44px' }}
                      />
                    </div>
                    <div className="flex gap-1 mb-2">
                      {[false, true].map((night) => (
                        <button
                          key={String(night)}
                          onClick={() => setIsNightSearch(night)}
                          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg transition-colors ${
                            isNightSearch === night
                              ? 'bg-[#1e3a5f] text-white'
                              : 'border border-[#e5e7eb] text-[#6b7280] hover:bg-[#f3f4f6]'
                          }`}
                          style={{ fontSize: '14px', height: '40px' }}
                        >
                          {night ? <><Moon size={13} /> 야간</> : <><Sun size={13} /> 주간</>}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full border border-[#e5e7eb] rounded-lg px-3 text-[#374151] appearance-none focus:outline-none focus:border-[#1e3a5f]"
                        style={{ fontSize: '14px', height: '40px' }}
                      >
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {isSearching ? (
                      <p className="text-center text-[#9ca3af] py-8" style={{ fontSize: '14px' }}>검색 중...</p>
                    ) : searchResults.length === 0 ? (
                      <p className="text-center text-[#9ca3af] py-8" style={{ fontSize: '14px' }}>검색 결과가 없습니다</p>
                    ) : (
                      <div className="divide-y divide-[#f3f4f6]">
                        {searchResults.map((wt) => (
                          <button
                            key={wt.id}
                            onClick={() => setSelectedPrice(wt)}
                            className="w-full text-left px-4 py-3 hover:bg-[#f8fafc] transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#111827] truncate" style={{ fontSize: '14px' }}>{wt.name}</p>
                                <p className="text-[#9ca3af] mt-0.5" style={{ fontSize: '13px' }}>
                                  {wt.spec} / {wt.unit}
                                  <span className="mx-1.5 text-[#d1d5db]">|</span>
                                  노무 {fmt(wt.labor_price)} + 경비 {fmt(wt.expense_price)}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-semibold text-[#1e3a5f]" style={{ fontSize: '14px' }}>{fmt(wt.unit_price)}원</p>
                                <p className="text-[#9ca3af]" style={{ fontSize: '12px' }}>/{wt.unit}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ─ 내역서총괄표 (summary) ─ */}
          {sub === 'summary' && (
            <div className="flex-1 overflow-auto p-5">
              {items.length === 0 ? (
                <p className="text-center text-[#9ca3af] py-16" style={{ fontSize: '15px' }}>
                  내역서에 항목이 없습니다.
                </p>
              ) : (
                <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
                  <table className="w-full border-collapse" style={{ fontSize: '14px' }}>
                    <thead>
                      <tr className="bg-[#f0f4f9] border-b border-[#e5e7eb]">
                        {['공종', '노무비', '재료비', '경비', '합계'].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-[#374151] font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f3f4f6]">
                      {Object.entries(groups).map(([cat, groupItems]) => {
                        const sL = groupItems.reduce((s, i) => s + i.labor_amount, 0);
                        const sM = groupItems.reduce((s, i) => s + i.material_amount, 0);
                        const sE = groupItems.reduce((s, i) => s + i.expense_amount, 0);
                        const sT = groupItems.reduce((s, i) => s + i.total_amount, 0);
                        return (
                          <tr key={cat} className="hover:bg-[#f8fafc]">
                            <td className="px-4 py-3 text-[#374151] font-medium">{cat}</td>
                            <td className="px-4 py-3 text-[#374151] tabular-nums">{fmt(sL)}</td>
                            <td className="px-4 py-3 text-[#374151] tabular-nums">{fmt(sM)}</td>
                            <td className="px-4 py-3 text-[#374151] tabular-nums">{fmt(sE)}</td>
                            <td className="px-4 py-3 font-semibold text-[#1e3a5f] tabular-nums">{fmt(sT)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#f0f4f9] border-t-2 border-[#1e3a5f]">
                        <td className="px-4 py-2.5 font-semibold text-[#111827]">합계</td>
                        <td className="px-4 py-2.5 font-semibold text-[#374151] tabular-nums">{fmt(totalLabor)}</td>
                        <td className="px-4 py-2.5 font-semibold text-[#374151] tabular-nums">{fmt(totalMaterial)}</td>
                        <td className="px-4 py-2.5 font-semibold text-[#374151] tabular-nums">{fmt(totalExpense)}</td>
                        <td className="px-4 py-2.5 font-bold text-[#1e3a5f] tabular-nums">{fmt(totalAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─ 일위대가총괄표 (unitprice) ─ */}
          {sub === 'unitprice' && (
            <div className="flex-1 overflow-auto p-4 sm:p-5">
              <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
                {wtLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : wtError ? (
                  <p className="text-center text-[#9ca3af] py-16" style={{ fontSize: '15px' }}>데이터를 불러올 수 없습니다</p>
                ) : (
                  <table className="w-full border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-[#f0f4f9] border-b border-[#e5e7eb]">
                        {['번호', '품명', '규격', '단위', '노무비', '재료비', '경비', '합계'].map((h) => (
                          <th key={h} className={`px-3 py-3 text-[#374151] font-medium ${['노무비','재료비','경비','합계'].includes(h) ? 'text-right' : 'text-left'}`}
                              style={{ fontSize: '16px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const categories = Array.from(new Set(workTypes.map((w) => w.category)));
                        let rowNum = 0;
                        return categories.flatMap((cat) => {
                          const rows = workTypes
                            .filter((w) => w.category === cat)
                            .sort((a, b) => {
                              const nameComp = a.name.localeCompare(b.name, 'ko');
                              if (nameComp !== 0) return nameComp;
                              return (a.is_night ? 1 : 0) - (b.is_night ? 1 : 0);
                            });
                          return [
                            <tr key={`gh-${cat}`} className="bg-[#f0f4f9] border-y border-[#e5e7eb]">
                              <td colSpan={8} className="px-4 py-2.5 font-semibold text-[#374151]" style={{ fontSize: '16px' }}>{cat}</td>
                            </tr>,
                            ...rows.map((w) => {
                              rowNum += 1;
                              const n = rowNum;
                              return (
                                <tr key={w.id} className="border-b border-[#f3f4f6] hover:bg-[#f8fafc]" style={{ height: '48px' }}>
                                  <td className="px-3 text-[#9ca3af]" style={{ fontSize: '16px' }}>{n}</td>
                                  <td className="px-3 text-[#111827]" style={{ fontSize: '16px' }}>
                                    {w.name}
                                  </td>
                                  <td className="px-3 text-[#6b7280]" style={{ fontSize: '16px' }}>{w.spec}</td>
                                  <td className="px-3 text-[#6b7280]" style={{ fontSize: '16px' }}>{w.unit}</td>
                                  <td className="px-3 text-right text-[#374151] tabular-nums" style={{ fontSize: '16px' }}>{fmt(w.labor_price)}</td>
                                  <td className="px-3 text-right text-[#374151] tabular-nums" style={{ fontSize: '16px' }}>{fmt(w.material_price)}</td>
                                  <td className="px-3 text-right text-[#374151] tabular-nums" style={{ fontSize: '16px' }}>
                                    {w.expense_price > 0 ? fmt(w.expense_price) : <span className="text-[#d1d5db]">—</span>}
                                  </td>
                                  <td className="px-3 text-right font-semibold text-[#1e3a5f] tabular-nums" style={{ fontSize: '16px' }}>{fmt(w.total_price)}</td>
                                </tr>
                              );
                            }),
                          ];
                        });
                      })()}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ─ 단가산출총괄표 (calculation) ─ */}
          {sub === 'calculation' && (
            <div className="flex-1 overflow-auto p-4 sm:p-5">
              <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
                {wtLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : wtError ? (
                  <p className="text-center text-[#9ca3af] py-16" style={{ fontSize: '15px' }}>데이터를 불러올 수 없습니다</p>
                ) : (
                  <table className="w-full border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-[#f0f4f9] border-b border-[#e5e7eb]">
                        {['번호', '품명', '규격', '단위', '노무비', '재료비', '경비', '합계'].map((h) => (
                          <th key={h} className={`px-3 py-3 text-[#374151] font-medium ${['노무비','재료비','경비','합계'].includes(h) ? 'text-right' : 'text-left'}`}
                              style={{ fontSize: '16px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const rows = workTypes.filter((w) => !w.is_night && w.category === '토공');
                        if (rows.length === 0) {
                          return (
                            <tr>
                              <td colSpan={8} className="text-center py-12 text-[#9ca3af]" style={{ fontSize: '15px' }}>데이터가 없습니다</td>
                            </tr>
                          );
                        }
                        return rows.map((w, i) => (
                          <tr key={w.id} className="border-b border-[#f3f4f6] hover:bg-[#f8fafc]" style={{ height: '48px' }}>
                            <td className="px-3 text-[#9ca3af]" style={{ fontSize: '16px' }}>{i + 1}</td>
                            <td className="px-3 text-[#111827]" style={{ fontSize: '16px' }}>{w.name}</td>
                            <td className="px-3 text-[#6b7280]" style={{ fontSize: '16px' }}>{w.spec}</td>
                            <td className="px-3 text-[#6b7280]" style={{ fontSize: '16px' }}>{w.unit}</td>
                            <td className="px-3 text-right text-[#374151] tabular-nums" style={{ fontSize: '16px' }}>{fmt(w.labor_price)}</td>
                            <td className="px-3 text-right text-[#374151] tabular-nums" style={{ fontSize: '16px' }}>{fmt(w.material_price)}</td>
                            <td className="px-3 text-right text-[#374151] tabular-nums" style={{ fontSize: '16px' }}>
                              {w.expense_price > 0 ? fmt(w.expense_price) : <span className="text-[#d1d5db]">—</span>}
                            </td>
                            <td className="px-3 text-right font-semibold text-[#1e3a5f] tabular-nums" style={{ fontSize: '16px' }}>{fmt(w.total_price)}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ─ 기계경비총괄표 (equipment) ─ */}
          {sub === 'equipment' && (
            <div className="flex-1 overflow-auto p-4 sm:p-5">
              <div className="max-w-5xl mx-auto space-y-4">
                {mcLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : mcError ? (
                  <p className="text-center text-[#9ca3af] py-16" style={{ fontSize: '15px' }}>데이터를 불러올 수 없습니다</p>
                ) : (
                  <>
                    <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
                      <table className="w-full border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-[#f0f4f9] border-b border-[#e5e7eb]">
                            {['번호', '장비명', '규격', '단위', '노무비', '재료비', '경비', '합계(hr당)'].map((h) => (
                              <th key={h} className={`px-3 py-3 text-[#374151] font-medium ${['노무비','재료비','경비','합계(hr당)'].includes(h) ? 'text-right' : 'text-left'}`}
                                  style={{ fontSize: '16px' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {machineCosts.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="text-center py-12 text-[#9ca3af]">데이터가 없습니다</td>
                            </tr>
                          ) : (
                            machineCosts.map((m, i) => (
                              <tr key={m.id} className="border-b border-[#f3f4f6] hover:bg-[#f8fafc]" style={{ height: '48px' }}>
                                <td className="px-3 text-[#9ca3af]" style={{ fontSize: '16px' }}>{i + 1}</td>
                                <td className="px-3 text-[#111827] font-medium" style={{ fontSize: '16px' }}>{m.name}</td>
                                <td className="px-3 text-[#6b7280]" style={{ fontSize: '16px' }}>{m.spec}</td>
                                <td className="px-3 text-[#6b7280]" style={{ fontSize: '16px' }}>{m.unit}</td>
                                <td className="px-3 text-right text-[#374151] tabular-nums" style={{ fontSize: '16px' }}>
                                  {m.labor_price > 0 ? fmt(m.labor_price) : <span className="text-[#d1d5db]">—</span>}
                                </td>
                                <td className="px-3 text-right text-[#374151] tabular-nums" style={{ fontSize: '16px' }}>{fmt(m.material_price)}</td>
                                <td className="px-3 text-right text-[#374151] tabular-nums" style={{ fontSize: '16px' }}>{fmt(m.expense_price)}</td>
                                <td className="px-3 text-right font-semibold text-[#1e3a5f] tabular-nums" style={{ fontSize: '16px' }}>{fmt(m.total_price)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {machineCosts.length > 0 && (
                          <tfoot>
                            <tr className="bg-[#f0f4f9] border-t-2 border-[#1e3a5f]" style={{ height: '48px' }}>
                              <td className="px-3 font-semibold text-[#374151]" colSpan={4} style={{ fontSize: '16px' }}>합계</td>
                              <td className="px-3 text-right font-semibold text-[#374151] tabular-nums" style={{ fontSize: '16px' }}>
                                {fmt(machineCosts.reduce((s, m) => s + m.labor_price, 0))}
                              </td>
                              <td className="px-3 text-right font-semibold text-[#374151] tabular-nums" style={{ fontSize: '16px' }}>
                                {fmt(machineCosts.reduce((s, m) => s + m.material_price, 0))}
                              </td>
                              <td className="px-3 text-right font-semibold text-[#374151] tabular-nums" style={{ fontSize: '16px' }}>
                                {fmt(machineCosts.reduce((s, m) => s + m.expense_price, 0))}
                              </td>
                              <td className="px-3 text-right font-bold text-[#1e3a5f] tabular-nums" style={{ fontSize: '16px' }}>
                                {fmt(machineCosts.reduce((s, m) => s + m.total_price, 0))}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                    <p className="text-[#9ca3af] px-1" style={{ fontSize: '12px' }}>
                      경유 1,393원/ℓ · 휘발유 1,511원/ℓ · 달러 1,387.7원 (2025.9.1 기준) · 금액 소수 1미만 절하
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ─ 원가계산서 (costsheet) ─ */}
          {sub === 'costsheet' && (
            <div className="flex-1 overflow-auto p-4 sm:p-5">
              {items.length === 0 ? (
                <p className="text-center text-[#9ca3af] py-16" style={{ fontSize: '15px' }}>
                  내역서에 항목을 추가하면 원가계산서가 자동으로 계산됩니다.
                </p>
              ) : costSheet && (
                <div className="max-w-2xl mx-auto">
                  <table className="w-full bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-[#f0f4f9]">
                        <th className="px-4 py-3 text-left text-[#374151] font-medium" style={{ fontSize: '14px' }}>항목</th>
                        <th className="px-3 py-3 text-center text-[#374151] font-medium w-8" style={{ fontSize: '14px' }}>기호</th>
                        <th className="px-4 py-3 text-right text-[#374151] font-medium" style={{ fontSize: '14px' }}>금액 (원)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f3f4f6]">
                      <CostRow label="재료비" sym="A" value={costSheet.재료비} bold />
                      <CostRow label="직접노무비" sym="4" value={costSheet.직접노무비} />
                      <CostRow label="간접노무비" rate="직접노무비×16.5%" sym="5" value={costSheet.간접노무비} sub />
                      <CostRow label="노무비 소계" sym="B" value={costSheet.노무비소계} bold />
                      <CostRow label="직접경비" rate="" sym="6" value={totalExpense} sub />
                      <CostRow label="산재보험료" rate="노무비×3.56%" value={costSheet.상세.산재보험료} sub />
                      <CostRow label="고용보험료" rate="노무비×1.01%" value={costSheet.상세.고용보험료} sub />
                      <CostRow label="건강보험료" rate="직접노무비×3.595%" value={costSheet.상세.건강보험료} sub />
                      <CostRow label="연금보험료" rate="직접노무비×4.75%" value={costSheet.상세.연금보험료} sub />
                      <CostRow label="노인장기요양보험료" rate="건강보험료×13.14%" value={costSheet.상세.노인장기요양보험료} sub />
                      <CostRow label="퇴직공제부금비" rate="직접노무비×2.3%" value={costSheet.상세.퇴직공제부금비} sub />
                      <CostRow label="건설기계대여금" rate="(A+직접노무비+직접경비)×0.4%" value={costSheet.상세.건설기계대여금} sub />
                      <CostRow label="산업안전보건관리비" rate="×3.15%" value={costSheet.상세.산업안전보건관리비} sub />
                      <CostRow label="환경보전비" rate="×0.8%" value={costSheet.상세.환경보전비} sub />
                      <CostRow label="하도급대금지급보증" rate="×0.081%" value={costSheet.상세.하도급대금지급보증} sub />
                      <CostRow label="석면분담금" rate="노무비×0.006%" value={costSheet.상세.석면분담금} sub />
                      <CostRow label="임금채권부담금" rate="노무비×0.09%" value={costSheet.상세.임금채권부담금} sub />
                      <CostRow label="기타경비" rate="(A+B)×5.2%" value={costSheet.상세.기타경비} sub />
                      <CostRow label="경비 소계" sym="C" value={costSheet.경비소계} bold />
                      <CostRow label="순공사원가" rate="A+B+C" sym="D" value={costSheet.순공사원가} bold accent />
                      <CostRow label="일반관리비" rate="순공사원가×8%" sym="E" value={costSheet.일반관리비} />
                      <CostRow label="이윤" rate="(B+C+E)×15%" sym="F" value={costSheet.이윤} />
                      <CostRow label="총원가" rate="D+E+F" sym="G" value={costSheet.총원가} bold />
                      <CostRow label="부가가치세" rate="총원가×10%" sym="H" value={costSheet.부가가치세} />
                      <tr className="bg-[#1e3a5f]">
                        <td className="px-4 py-3.5 text-white font-semibold" style={{ fontSize: '15px' }}>최종 도급액</td>
                        <td className="px-3 py-3.5 text-center text-[#93c5fd] font-medium" style={{ fontSize: '13px' }}>I</td>
                        <td className="px-4 py-3.5 text-right text-white font-bold" style={{ fontSize: '17px' }}>
                          {fmt(costSheet.최종도급액)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── blueprint: 도면설계 ──────────────────────── */}
      {tab === 'blueprint' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 모바일 탭 전환 */}
          <div className="md:hidden flex border-b border-[#e5e7eb] bg-white flex-shrink-0">
            {(['chat', 'preview'] as const).map((v) => (
              <button key={v} onClick={() => setBpMobileView(v)}
                className={`flex-1 transition-colors border-b-2 -mb-px ${bpMobileView === v ? 'border-[#1e3a5f] text-[#1e3a5f] font-medium' : 'border-transparent text-[#6b7280]'}`}
                style={{ fontSize: '15px', minHeight: '44px' }}
              >
                {v === 'chat' ? 'AI 대화' : '도면 미리보기'}
              </button>
            ))}
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* 좌측: AI 대화 패널 (45%) */}
            <div
              className={`${bpMobileView === 'preview' ? 'hidden' : 'flex'} md:flex flex-col border-r border-[#e5e7eb] overflow-hidden w-full md:w-[45%] flex-shrink-0`}
            >
              {/* 채팅 헤더 */}
              <div className="bg-white border-b border-[#e5e7eb] px-4 py-3 flex items-start justify-between flex-shrink-0">
                <div>
                  <h2 className="font-semibold text-[#111827]" style={{ fontSize: '16px' }}>AI 도면 설계</h2>
                  <p className="text-[#9ca3af] mt-0.5" style={{ fontSize: '13px' }}>AI와 대화로 계통도를 자동 생성합니다</p>
                </div>
                <button
                  onClick={handleBpReset}
                  className="flex items-center gap-1.5 border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] px-3 flex-shrink-0"
                  style={{ height: '36px', fontSize: '13px' }}
                >
                  <RotateCcw size={12} /> 대화 초기화
                </button>
              </div>

              {/* 메시지 영역 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]">
                {bpMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] px-4 py-3 rounded-xl ${
                        msg.role === 'user'
                          ? 'bg-[#1e3a5f] text-white'
                          : 'bg-white border border-[#e5e7eb] text-[#111827]'
                      }`}
                      style={{ fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {bpLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[#6b7280]" style={{ fontSize: '14px' }}>설계 분석 중...</span>
                    </div>
                  </div>
                )}
                <div ref={bpEndRef} />
              </div>

              {/* 입력창 */}
              <div className="border-t border-[#e5e7eb] p-3 bg-white flex-shrink-0">
                <div className="flex gap-2">
                  <textarea
                    value={bpInput}
                    onChange={(e) => setBpInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleBpSend(); }
                    }}
                    placeholder="공사 내용을 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)"
                    disabled={bpLoading}
                    rows={2}
                    className="flex-1 border border-[#e5e7eb] rounded-lg px-3 py-2 text-[#111827] focus:outline-none focus:border-[#1e3a5f] resize-none disabled:opacity-50"
                    style={{ fontSize: '14px' }}
                  />
                  <button
                    onClick={handleBpSend}
                    disabled={bpLoading || !bpInput.trim()}
                    className="bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d5080] disabled:opacity-40 transition-colors flex items-center justify-center flex-shrink-0"
                    style={{ width: '48px', height: '72px' }}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* 우측: 도면 미리보기 패널 (55%) */}
            <div
              className={`${bpMobileView === 'chat' ? 'hidden' : 'flex'} md:flex flex-col flex-1 overflow-hidden`}
            >
              {/* 미리보기 헤더 */}
              <div className="bg-white border-b border-[#e5e7eb] px-4 flex items-center justify-between flex-shrink-0" style={{ minHeight: '56px' }}>
                <span className="font-medium text-[#111827]" style={{ fontSize: '16px' }}>도면 미리보기</span>
                {bpDrawingData && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBpDxf}
                      className="flex items-center gap-1.5 border border-[#e5e7eb] rounded-lg text-[#374151] hover:bg-[#f3f4f6] px-2.5"
                      style={{ height: '36px', fontSize: '12px' }}
                    >
                      <FileDown size={13} /> DXF
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 border border-[#e5e7eb] rounded-lg text-[#374151] hover:bg-[#f3f4f6] px-2.5"
                      style={{ height: '36px', fontSize: '12px' }}
                    >
                      <Download size={13} /> PDF
                    </button>
                    <button
                      onClick={handleBpEstimate}
                      className="flex items-center gap-1.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d5080] px-2.5"
                      style={{ height: '36px', fontSize: '12px' }}
                    >
                      <Link2 size={13} /> 견적 연동
                    </button>
                  </div>
                )}
              </div>

              {/* 계통도 / 자재집계표 탭 */}
              {bpDrawingData && (
                <div className="flex border-b border-[#e5e7eb] bg-white flex-shrink-0">
                  {(['diagram', 'materials'] as const).map((t) => (
                    <button key={t} onClick={() => setBpDrawingTab(t)}
                      className={`px-5 border-b-2 -mb-px transition-colors ${bpDrawingTab === t ? 'border-[#1e3a5f] text-[#1e3a5f] font-medium' : 'border-transparent text-[#6b7280]'}`}
                      style={{ fontSize: '14px', minHeight: '44px' }}
                    >
                      {t === 'diagram' ? '계통도' : '자재집계표'}
                    </button>
                  ))}
                </div>
              )}

              {/* 콘텐츠 */}
              <div className="flex-1 overflow-auto p-4">
                {!bpDrawingData ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <p className="text-[#9ca3af]" style={{ fontSize: '16px' }}>AI와 대화를 시작하면</p>
                      <p className="text-[#d1d5db]" style={{ fontSize: '14px' }}>계통도가 여기에 자동으로 표시됩니다</p>
                    </div>
                  </div>
                ) : bpDrawingTab === 'diagram' ? (
                  <DrawingCanvas data={bpDrawingData} />
                ) : (
                  <div>
                    {bpEstimateSuccess && (
                      <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                        <span className="text-green-800" style={{ fontSize: '14px' }}>견적 내역서에 자재가 추가되었습니다.</span>
                        <button
                          onClick={() => router.push(`/projects/${id}?tab=estimate&sub=ledger`)}
                          className="text-[#1e3a5f] underline"
                          style={{ fontSize: '14px' }}
                        >
                          내역서로 이동
                        </button>
                      </div>
                    )}
                    <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-[#f0f4f9] border-b border-[#e5e7eb]">
                            {['번호', '품명', '규격', '단위', '수량', '비고'].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-[#374151] font-medium" style={{ fontSize: '15px' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bpDrawingData.totalMaterials.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-10 text-[#9ca3af]">자재 정보가 없습니다</td>
                            </tr>
                          ) : (
                            bpDrawingData.totalMaterials.map((m, i) => (
                              <tr key={i} className="border-b border-[#f3f4f6] hover:bg-[#f8fafc]" style={{ height: '48px' }}>
                                <td className="px-4 text-[#9ca3af]" style={{ fontSize: '15px' }}>{i + 1}</td>
                                <td className="px-4 text-[#111827] font-medium" style={{ fontSize: '15px' }}>{m.name}</td>
                                <td className="px-4 text-[#6b7280]" style={{ fontSize: '15px' }}>{m.spec}</td>
                                <td className="px-4 text-[#6b7280]" style={{ fontSize: '15px' }}>{m.unit}</td>
                                <td className="px-4 text-[#374151] font-semibold" style={{ fontSize: '15px' }}>{m.qty}</td>
                                <td className="px-4 text-[#9ca3af]" style={{ fontSize: '15px' }}>—</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[#f0f4f9] border-t-2 border-[#1e3a5f]" style={{ height: '48px' }}>
                            <td className="px-4 font-semibold text-[#111827]" colSpan={4} style={{ fontSize: '15px' }}>합계</td>
                            <td className="px-4 font-bold text-[#1e3a5f]" style={{ fontSize: '15px' }}>
                              {bpDrawingData.totalMaterials.reduce((s, m) => s + m.qty, 0)}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleBpEstimate}
                        className="flex items-center gap-2 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d5080]"
                        style={{ height: '48px', fontSize: '15px', padding: '0 20px' }}
                      >
                        <Link2 size={16} /> 견적 연동 — 내역서에 자동 추가
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 작업 추가 모달 */}
      <AddWorkModal
        isOpen={isWorkModalOpen}
        onClose={() => { setIsWorkModalOpen(false); setEditingRecord(null); }}
        projectId={id}
        initialData={editingRecord ?? undefined}
        onSave={handleSaveWork}
      />

      {/* 수량 입력 모달 */}
      {selectedPrice && (
        <QuantityModal
          price={selectedPrice}
          onConfirm={(qty) => handleAddItem(selectedPrice, qty)}
          onClose={() => setSelectedPrice(null)}
        />
      )}
    </div>
  );
}
