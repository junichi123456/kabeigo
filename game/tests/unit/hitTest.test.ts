import { describe, expect, it } from 'vitest';
import { CELL_SNAP_RADIUS, EDGE_SNAP_RADIUS, TAP_SLOP_MOUSE, TAP_SLOP_TOUCH, isTap, nearestEdgeTo, snapCell, cellCenter, edgeMid } from '../../src/app/hitTest';

const at = (x: number, y: number, dx = 0, dz = 0) => ({ x: cellCenter({ x, y }).x + dx, z: cellCenter({ x, y }).z + dz });

describe('tap slop', () => {
  it('touch tolerates more finger drift than mouse', () => {
    expect(TAP_SLOP_TOUCH).toBeGreaterThan(TAP_SLOP_MOUSE);
    expect(isTap(12, 0, 'mouse')).toBe(false);
    expect(isTap(12, 0, 'touch')).toBe(true);
    expect(isTap(10, 0, 'mouse')).toBe(true);
    expect(isTap(12, 12, 'touch')).toBe(false); // 約 17px
    expect(isTap(11, 11, 'pen')).toBe(true);
  });
});

describe('snapCell', () => {
  const cands = [{ x: 4, y: 4 }, { x: 6, y: 4 }];
  it('exact cell wins', () => {
    expect(snapCell(at(4, 4, 0.4, 0.4), cands)).toEqual({ x: 4, y: 4 });
  });
  it('snaps from a neighbouring non-candidate cell near the border', () => {
    // (5,4) の左寄り(境界から 0.2 内側)= (4,4) 中心から 0.7
    expect(snapCell(at(4, 4, 0.7, 0), cands)).toEqual({ x: 4, y: 4 });
    // 右隣 (6,4) の側へ寄ったタップ
    expect(snapCell(at(6, 4, -0.7, 0), cands)).toEqual({ x: 6, y: 4 });
  });
  it('does not snap when far from every candidate', () => {
    expect(snapCell(at(5, 4, 0, 0), cands)).toBeNull();   // 両候補から距離 1.0
    expect(snapCell(at(4, 4, 0, CELL_SNAP_RADIUS + 0.3), [{ x: 4, y: 4 }])).toBeNull();
  });
  it('picks the nearest candidate when two are in range', () => {
    const two = [{ x: 4, y: 4 }, { x: 5, y: 5 }];
    expect(snapCell(at(4, 5, 0.35, 0), two)).toEqual({ x: 5, y: 5 }); // (5,5) まで 0.65、(4,4) まで約 1.06
    expect(snapCell(at(4, 5, 0.2, 0), two)).toBeNull();              // どちらも 0.75 より遠い
  });
  it('no candidates → null', () => { expect(snapCell(at(4, 4), [])).toBeNull(); });
});

describe('nearestEdgeTo', () => {
  const edges = [{ o: 'H' as const, x: 4, y: 3 }, { o: 'V' as const, x: 4, y: 4 }, { o: 'H' as const, x: 4, y: 4 }, { o: 'V' as const, x: 3, y: 4 }]; // (4,4) の N,E,S,W
  it('selects the closest edge even when tapping well away from its midpoint', () => {
    const e = edgeMid(edges[1]!); // E
    expect(nearestEdgeTo({ x: e.x + 0.9, z: e.z }, edges)).toEqual(edges[1]);   // 旧 0.9 では境界ぎりぎり
    expect(nearestEdgeTo({ x: e.x + 1.2, z: e.z }, edges)).toEqual(edges[1]);   // 新半径 1.3 以内
  });
  it('null beyond the radius', () => {
    expect(nearestEdgeTo({ x: 20, z: 20 }, edges)).toBeNull();
    expect(EDGE_SNAP_RADIUS).toBeGreaterThan(0.9);
  });
  it('tap at the cell centre is stable (ties resolve deterministically in DIRS order)', () => {
    expect(nearestEdgeTo(at(4, 4), edges)).toEqual(edges[0]);
  });
});
