/** タップ判定(three に依存しない純粋関数。単体テスト対象)。座標はワールド XZ(セル中心 = (x-4, y-4))。 */
import type { Cell, Edge } from '../logic/types';

/** タップとみなす指の移動量(px)。マウスは正確なので小さく、タッチ・ペンは大きめに許容する。 */
export const TAP_SLOP_MOUSE = 10;
export const TAP_SLOP_TOUCH = 16;
/** 移動先・駒へのスナップ半径(セル単位)。隣マスとの境界付近のタップも候補に吸着させる。 */
export const CELL_SNAP_RADIUS = 0.75;
/** 壁候補辺へのスナップ半径(旧 0.9)。駒の周囲ならおおよそどこをタップしても最寄りの辺が選ばれる。 */
export const EDGE_SNAP_RADIUS = 1.3;

export type XZ = { x: number; z: number };

export function tapSlop(pointerType: string): number {
  return pointerType === 'mouse' ? TAP_SLOP_MOUSE : TAP_SLOP_TOUCH;
}
export function isTap(dx: number, dy: number, pointerType: string): boolean {
  return Math.hypot(dx, dy) <= tapSlop(pointerType);
}

export const cellCenter = (c: Cell): XZ => ({ x: c.x - 4, z: c.y - 4 });
export const edgeMid = (e: Edge): XZ => (e.o === 'H' ? { x: e.x - 4, z: e.y - 4 + 0.5 } : { x: e.x - 4 + 0.5, z: e.y - 4 });
export const cellOf = (g: XZ): Cell => ({ x: Math.floor(g.x + 4.5), y: Math.floor(g.z + 4.5) });

/** 候補セルへ吸着: タップ位置を含むセルが候補ならそれ、なければ半径内で最も近い候補。なければ null。 */
export function snapCell(g: XZ, candidates: Cell[], radius = CELL_SNAP_RADIUS): Cell | null {
  const here = cellOf(g);
  const exact = candidates.find((c) => c.x === here.x && c.y === here.y);
  if (exact) return exact;
  let best: Cell | null = null, bd = Infinity;
  for (const c of candidates) {
    const m = cellCenter(c);
    const d = Math.hypot(m.x - g.x, m.z - g.z);
    if (d <= radius && d < bd) { bd = d; best = c; } // 同距離は列挙順で先のもの
  }
  return best;
}

export function nearestEdgeTo(g: XZ, edges: Edge[], radius = EDGE_SNAP_RADIUS): Edge | null {
  let best: Edge | null = null, bd = Infinity;
  for (const e of edges) {
    const m = edgeMid(e);
    const d = Math.hypot(m.x - g.x, m.z - g.z);
    if (d <= radius && d < bd) { bd = d; best = e; } // 同距離は列挙順(N,E,S,W)で先のもの
  }
  return best;
}
