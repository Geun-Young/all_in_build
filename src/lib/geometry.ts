// 폴리라인(경로) 기하 헬퍼
// 좌표는 캔버스 비율(0~100). t 는 경로 누적 길이 비율(0~1).

export type Pt = { x: number; y: number };

function dist(a: Pt, b: Pt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** 경로 전체 길이(비율 좌표 단위) */
export function pathLength(verts: Pt[]): number {
  let len = 0;
  for (let i = 1; i < verts.length; i++) len += dist(verts[i - 1], verts[i]);
  return len;
}

/** 각 꼭짓점까지의 누적 길이 배열 */
function cumLengths(verts: Pt[]): number[] {
  const cum = [0];
  for (let i = 1; i < verts.length; i++) cum.push(cum[i - 1] + dist(verts[i - 1], verts[i]));
  return cum;
}

/** t(0~1) 위치의 좌표 */
export function pointAt(verts: Pt[], t: number): Pt {
  if (verts.length === 0) return { x: 0, y: 0 };
  if (verts.length === 1) return verts[0];
  const total = pathLength(verts);
  if (total === 0) return verts[0];
  const target = Math.max(0, Math.min(1, t)) * total;
  const cum = cumLengths(verts);
  for (let i = 1; i < verts.length; i++) {
    if (target <= cum[i] || i === verts.length - 1) {
      const segLen = cum[i] - cum[i - 1];
      const f = segLen === 0 ? 0 : (target - cum[i - 1]) / segLen;
      return {
        x: verts[i - 1].x + (verts[i].x - verts[i - 1].x) * f,
        y: verts[i - 1].y + (verts[i].y - verts[i - 1].y) * f,
      };
    }
  }
  return verts[verts.length - 1];
}

/** 점 p 를 경로 위로 투영했을 때 가장 가까운 t (스냅용) */
export function nearestT(verts: Pt[], p: Pt): number {
  if (verts.length < 2) return 0;
  const total = pathLength(verts);
  if (total === 0) return 0;
  const cum = cumLengths(verts);
  let best = { d: Infinity, t: 0 };
  for (let i = 1; i < verts.length; i++) {
    const a = verts[i - 1];
    const b = verts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segLen2 = dx * dx + dy * dy;
    let f = segLen2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / segLen2;
    f = Math.max(0, Math.min(1, f));
    const proj = { x: a.x + dx * f, y: a.y + dy * f };
    const d = dist(p, proj);
    if (d < best.d) {
      const lenAlong = cum[i - 1] + dist(a, proj);
      best = { d, t: lenAlong / total };
    }
  }
  return best.t;
}

/** 두 t 사이의 경로 실길이(비율 좌표 단위) */
export function lengthBetween(verts: Pt[], t0: number, t1: number): number {
  return Math.abs(t1 - t0) * pathLength(verts);
}
