'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EstimateItem, WorkTypeResult } from '@/types';
import { exportEstimateToExcel } from '@/lib/exportExcel';
import {
  ArrowLeft, Download, CheckCircle, X, Search, Sun, Moon,
  Plus, Trash2, ChevronDown, Calculator,
} from 'lucide-react';

function fmt(n: number) { return n.toLocaleString('ko-KR'); }

// ── 더미 초기 데이터 (id=1) ───────────────────────────
const DUMMY_ITEMS_1: EstimateItem[] = [
  {
    id: 'i1', estimate_id: '1', category: '배관공', work_name: 'KP매커니컬접합 Φ150mm',
    spec: 'Φ150mm', unit: '개소', quantity: 2, unit_price: 32941,
    labor_amount: 64592, material_amount: 0, expense_amount: 1290, total_amount: 65882,
    is_night: false, sort_order: 0,
  },
  {
    id: 'i2', estimate_id: '1', category: '배관공', work_name: 'KP매커니컬접합 Φ150mm',
    spec: 'Φ150mm', unit: '개소', quantity: 2, unit_price: 61200,
    labor_amount: 121110, material_amount: 0, expense_amount: 1290, total_amount: 122400,
    is_night: true, sort_order: 1,
  },
  {
    id: 'i3', estimate_id: '1', category: '배관공', work_name: '이탈방지접합 Φ150mm',
    spec: 'Φ150mm', unit: '개소', quantity: 10, unit_price: 42824,
    labor_amount: 419850, material_amount: 0, expense_amount: 8390, total_amount: 428240,
    is_night: false, sort_order: 2,
  },
  {
    id: 'i4', estimate_id: '1', category: '배관공', work_name: '이탈방지접합 Φ150mm',
    spec: 'Φ150mm', unit: '개소', quantity: 16, unit_price: 79561,
    labor_amount: 1259552, material_amount: 0, expense_amount: 13424, total_amount: 1272976,
    is_night: true, sort_order: 3,
  },
  {
    id: 'i5', estimate_id: '1', category: '배관공', work_name: '주철관절단 Φ150mm',
    spec: 'Φ150mm', unit: '개소', quantity: 6, unit_price: 24931,
    labor_amount: 142464, material_amount: 0, expense_amount: 7122, total_amount: 149586,
    is_night: false, sort_order: 4,
  },
];

const CATEGORIES = ['전체', '배관공', '토공', '터파기', '되메우기', '포장', '구조물공', '부대공'];

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
            <h3 className="font-medium text-[#111827] text-sm">
              {price.name}
              {price.is_night && <span className="ml-1.5 text-xs text-[#6b7280]">(야간)</span>}
            </h3>
            <p className="text-xs text-[#6b7280] mt-0.5">{price.spec} / {price.unit}</p>
          </div>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#6b7280]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6b7280]">단위단가</span>
            <span className="font-medium text-[#1e3a5f]">{fmt(price.unit_price)}원/{price.unit}</span>
          </div>

          <div>
            <label className="text-xs text-[#6b7280] mb-1 block">수량</label>
            <input
              type="number"
              min={0.001}
              step={0.001}
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#1e3a5f]"
            />
          </div>

          <div className="bg-[#f8fafc] rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[#9ca3af]">노무비</span>
              <span className="text-[#374151]">{fmt(labor)}원</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#9ca3af]">재료비</span>
              <span className="text-[#374151]">{fmt(material)}원</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#9ca3af]">경비 (공구손료)</span>
              <span className="text-[#374151]">{fmt(expense)}원</span>
            </div>
            <div className="flex justify-between text-sm font-medium pt-1.5 border-t border-[#e5e7eb]">
              <span className="text-[#374151]">예상 금액</span>
              <span className="text-[#1e3a5f]">{fmt(total)}원</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6]"
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(quantity)}
            disabled={!quantity || quantity <= 0}
            className="flex-1 py-2 text-sm bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d5080] disabled:opacity-40"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────
export default function EstimateDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params.id as string;
  const isNew   = id === 'new';

  const [estimateName, setEstimateName] = useState(
    isNew ? '새 견적서' : id === '1' ? '금고동 상수도 이설공 D150' : '문화동 오수관 신설공사'
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [status, setStatus] = useState<'draft' | 'confirmed'>(isNew ? 'draft' : id === '1' ? 'confirmed' : 'draft');
  const [items, setItems] = useState<EstimateItem[]>(isNew ? [] : id === '1' ? DUMMY_ITEMS_1 : []);

  // 검색 패널
  const [searchQuery, setSearchQuery]     = useState('');
  const [category, setCategory]           = useState('전체');
  const [isNightSearch, setIsNightSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<WorkTypeResult[]>([]);
  const [isSearching, setIsSearching]     = useState(false);

  const [selectedPrice, setSelectedPrice] = useState<WorkTypeResult | null>(null);
  const [activeTab, setActiveTab]         = useState<'table' | 'search'>('table');

  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (isEditingName) nameInputRef.current?.focus(); }, [isEditingName]);

  // 공종 검색 (night 토글 변경 시도 자동 재검색)
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

  // 공종 추가 — 품셈 계산된 단위단가 × 수량
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
    setActiveTab('table');
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

  // ── 검색 패널 ────────────────────────────────────────
  const searchPanel = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[#e5e7eb]">
        <h2 className="text-sm font-medium text-[#111827] mb-3">공종 추가 (품셈 기반)</h2>

        <div className="relative mb-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="공종명 또는 품셈코드 검색..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#1e3a5f]"
          />
        </div>

        {/* 주간/야간 — 토글 시 단가 자동 재계산 */}
        <div className="flex gap-1 mb-2">
          {[false, true].map((night) => (
            <button
              key={String(night)}
              onClick={() => setIsNightSearch(night)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg transition-colors ${
                isNightSearch === night
                  ? 'bg-[#1e3a5f] text-white'
                  : 'border border-[#e5e7eb] text-[#6b7280] hover:bg-[#f3f4f6]'
              }`}
            >
              {night ? <><Moon size={12} /> 야간</> : <><Sun size={12} /> 주간</>}
            </button>
          ))}
        </div>

        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full text-xs border border-[#e5e7eb] rounded-lg px-3 py-2 text-[#374151] appearance-none focus:outline-none focus:border-[#1e3a5f]"
          >
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          <p className="text-center text-xs text-[#9ca3af] py-8">검색 중...</p>
        ) : searchResults.length === 0 ? (
          <p className="text-center text-xs text-[#9ca3af] py-8">검색 결과가 없습니다</p>
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
                    <p className="text-xs font-medium text-[#111827] truncate">{wt.name}</p>
                    <p className="text-xs text-[#9ca3af] mt-0.5">
                      {wt.spec} / {wt.unit}
                      <span className="ml-1.5 text-[#d1d5db]">|</span>
                      <span className="ml-1.5">노무 {fmt(wt.labor_price)} + 경비 {fmt(wt.expense_price)}</span>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-[#1e3a5f]">{fmt(wt.unit_price)}원</p>
                    <p className="text-xs text-[#9ca3af]">/{wt.unit}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── 내역서 테이블 ─────────────────────────────────────
  const tablePanel = (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-xs border-collapse min-w-[700px]">
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
              <td colSpan={12} className="text-center py-12 text-[#9ca3af]">
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
              <td className="px-2 py-2.5 font-bold text-[#1e3a5f] text-sm">{fmt(totalAmount)}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );

  return (
    <div className="flex flex-col h-screen">
      {/* 헤더 */}
      <header className="h-14 bg-white border-b border-[#e5e7eb] flex items-center px-4 gap-3 flex-shrink-0">
        <button
          onClick={() => router.push('/estimate')}
          className="p-1.5 rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        {isEditingName ? (
          <input
            ref={nameInputRef}
            value={estimateName}
            onChange={(e) => setEstimateName(e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
            className="flex-1 text-base font-medium text-[#111827] border-b border-[#1e3a5f] focus:outline-none bg-transparent"
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="flex-1 text-left text-base font-medium text-[#111827] hover:text-[#1e3a5f] transition-colors truncate"
          >
            {estimateName}
          </button>
        )}

        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
          status === 'confirmed' ? 'bg-[#dbeafe] text-[#1e40af]' : 'bg-[#f3f4f6] text-[#6b7280]'
        }`}>
          {status === 'confirmed' ? '확정' : '작성중'}
        </span>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {
              const p = new URLSearchParams({
                labor: String(totalLabor), material: String(totalMaterial),
                expense: String(totalExpense), name: estimateName,
              });
              router.push(`/estimate/${id}/cost?${p}`);
            }}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[#e5e7eb] rounded-lg text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-40 transition-colors"
          >
            <Calculator size={13} /> 원가계산서
          </button>
          <button
            onClick={() => exportEstimateToExcel({ estimateName, items })}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[#e5e7eb] rounded-lg text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-40 transition-colors"
          >
            <Download size={13} /> 엑셀 출력
          </button>
          {status === 'draft' && (
            <button
              onClick={() => setStatus('confirmed')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d5080] transition-colors"
            >
              <CheckCircle size={13} /> 확정
            </button>
          )}
        </div>
      </header>

      {/* 모바일 탭 */}
      <div className="md:hidden flex border-b border-[#e5e7eb] bg-white flex-shrink-0">
        {(['table', 'search'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
              activeTab === tab ? 'border-[#1e3a5f] text-[#1e3a5f] font-medium' : 'border-transparent text-[#6b7280]'
            }`}>
            {tab === 'table' ? '내역서' : '공종추가'}
          </button>
        ))}
      </div>

      {/* 본문 */}
      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 flex flex-col overflow-hidden ${activeTab === 'search' ? 'hidden md:flex' : 'flex'}`}>
          {tablePanel}
          <div className="border-t border-[#e5e7eb] p-3 flex-shrink-0">
            <button onClick={() => setActiveTab('search')}
              className="flex items-center gap-1.5 text-xs text-[#6b7280] hover:text-[#1e3a5f] transition-colors md:hidden">
              <Plus size={13} /> 공종 추가
            </button>
          </div>
        </div>

        <div className={`w-full md:w-[40%] md:max-w-sm border-l border-[#e5e7eb] flex flex-col overflow-hidden ${
          activeTab === 'table' ? 'hidden md:flex' : 'flex'
        }`}>
          {searchPanel}
        </div>
      </div>

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
