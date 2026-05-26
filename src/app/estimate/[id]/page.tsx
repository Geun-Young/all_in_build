'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EstimateItem, StandardPrice } from '@/types';
import { exportEstimateToExcel } from '@/lib/exportExcel';
import {
  ArrowLeft, Download, CheckCircle, X, Search, Sun, Moon,
  Plus, Trash2, ChevronDown,
} from 'lucide-react';

// ── 계산 ──────────────────────────────────────────────
function calcAmounts(unitPrice: number, laborRatio: number, quantity: number) {
  const total = Math.round(unitPrice * quantity);
  const labor = Math.round(total * (laborRatio / 100));
  const materialAndExpense = total - labor;
  const expense = Math.round(materialAndExpense * 0.2);
  const material = materialAndExpense - expense;
  return { labor, material, expense, total };
}

function fmt(n: number) { return n.toLocaleString('ko-KR'); }

// ── 더미 초기 데이터 (id=1 용) ─────────────────────────
const DUMMY_ITEMS_1: EstimateItem[] = [
  {
    id: 'i1', estimate_id: '1', category: '터파기', work_name: '터파기 (보통토)',
    spec: 'D150', unit: 'm³', quantity: 45, unit_price: 15000,
    labor_amount: 472500, material_amount: 101250, expense_amount: 33750, total_amount: 607500,
    is_night: false, sort_order: 0,
  },
  {
    id: 'i2', estimate_id: '1', category: '배관공', work_name: 'DCIP 이음 (소켓형) D150',
    spec: 'D150', unit: 'm', quantity: 80, unit_price: 28000,
    labor_amount: 1344000, material_amount: 716800, expense_amount: 179200, total_amount: 2240000,
    is_night: false, sort_order: 1,
  },
  {
    id: 'i3', estimate_id: '1', category: '배관공', work_name: '제수밸브 설치 D150',
    spec: 'D150', unit: '개소', quantity: 2, unit_price: 180000,
    labor_amount: 234000, material_amount: 124800, expense_amount: 31200, total_amount: 390000,
    is_night: false, sort_order: 2,
  },
  {
    id: 'i4', estimate_id: '1', category: '되메우기', work_name: '되메우기 (다짐)',
    spec: '-', unit: 'm³', quantity: 40, unit_price: 8000,
    labor_amount: 240000, material_amount: 64000, expense_amount: 16000, total_amount: 320000,
    is_night: false, sort_order: 3,
  },
];

const CATEGORIES = ['전체', '터파기', '배관공', '되메우기', '포장', '하수관', '주철관', '거푸집', '콘크리트타설', '구조물공'];

// ── 수량 입력 모달 ──────────────────────────────────────
interface QuantityModalProps {
  price: StandardPrice;
  onConfirm: (quantity: number, isNight: boolean) => void;
  onClose: () => void;
}

function QuantityModal({ price, onConfirm, onClose }: QuantityModalProps) {
  const [quantity, setQuantity] = useState(1);
  const amounts = calcAmounts(price.unit_price, price.labor_ratio, quantity);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-medium text-[#111827] text-sm">{price.work_name}</h3>
            <p className="text-xs text-[#6b7280] mt-0.5">{price.spec} / {price.unit}</p>
          </div>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#6b7280]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6b7280]">단가</span>
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
              <span className="text-[#374151]">{fmt(amounts.labor)}원</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#9ca3af]">재료비</span>
              <span className="text-[#374151]">{fmt(amounts.material)}원</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#9ca3af]">경비</span>
              <span className="text-[#374151]">{fmt(amounts.expense)}원</span>
            </div>
            <div className="flex justify-between text-sm font-medium pt-1.5 border-t border-[#e5e7eb]">
              <span className="text-[#374151]">예상 금액</span>
              <span className="text-[#1e3a5f]">{fmt(amounts.total)}원</span>
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
            onClick={() => onConfirm(quantity, price.is_night)}
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

// ── 메인 페이지 ─────────────────────────────────────────
export default function EstimateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === 'new';

  const [estimateName, setEstimateName] = useState(
    isNew ? '새 견적서' : id === '1' ? '금고동 상수도 이설공 D150' : '문화동 오수관 신설공사'
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [status, setStatus] = useState<'draft' | 'confirmed'>(isNew ? 'draft' : id === '1' ? 'confirmed' : 'draft');
  const [items, setItems] = useState<EstimateItem[]>(isNew ? [] : id === '1' ? DUMMY_ITEMS_1 : []);

  // 공종 검색 패널
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [isNightSearch, setIsNightSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<StandardPrice[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 수량 모달
  const [selectedPrice, setSelectedPrice] = useState<StandardPrice | null>(null);

  // 모바일 탭
  const [activeTab, setActiveTab] = useState<'table' | 'search'>('table');

  // 인라인 이름 편집
  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isEditingName) nameInputRef.current?.focus();
  }, [isEditingName]);

  // 공종 검색
  const doSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams({ q: searchQuery, category, night: String(isNightSearch) });
      const res = await fetch(`/api/estimate/search?${params}`);
      const data = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, category, isNightSearch]);

  useEffect(() => {
    const timer = setTimeout(doSearch, 300);
    return () => clearTimeout(timer);
  }, [doSearch]);

  // 공종 추가
  function handleAddItem(price: StandardPrice, quantity: number, isNight: boolean) {
    const amounts = calcAmounts(price.unit_price, price.labor_ratio, quantity);
    const newItem: EstimateItem = {
      id: `item-${Date.now()}`,
      estimate_id: id,
      category: price.category,
      work_name: price.work_name,
      spec: price.spec,
      unit: price.unit,
      quantity,
      unit_price: price.unit_price,
      labor_amount: amounts.labor,
      material_amount: amounts.material,
      expense_amount: amounts.expense,
      total_amount: amounts.total,
      is_night: isNight,
      sort_order: items.length,
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedPrice(null);
    setActiveTab('table');
  }

  function handleDeleteItem(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  // 합계
  const totalLabor = items.reduce((s, i) => s + i.labor_amount, 0);
  const totalMaterial = items.reduce((s, i) => s + i.material_amount, 0);
  const totalExpense = items.reduce((s, i) => s + i.expense_amount, 0);
  const totalAmount = totalLabor + totalMaterial + totalExpense;

  // 공종별 그룹핑
  const groups = items.reduce<Record<string, EstimateItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  function handleExcel() {
    exportEstimateToExcel({ estimateName, items });
  }

  async function handleConfirm() {
    setStatus('confirmed');
  }

  // ── 렌더 ──
  const searchPanel = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[#e5e7eb]">
        <h2 className="text-sm font-medium text-[#111827] mb-3">공종 추가</h2>

        {/* 검색창 */}
        <div className="relative mb-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="공종명 또는 코드 검색..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#1e3a5f]"
          />
        </div>

        {/* 주간/야간 토글 */}
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => setIsNightSearch(false)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg transition-colors ${
              !isNightSearch ? 'bg-[#1e3a5f] text-white' : 'border border-[#e5e7eb] text-[#6b7280] hover:bg-[#f3f4f6]'
            }`}
          >
            <Sun size={12} /> 주간
          </button>
          <button
            onClick={() => setIsNightSearch(true)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg transition-colors ${
              isNightSearch ? 'bg-[#1e3a5f] text-white' : 'border border-[#e5e7eb] text-[#6b7280] hover:bg-[#f3f4f6]'
            }`}
          >
            <Moon size={12} /> 야간
          </button>
        </div>

        {/* 카테고리 필터 */}
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

      {/* 검색 결과 */}
      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          <p className="text-center text-xs text-[#9ca3af] py-8">검색 중...</p>
        ) : searchResults.length === 0 ? (
          <p className="text-center text-xs text-[#9ca3af] py-8">검색 결과가 없습니다</p>
        ) : (
          <div className="divide-y divide-[#f3f4f6]">
            {searchResults.map((price) => (
              <button
                key={price.id}
                onClick={() => setSelectedPrice(price)}
                className="w-full text-left px-4 py-3 hover:bg-[#f8fafc] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#111827] truncate">{price.work_name}</p>
                    <p className="text-xs text-[#9ca3af] mt-0.5">{price.spec} / {price.unit}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-[#1e3a5f]">{fmt(price.unit_price)}원</p>
                    <p className="text-xs text-[#9ca3af]">/{price.unit}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

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
              const subLabor = groupItems.reduce((s, i) => s + i.labor_amount, 0);
              const subMaterial = groupItems.reduce((s, i) => s + i.material_amount, 0);
              const subExpense = groupItems.reduce((s, i) => s + i.expense_amount, 0);
              const subTotal = groupItems.reduce((s, i) => s + i.total_amount, 0);
              return [
                // 공종 그룹 헤더
                <tr key={`group-${cat}`} className="bg-[#f0f4f9] border-y border-[#e5e7eb]">
                  <td className="pl-4 py-2 font-medium text-[#374151]" colSpan={7}>[{cat}]</td>
                  <td className="px-2 py-2 text-[#374151]">{fmt(subLabor)}</td>
                  <td className="px-2 py-2 text-[#374151]">{fmt(subMaterial)}</td>
                  <td className="px-2 py-2 text-[#374151]">{fmt(subExpense)}</td>
                  <td className="px-2 py-2 font-medium text-[#1e3a5f]">{fmt(subTotal)}</td>
                  <td />
                </tr>,
                // 데이터 행
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
      {/* 상단 헤더 */}
      <header className="h-14 bg-white border-b border-[#e5e7eb] flex items-center px-4 gap-3 flex-shrink-0">
        <button
          onClick={() => router.push('/estimate')}
          className="p-1.5 rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        {/* 인라인 이름 편집 */}
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

        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
            status === 'confirmed' ? 'bg-[#dbeafe] text-[#1e40af]' : 'bg-[#f3f4f6] text-[#6b7280]'
          }`}
        >
          {status === 'confirmed' ? '확정' : '작성중'}
        </span>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleExcel}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[#e5e7eb] rounded-lg text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-40 transition-colors"
          >
            <Download size={13} />
            엑셀 출력
          </button>
          {status === 'draft' && (
            <button
              onClick={handleConfirm}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d5080] transition-colors"
            >
              <CheckCircle size={13} />
              확정
            </button>
          )}
        </div>
      </header>

      {/* 모바일 탭 (768px 미만) */}
      <div className="md:hidden flex border-b border-[#e5e7eb] bg-white flex-shrink-0">
        {(['table', 'search'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-[#1e3a5f] text-[#1e3a5f] font-medium'
                : 'border-transparent text-[#6b7280]'
            }`}
          >
            {tab === 'table' ? '내역서' : '공종추가'}
          </button>
        ))}
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 데스크톱: 좌우 분할 / 모바일: 탭 */}
        <div className={`flex-1 flex flex-col overflow-hidden ${activeTab === 'search' ? 'hidden md:flex' : 'flex'}`}>
          {tablePanel}

          {/* 공종 추가 버튼 */}
          <div className="border-t border-[#e5e7eb] p-3 flex-shrink-0">
            <button
              onClick={() => setActiveTab('search')}
              className="flex items-center gap-1.5 text-xs text-[#6b7280] hover:text-[#1e3a5f] transition-colors md:hidden"
            >
              <Plus size={13} /> 공종 추가
            </button>
          </div>
        </div>

        {/* 우측 검색 패널 (데스크톱 고정, 모바일 탭) */}
        <div
          className={`w-full md:w-[40%] md:max-w-sm border-l border-[#e5e7eb] flex flex-col overflow-hidden ${
            activeTab === 'table' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {searchPanel}
        </div>
      </div>

      {/* 수량 입력 모달 */}
      {selectedPrice && (
        <QuantityModal
          price={selectedPrice}
          onConfirm={(qty, night) => handleAddItem(selectedPrice, qty, night)}
          onClose={() => setSelectedPrice(null)}
        />
      )}
    </div>
  );
}
