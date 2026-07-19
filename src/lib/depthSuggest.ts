import type { ProjectType } from '@/types';

// KDS 매설 깊이 기준(CLAUDE.md) 기반 심도 자동 제안
// - 상수도 관경 900mm 이하: 최소 1.2m / 1,000mm 이상: 최소 1.5m
// - 하수도: 최소 흙두께 1m 원칙
// - 동결심도 고려는 현장값이므로 안전마진으로 반영

/** "D400" 같은 관경 문자열 → 숫자(mm) */
export function pipeDiameterMm(spec: string): number {
  const m = spec.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * 관경·프로젝트 종류 기준 권장 매설 심도(GL-, m).
 * type 미지정 시 상수도 기준으로 제안.
 */
export function suggestDepth(pipeSpec: string, type?: ProjectType): number {
  const d = pipeDiameterMm(pipeSpec);
  if (type === '하수도') {
    // 최소 흙두께 1m + 관 외경 여유 → 관경에 따라 1.0~1.5m
    if (d >= 1000) return 1.8;
    if (d >= 600) return 1.5;
    return 1.2;
  }
  // 상수도(기본)
  if (d >= 1000) return 1.5;
  return 1.2;
}
