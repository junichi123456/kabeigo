import { describe, expect, it } from 'vitest';
import { computeRegions, computeScores, isSeparated, isSettled } from '../../src/logic';
import type { Edge } from '../../src/logic';
import { SAMPLE_S1, build, fx } from '../helpers/boardFixture';

const col = (x: number, ys = [0, 1, 2, 3, 4, 5, 6, 7, 8]): Edge[] => ys.map((y) => ({ o: 'V', x, y }));

describe('regions', () => {
  it('empty board: single region', () => {
    const s = build([['A', 4, 4], ['B', 0, 0]]);
    const r = computeRegions(s);
    expect(r).toHaveLength(1);
    expect(r[0]!.cells).toHaveLength(81);
    expect(r[0]!.owners).toEqual([0, 1]);
  });
  it('vertical wall splits 36/45', () => {
    const s = build([['A', 4, 4], ['B', 0, 0]], col(3));
    const r = computeRegions(s);
    expect(r.map((x) => x.cells.length)).toEqual([36, 45]);
  });
  it('sample S1', () => {
    const s = fx(SAMPLE_S1);
    const r = computeRegions(s);
    expect(r).toHaveLength(2);
    const small = r.find((x) => x.cells.length === 9)!;
    expect(small.owners).toEqual([0]);
    expect(r.find((x) => x.cells.length === 72)!.owners).toEqual([0, 1]);
    const sc = computeScores(s);
    expect(sc[0]!.territory).toBe(9);
    expect(sc[1]!.territory).toBe(0);
    expect(sc[0]!.bestRegionCells).toBe(9);
    expect(sc[0]!.bestRegionPieces).toBe(2);
    expect(isSettled(s, 0)).toBe(false);
  });
  it('empty enclosed region is neutral', () => {
    const s = build([['A', 4, 4], ['B', 8, 8]], [{ o: 'V', x: 0, y: 0 }, { o: 'H', x: 0, y: 0 }]);
    const r = computeRegions(s);
    expect(r.find((x) => x.cells.length === 1)!.owners).toEqual([]);
    const sc = computeScores(s);
    expect(sc[0]!.territory + sc[1]!.territory).toBe(0);
  });
  it('isSeparated', () => {
    const w = col(3);
    const sep = build([['A', 1, 1], ['a', 2, 5], ['B', 6, 6], ['b', 7, 2]], w);
    expect(isSeparated(sep)).toBe(true);
    const mixed = build([['A', 1, 1], ['a', 2, 5], ['B', 6, 6], ['b', 2, 2]], w);
    expect(isSeparated(mixed)).toBe(false);
  });
  it('3 players: only the lone region scores', () => {
    const s = build([['A', 1, 1], ['B', 2, 2], ['C', 7, 7]], col(3), { playerCount: 3 });
    const sc = computeScores(s);
    expect(sc.map((x) => x.territory)).toEqual([0, 0, 45]);
  });
});
