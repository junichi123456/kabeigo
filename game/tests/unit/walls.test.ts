import { describe, expect, it } from 'vitest';
import { applyMove, applyWall, legalMovesForPiece, wallOptions } from '../../src/logic';
import type { Edge } from '../../src/logic';
import { build } from '../helpers/boardFixture';

describe('walls', () => {
  it('wallOptions', () => {
    const s = build([['A', 4, 4], ['B', 0, 0]]);
    expect(wallOptions(s, { x: 0, y: 0 })).toEqual([{ o: 'V', x: 0, y: 0 }, { o: 'H', x: 0, y: 0 }]);
    expect(wallOptions(s, { x: 4, y: 4 })).toEqual([
      { o: 'H', x: 4, y: 3 }, { o: 'V', x: 4, y: 4 }, { o: 'H', x: 4, y: 4 }, { o: 'V', x: 3, y: 4 },
    ]);
  });
  it('existing walls excluded', () => {
    const s = build([['A', 4, 4], ['B', 0, 0]], [{ o: 'H', x: 4, y: 3 }]);
    expect(wallOptions(s, { x: 4, y: 4 })).toHaveLength(3);
  });
  it('applyWall', () => {
    const s0 = build([['a', 4, 4], ['B', 0, 0]]);
    const m = legalMovesForPiece(s0, 'p0-s0').find((x) => x.dirs.join('') === 'E')!;
    const s1 = (applyMove(s0, m) as { ok: true; state: typeof s0 }).state;
    expect(applyWall(s1, { o: 'H', x: 0, y: 0 })).toEqual({ ok: false, error: 'ILLEGAL_WALL' });
    expect(applyWall(s0, { o: 'H', x: 5, y: 3 })).toEqual({ ok: false, error: 'WRONG_PHASE' });
    const edge: Edge = { o: 'H', x: 5, y: 3 };
    const r = applyWall(s1, edge);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.hWalls[3 * 9 + 5]).toBe(0);
    expect(r.state.pendingWall).toBeNull();
    expect(r.state.phase).toBe('move');
    expect(r.state.currentPlayer).toBe(1);
    expect(r.events.some((e) => e.type === 'turnStarted' && e.player === 1)).toBe(true);
  });
  it('wallSkipped is unreachable: a move always leaves at least one open edge at the destination', () => {
    // 仕様 10.1 walls 4 は「移動先の4辺が全て壁」を想定するが、駒は空き辺を越えて入る(壁破りなら破った辺が開く)ため、
    // 移動先に壁候補が0本になる手は存在しない。防御コードは残しつつ、この不変条件をテストする。
    const walls: Edge[] = [{ o: 'H', x: 4, y: 3 }, { o: 'V', x: 4, y: 4 }, { o: 'H', x: 4, y: 4 }, { o: 'V', x: 3, y: 4 }];
    for (const used of [false, true]) {
      const s = build([['a', 4, 6], ['A', 4, 4], ['B', 0, 0]], walls, { wallBreakUsed: [used, false] });
      for (const id of ['p0-s0', 'p0-c0']) {
        for (const m of legalMovesForPiece(s, id)) {
          const r = applyMove(s, m);
          expect(r.ok).toBe(true);
          if (r.ok) {
            expect(r.events.some((e) => e.type === 'wallSkipped')).toBe(false);
            expect(r.state.phase).toBe('wall');
          }
        }
      }
    }
  });
});
