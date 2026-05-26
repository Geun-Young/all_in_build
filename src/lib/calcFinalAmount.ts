export interface CostSheetResult {
  재료비: number;
  직접노무비: number;
  간접노무비: number;
  노무비소계: number;
  경비소계: number;
  순공사원가: number;
  일반관리비: number;
  이윤: number;
  총원가: number;
  부가가치세: number;
  최종도급액: number;
  상세: {
    산재보험료: number;
    고용보험료: number;
    건강보험료: number;
    연금보험료: number;
    노인장기요양보험료: number;
    퇴직공제부금비: number;
    건설기계대여금: number;
    산업안전보건관리비: number;
    환경보전비: number;
    하도급대금지급보증: number;
    석면분담금: number;
    임금채권부담금: number;
    기타경비: number;
  };
}

export function calcFinalAmount(
  directMaterial: number,
  directLabor: number,
  directExpense: number
): CostSheetResult {
  const A = directMaterial;
  const labor_direct = directLabor;

  // 간접노무비 = 직접노무비 × 16.5%
  const labor_indirect = Math.round(labor_direct * 0.165);
  const B = labor_direct + labor_indirect;

  const expense_direct = directExpense;

  // 보험료/부담금 — 적용 기준이 각기 다름
  const 산재보험료        = Math.round(B * 0.0356);
  const 고용보험료        = Math.round(B * 0.0101);
  const 건강보험료        = Math.round(labor_direct * 0.03595);   // 직접노무비 기준
  const 연금보험료        = Math.round(labor_direct * 0.0475);    // 직접노무비 기준
  const 노인장기요양보험료 = Math.round(건강보험료 * 0.1314);      // 건강보험료 기준
  const 퇴직공제부금비    = Math.round(labor_direct * 0.023);     // 직접노무비 기준
  const base_ALE          = A + labor_direct + expense_direct;    // A + 직접노무비 + 직접경비
  const 건설기계대여금    = Math.round(base_ALE * 0.004);
  const 산업안전보건관리비 = Math.round(base_ALE * 0.0315);
  const 환경보전비        = Math.round(base_ALE * 0.008);
  const 하도급대금지급보증 = Math.round(base_ALE * 0.00081);
  const 석면분담금        = Math.round(B * 0.00006);
  const 임금채권부담금    = Math.round(B * 0.0009);
  const 기타경비          = Math.round((A + B) * 0.052);          // (A + B) 기준

  const C = expense_direct + 산재보험료 + 고용보험료 + 건강보험료
    + 연금보험료 + 노인장기요양보험료 + 퇴직공제부금비
    + 건설기계대여금 + 산업안전보건관리비 + 환경보전비
    + 하도급대금지급보증 + 석면분담금 + 임금채권부담금 + 기타경비;

  const D = A + B + C;
  const E = Math.round(D * 0.08);

  // 이윤 = (노무비 + 경비 + 관리비) × 15% — 재료비 제외
  const F = Math.round((B + C + E) * 0.15);

  const G = D + E + F;
  const H = Math.round(G * 0.10);
  const I = G + H;

  return {
    재료비: A,
    직접노무비: labor_direct,
    간접노무비: labor_indirect,
    노무비소계: B,
    경비소계: C,
    순공사원가: D,
    일반관리비: E,
    이윤: F,
    총원가: G,
    부가가치세: H,
    최종도급액: I,
    상세: {
      산재보험료, 고용보험료, 건강보험료, 연금보험료,
      노인장기요양보험료, 퇴직공제부금비, 건설기계대여금,
      산업안전보건관리비, 환경보전비, 하도급대금지급보증,
      석면분담금, 임금채권부담금, 기타경비,
    },
  };
}
