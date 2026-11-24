import { describe, expect, it } from 'vitest';
import { applyMove, applyWall, deserialize, serialize, legalMovesForPiece, MAX_TURNS } from '../../src/logic';
import type { Edge, GameState } from '../../src/logic';
import { NEAR_END, build, fx } from '../helpers/boardFixture';

const ok = (r: ReturnType<typeof applyWall>) => { if (!r.ok) throw new Error(r.error); return r; };
const col = (x: number): Edge[] => [0, 1, 2, 3, 4, 5, 6, 7, 8].map((y) => ({ o: 'V' as const, x, y }));

describe('turn', () => {
  it('separation ends the game', () => {
    const base = fx(NEAR_END);
    const pid = base.pieces.find((p) => p.owner === 0 && p.kind === 'circle' && p.pos.x === 3 && p.pos.y === 8)!.id;
    const s: GameState = { ...base, phase: 'wall', currentPlayer: 0, pendingWall: { pieceId: pid, cell: { x: 3, y: 8 } } };
    const r = ok(applyWall(s, { o: 'V', x: 3, y: 8 }));
    expect(r.state.phase).toBe('finished');
    expect(r.state.result!.reason).toBe('separated');
    expect(r.state.result!.ranking.find((x) => x.player === 0)!.score.territory).toBe(36);
    expect(r.state.result!.ranking.find((x) => x.player === 1)!.score.territory).toBe(45);
    expect(r.state.result!.winners).toEqual([1]);
    expect(r.events.at(-1)!.type).toBe('gameEnded');
  });
  it('turn limit', () => {
    const s = build([['A', 4, 4], ['a', 1, 1], ['B', 6, 6], ['b', 7, 7]], [], { turnCount: MAX_TURNS - 1 });
    const m = legalMovesForPiece(s, 'p0-c0')[0]!;
    const r1 = applyMove(s, m);
    if (!r1.ok) throw new Error('x');
    const edge = r1.state.pendingWall ? { o: 'H' as const, x: 0, y: 0 } : null;
    void edge;
    const cell = r1.state.pendingWall!.cell;
    const opt = (r1.state.pendingWall && [{ o: 'H' as const, x: cell.x, y: cell.y - 1 }, { o: 'V' as const, x: cell.x, y: cell.y }, { o: 'H' as const, x: cell.x, y: cell.y }, { o: 'V' as const, x: cell.x - 1, y: cell.y }].find((e) => applyWall(r1.state, e).ok))!;
    const r = ok(applyWall(r1.state, opt));
    expect(r.state.phase).toBe('finished');
    expect(r.state.result!.reason).toBe('turnLimit');
  });
  it('settled players are skipped (3 players)', () => {
    // P0 は左上に単独で閉じ込められている。P1/P2 は共存
    const walls: Edge[] = [
      ...[0, 1, 2].map((y) => ({ o: 'V' as const, x: 2, y })),
      ...[0, 1, 2].map((x) => ({ o: 'H' as const, x, y: 2 })),
    ];
    const s = build([['A', 0, 0], ['a', 1, 1], ['B', 6, 6], ['b', 7, 7], ['C', 5, 5], ['c', 4, 4]], walls, { currentPlayer: 2 });
    const m = legalMovesForPiece(s, 'p2-c0')[0]!;
    const r1 = applyMove(s, m);
    if (!r1.ok) throw new Error('x');
    const cell = r1.state.pendingWall!.cell;
    const opts = [{ o: 'H' as const, x: cell.x, y: cell.y - 1 }, { o: 'V' as const, x: cell.x, y: cell.y }, { o: 'H' as const, x: cell.x, y: cell.y }, { o: 'V' as const, x: cell.x - 1, y: cell.y }];
    const e = opts.find((o) => applyWall(r1.state, o).ok)!;
    const r = ok(applyWall(r1.state, e));
    expect(r.events.some((x) => x.type === 'playerSkipped' && x.player === 0)).toBe(true);
    expect(r.state.currentPlayer).toBe(1);
  });
  const firstWall = (s: GameState): Edge => {
    const c = s.pendingWall!.cell;
    return [{ o: 'H' as const, x: c.x, y: c.y - 1 }, { o: 'V' as const, x: c.x, y: c.y }, { o: 'H' as const, x: c.x, y: c.y }, { o: 'V' as const, x: c.x - 1, y: c.y }].find((o) => applyWall(s, o).ok)!;
  };
  it('pass when an unsettled player has no moves', () => {
    // P1 の B は P0 の a と 2 マス領域を共有し、a に塞がれて動けない(壁破り使用済み)。未確定なのでパス。
    const walls: Edge[] = [{ o: 'V', x: 6, y: 8 }, { o: 'H', x: 7, y: 7 }, { o: 'H', x: 8, y: 7 }];
    const s = build([['A', 4, 4], ['a', 7, 8], ['B', 8, 8]], walls, { wallBreakUsed: [false, true] });
    const r1 = applyMove(s, legalMovesForPiece(s, 'p0-c0')[0]!);
    if (!r1.ok) throw new Error('x');
    const r = ok(applyWall(r1.state, firstWall(r1.state)));
    expect(r.events.some((x) => x.type === 'turnPassed' && x.player === 1)).toBe(true);
    expect(r.state.currentPlayer).toBe(0);
    expect(r.state.turnCount).toBe(2);
    expect(r.state.consecutivePasses).toBe(1);
    expect(r.state.log.map((l) => l.t)).toEqual(['move', 'wall', 'pass']);
  });
  it('a stuck but settled player is skipped, not passed', () => {
    // 3人戦: P1 の駒は (8,8) に単独で閉じ込められ(確定かつ動けない)、P0 と P2 は大領域を共有。
    const walls: Edge[] = [{ o: 'V', x: 7, y: 8 }, { o: 'H', x: 8, y: 7 }];
    const s = build([['A', 4, 4], ['B', 8, 8], ['C', 1, 1]], walls, { wallBreakUsed: [false, true, false] });
    const r1 = applyMove(s, legalMovesForPiece(s, 'p0-c0')[0]!);
    if (!r1.ok) throw new Error('x');
    const r = ok(applyWall(r1.state, firstWall(r1.state)));
    expect(r.events.some((x) => x.type === 'playerSkipped' && x.player === 1)).toBe(true);
    expect(r.events.some((x) => x.type === 'turnPassed')).toBe(false);
    expect(r.state.currentPlayer).toBe(2);
  });
  it('all unsettled players stuck → allPassed', () => {
    // 2x2 の閉領域に 4 駒が詰まり全員動けない。A の壁(輪を切るだけで連結は保たれる)の後、P1 パス→P0 パス。
    const walls: Edge[] = [{ o: 'V', x: 6, y: 7 }, { o: 'V', x: 6, y: 8 }, { o: 'H', x: 7, y: 6 }, { o: 'H', x: 8, y: 6 }];
    const base = build([['A', 7, 7], ['a', 8, 7], ['B', 7, 8], ['b', 8, 8]], walls, { wallBreakUsed: [true, true] });
    const s: GameState = { ...base, phase: 'wall', pendingWall: { pieceId: 'p0-c0', cell: { x: 7, y: 7 } } };
    const r = ok(applyWall(s, { o: 'H', x: 7, y: 7 }));
    expect(r.state.phase).toBe('finished');
    expect(r.state.result!.reason).toBe('allPassed');
    expect(r.events.filter((e) => e.type === 'turnPassed').map((e) => (e as { player: number }).player)).toEqual([1, 0]);
  });
  it('normal turn bookkeeping and log', () => {
    const s = build([['a', 4, 4], ['B', 0, 0]]);
    const m = legalMovesForPiece(s, 'p0-s0')[0]!;
    const r1 = applyMove(s, m);
    if (!r1.ok) throw new Error('x');
    const r = ok(applyWall(r1.state, r1.state.pendingWall ? { o: 'V', x: 4, y: 3 } : { o: 'V', x: 0, y: 0 }));
    expect(r.state.turnCount).toBe(1);
    expect(r.state.consecutivePasses).toBe(0);
    expect(r.state.currentPlayer).toBe(1);
    expect(r.events.some((e) => e.type === 'turnStarted' && e.player === 1)).toBe(true);
    expect(r.state.log.map((l) => l.t)).toEqual(['move', 'wall']);
  });
  it('serialize roundtrip', () => {
    const s = fx(NEAR_END);
    expect(deserialize(serialize(s))).toEqual(s);
    expect(() => deserialize('{"config":{"playerCount":2,"playerNames":["a","b"]},"phase":"move","hWalls":[]}')).toThrow();
    expect(() => deserialize('nope')).toThrow();
  });
  void col;
});
