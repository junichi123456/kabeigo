import type { Cell } from '../logic/types';

export const MOVE_DURATION_MS = 800;
export const WALL_RISE_MS = 250;
export const WALL_BREAK_MS = 300;
export const PLACE_DROP_MS = 300;
export const TURN_BANNER_MS = 900;
export const HOP_HEIGHT = 0.15;

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
export function easeOutQuad(t: number): number { const x = clamp01(t); return 1 - (1 - x) * (1 - x); }
export function easeOutBack(t: number): number {
  const x = clamp01(t), c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/** points: セル座標の折れ線。t∈[0,1] → セル座標系の位置と跳ね高さ。移動全体を 1 回のイージングで進める(D-11) */
export function samplePath(points: Cell[], t: number): { x: number; y: number; hop: number } {
  const L = points.length - 1;
  if (L <= 0) { const p = points[0] ?? { x: 0, y: 0 }; return { x: p.x, y: p.y, hop: 0 }; }
  const s = easeInOutCubic(t) * L;
  const seg = Math.min(Math.floor(s), L - 1);
  const f = s - seg;
  const a = points[seg]!, b = points[seg + 1]!;
  const frac = s - Math.floor(s);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, hop: HOP_HEIGHT * Math.sin(Math.PI * frac) };
}

/** 折れ線上の進行距離 s(0..L) */
export function pathDistance(points: Cell[], t: number): number {
  return easeInOutCubic(t) * (points.length - 1);
}
