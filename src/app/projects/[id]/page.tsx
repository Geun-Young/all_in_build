'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EstimateItem, WorkTypeResult, Project, WorkRecord } from '@/types';
import { exportEstimateToExcel } from '@/lib/exportExcel';
import Badge from '@/components/ui/Badge';
import AddWorkModal, { WorkFormData } from '@/components/features/AddWorkModal';
import {
  ChevronLeft, Plus, MoreHorizontal,
  Download, CheckCircle, X, Search, Sun, Moon,
  Trash2, ChevronDown,
} from 'lucide-react';

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

// ── 메인 페이지 ──────────────────────────────────────
type MainTab = '공사현장' | '견적관리' | '도면설계';

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: '공사현장', label: '📸 공사현장' },
  { key: '견적관리', label: '💰 견적관리' },
  { key: '도면설계', label: '📐 도면설계' },
];

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const project = DUMMY_PROJECTS.find((p) => p.id === id);

  // ── 탭 상태 ─
  const [activeTab, setActiveTab] = useState<MainTab>('공사현장');

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

  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (isEditingName) nameInputRef.current?.focus(); }, [isEditingName]);

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

  return (
    <div className="flex flex-col h-screen" onClick={() => setOpenWorkMenuId(null)}>
      {/* 헤더 */}
      <header className="bg-white border-b border-[#e5e7eb] flex items-center px-4 gap-3 flex-shrink-0" style={{ height: '64px' }}>
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

      {/* 3탭 네비게이션 */}
      <div className="bg-white border-b border-[#e5e7eb] flex flex-shrink-0">
        {MAIN_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === key
                ? 'border-[#1e3a5f] text-[#1e3a5f]'
                : 'border-transparent text-[#6b7280] hover:text-[#374151]'
            }`}
            style={{ fontSize: '16px', minHeight: '52px' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── 탭 1: 공사현장 ───────────────────────────── */}
      {activeTab === '공사현장' && (
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 기본정보 카드 */}
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

          {/* 작업 추가 버튼 */}
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

          {/* 작업 기록 */}
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

      {/* ─── 탭 2: 견적관리 ───────────────────────────── */}
      {activeTab === '견적관리' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 견적 헤더 바 */}
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
          </div>

          {/* 모바일 서브탭 */}
          <div className="md:hidden flex border-b border-[#e5e7eb] bg-white flex-shrink-0">
            {(['table', 'search'] as const).map((tab) => (
              <button key={tab} onClick={() => setEstimateSubTab(tab)}
                className={`flex-1 transition-colors border-b-2 -mb-px ${
                  estimateSubTab === tab ? 'border-[#1e3a5f] text-[#1e3a5f] font-medium' : 'border-transparent text-[#6b7280]'
                }`}
                style={{ fontSize: '15px', minHeight: '44px' }}
              >
                {tab === 'table' ? '내역서' : '공종추가'}
              </button>
            ))}
          </div>

          {/* 본문 */}
          <div className="flex-1 flex overflow-hidden">
            {/* 내역서 테이블 */}
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
                        const subLabor    = groupItems.reduce((s, i) => s + i.labor_amount,    0);
                        const subMaterial = groupItems.reduce((s, i) => s + i.material_amount, 0);
                        const subExpense  = groupItems.reduce((s, i) => s + i.expense_amount,  0);
                        const subTotal    = groupItems.reduce((s, i) => s + i.total_amount,    0);
                        return [
                          <tr key={`g-${cat}`} className="bg-[#f0f4f9] border-y border-[#e5e7eb]">
                            <td className="pl-4 py-2 font-medium text-[#374151]" colSpan={7}>[{cat}]</td>
                            <td className="px-2 py-2 text-[#374151]">{fmt(subLabor)}</td>
                            <td className="px-2 py-2 text-[#374151]">{fmt(subMaterial)}</td>
                            <td className="px-2 py-2 text-[#374151]">{fmt(subExpense)}</td>
                            <td className="px-2 py-2 font-medium text-[#1e3a5f]">{fmt(subTotal)}</td>
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
        </div>
      )}

      {/* ─── 탭 3: 도면설계 ───────────────────────────── */}
      {activeTab === '도면설계' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-[#9ca3af]" style={{ fontSize: '18px' }}>도면설계 기능 준비 중입니다</p>
            <p className="text-[#d1d5db]" style={{ fontSize: '15px' }}>DXF 도면 작성 및 AI 설계 지원</p>
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
