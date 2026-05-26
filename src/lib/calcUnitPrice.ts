import { WorkComponent } from '@/types';

// 2025년 하반기 고시 노임단가 (labor_wages 테이블 미연결 시 폴백)
export const DEFAULT_LABOR_WAGES: Record<string, number> = {
  '배관공(수도)':    237446,
  '보통인부':        171037,
  '건설기계운전사':  279824,
  '특별인부':        224490,
  '일반기계운전사':  172387,
  '콘크리트공':      271064,
  '포장공':          270747,
  '화물차운전사':    218549,
};

export interface UnitPriceResult {
  labor: number;
  material: number;
  expense: number;
  total: number;
}

/**
 * 품셈 기반 일위대가 단가 계산
 * - 인력 노무비 = Σ(품 수량 × 노임단가)
 * - 공구손료 = 노무비 × expense_rate%
 * - 야간할증 = 노무비 × 87.5% (손료 계산 후 가산)
 */
export function calcUnitPrice(
  components: WorkComponent[],
  expenseRate: number,
  expenseBase: string,
  isNight: boolean,
  laborWages: Record<string, number> = DEFAULT_LABOR_WAGES,
  nightSurcharge: number = 87.5,
): UnitPriceResult {
  let laborRaw = 0;
  let material = 0;

  for (const comp of components) {
    if (comp.component_type === 'labor') {
      const wage = laborWages[comp.component_name] ?? 0;
      laborRaw += comp.quantity * wage;
    }
    if (comp.component_type === 'material') {
      // 재료 단가는 별도 관리 — 현재는 0 처리
      material += 0;
    }
  }

  // 항목별 반올림 없이 합산 후 한 번만 버림 (분산 오차 방지)
  const labor = Math.floor(laborRaw);

  // 공구손료 → 재료비로 분류 (별도 장비 없을 때 경비=0)
  const expenseBase_ = expenseBase === 'labor' ? labor : labor + material;
  material += Math.floor(expenseBase_ * (expenseRate / 100));
  const expense = 0;

  // 야간할증: 공구손료 계산 후 노무비에 가산
  const nightAdd = isNight ? Math.floor(labor * (nightSurcharge / 100)) : 0;
  const finalLabor = labor + nightAdd;

  return {
    labor: finalLabor,
    material,
    expense,
    total: finalLabor + material + expense,
  };
}
