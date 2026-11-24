import { describe, expect, it } from 'vitest';
import { computeScores, rankPlayers } from '../../src/logic';
import type { PlayerScore } from '../../src/logic';
import { build } from '../helpers/boardFixture';

const sc = (player: 0 | 1 | 2, territory: number, c: number, p: number): PlayerScore => ({ player, territory, bestRegionCells: c, bestRegionPieces: p });

describe('scoring', () => {
  it('territory decides', () => {
    const r = rankPlayers([sc(0, 36, 36, 2), sc(1, 45, 45, 2)], 'separated');
    expect(r.winners).toEqual([1]);
    expect(r.decidedBy).toBe('territory');
  });
  it('efficiency tie-break', () => {
    const r = rankPlayers([sc(0, 40, 30, 2), sc(1, 40, 40, 4)], 'separated');
    expect(r.winners).toEqual([0]);
    expect(r.decidedBy).toBe('efficiency');
  });
  it('draw', () => {
    const r = rankPlayers([sc(0, 40, 20, 2), sc(1, 40, 40, 4)], 'separated');
    expect(r.winners).toEqual([0, 1]);
    expect(r.decidedBy).toBe('draw');
    expect(r.ranking.map((x) => x.rank)).toEqual([1, 1]);
  });
  it('3 players competition ranking [1,1,3]', () => {
    const r = rankPlayers([sc(0, 40, 20, 2), sc(1, 40, 20, 2), sc(2, 1, 1, 1)], 'separated');
    expect(r.ranking.map((x) => [x.player, x.rank])).toEqual([[0, 1], [1, 1], [2, 3]]);
  });
  it('3 players efficiency decides', () => {
    const r = rankPlayers([sc(0, 30, 10, 2), sc(1, 20, 20, 2), sc(2, 30, 30, 2)], 'separated');
    expect(r.ranking.map((x) => [x.player, x.rank])).toEqual([[2, 1], [0, 2], [1, 3]]);
    expect(r.decidedBy).toBe('efficiency');
  });
  it('computeScores two regions same player', () => {
    // 3 つの領域: 左 3列(27)... 同一プレイヤーが2領域: 縦壁 x=2 と x=3 → 27/9/45
    const walls = [0, 1, 2, 3, 4, 5, 6, 7, 8].flatMap((y) => [{ o: 'V' as const, x: 2, y }, { o: 'V' as const, x: 3, y }]);
    const s = build([['A', 0, 0], ['a', 0, 1], ['A', 3, 0], ['a', 3, 1], ['B', 7, 7]], walls);
    const c = computeScores(s);
    expect(c[0]!.territory).toBe(27 + 9);
    expect(c[0]!.bestRegionCells).toBe(27);
    expect(c[0]!.bestRegionPieces).toBe(2);
    expect(c[1]!.territory).toBe(45);
  });
  it('nobody owns anything', () => {
    const s = build([['A', 4, 4], ['B', 5, 5]]);
    const c = computeScores(s);
    expect(c.every((x) => x.territory === 0 && x.bestRegionCells === 0)).toBe(true);
    expect(rankPlayers(c, 'turnLimit').decidedBy).toBe('draw');
  });
});
