import { describe, expect, it } from 'vitest';
import { applyMove, legalMovesForPiece, representativeMoves, edgeKey } from '../../src/logic';
import type { Move } from '../../src/logic';
import { build } from '../helpers/boardFixture';

const ends = (ms: Move[]) => new Set(ms.map((m) => `${m.path[m.path.length - 1]!.x},${m.path[m.path.length - 1]!.y}`));
const set = (...c: [number, number][]) => new Set(c.map(([x, y]) => `${x},${y}`));

describe('moves', () => {
  it('circle open board: 12 moves, 8 destinations', () => {
    const s = build([['A', 4, 4], ['B', 0, 0]]);
    const ms = legalMovesForPiece(s, 'p0-c0');
    expect(ms).toHaveLength(12);
    expect(ends(ms)).toEqual(set([4, 3], [5, 4], [4, 5], [3, 4], [3, 3], [5, 3], [5, 5], [3, 5]));
    expect(ends(ms).has('4,2')).toBe(false);
    expect(ends(ms).has('4,4')).toBe(false);
  });
  it('circle enumeration order', () => {
    const s = build([['A', 4, 4], ['B', 0, 0]]);
    const ms = legalMovesForPiece(s, 'p0-c0').slice(0, 5).map((m) => m.dirs.join(''));
    expect(ms).toEqual(['N', 'NE', 'NW', 'E', 'EN']);
  });
  it('circle at corner', () => {
    const s = build([['A', 0, 0], ['B', 8, 8]]);
    const ms = legalMovesForPiece(s, 'p0-c0');
    expect(ms.map((m) => m.dirs.join(''))).toEqual(['E', 'ES', 'S', 'SE']);
    expect(ends(ms)).toEqual(set([1, 0], [1, 1], [0, 1]));
  });
  it('square open board', () => {
    const s = build([['a', 4, 4], ['B', 0, 0]]);
    const ms = legalMovesForPiece(s, 'p0-s0');
    expect(ms).toHaveLength(8);
    expect(ends(ms)).toEqual(set([4, 3], [4, 2], [5, 4], [6, 4], [4, 5], [4, 6], [3, 4], [2, 4]));
  });
  it('square at corner', () => {
    const s = build([['a', 0, 0], ['B', 8, 8]]);
    expect(ends(legalMovesForPiece(s, 'p0-s0'))).toEqual(set([1, 0], [2, 0], [0, 1], [0, 2]));
  });
  it('square cannot jump over piece', () => {
    const s = build([['a', 4, 4], ['B', 5, 4]]);
    const ms = legalMovesForPiece(s, 'p0-s0');
    expect(ms.some((m) => m.dirs[0] === 'E')).toBe(false);
    expect(ms).toHaveLength(6);
  });
  it('square 2nd step blocked', () => {
    const s = build([['a', 4, 4], ['B', 6, 4]]);
    const ms = legalMovesForPiece(s, 'p0-s0').filter((m) => m.dirs[0] === 'E');
    expect(ms.map((m) => m.dirs.join(''))).toEqual(['E']);
  });
  it('circle blocked by piece', () => {
    const s = build([['A', 4, 4], ['B', 4, 3]]);
    const ms = legalMovesForPiece(s, 'p0-c0');
    expect(ms.some((m) => m.dirs[0] === 'N')).toBe(false);
    const e = ends(ms);
    expect(e.has('3,3') && e.has('5,3')).toBe(true);
    expect(ms.find((m) => m.path[1]?.x === 3 && m.path[1]?.y === 3)!.dirs).toEqual(['W', 'N']);
    expect(ms.find((m) => m.path[1]?.x === 5 && m.path[1]?.y === 3)!.dirs).toEqual(['E', 'N']);
  });
  it('wall break (square)', () => {
    const wall = { o: 'H' as const, x: 4, y: 3 };
    const s = build([['a', 4, 4], ['B', 0, 0]], [wall]);
    const ms = legalMovesForPiece(s, 'p0-s0').filter((m) => m.dirs[0] === 'N');
    expect(ms.map((m) => m.dirs.join(''))).toEqual(['N', 'NN']);
    expect(ms.every((m) => m.breakEdge && edgeKey(m.breakEdge) === 'H:4,3')).toBe(true);
    const used = build([['a', 4, 4], ['B', 0, 0]], [wall], { wallBreakUsed: [true, false] });
    expect(legalMovesForPiece(used, 'p0-s0').some((m) => m.dirs[0] === 'N')).toBe(false);
  });
  it('double wall: at most one break', () => {
    const s = build([['A', 4, 4], ['B', 0, 0]], [{ o: 'V', x: 4, y: 4 }, { o: 'H', x: 5, y: 3 }]);
    const ms = legalMovesForPiece(s, 'p0-c0');
    expect(ms.find((m) => m.dirs.join('') === 'EN')).toBeUndefined();
    const ne = ms.find((m) => m.dirs.join('') === 'NE')!;
    expect(ne.breakEdge).toBeNull();
    const e = ms.find((m) => m.dirs.join('') === 'E')!;
    expect(edgeKey(e.breakEdge!)).toBe('V:4,4');
  });
  it('representativeMoves prefers non-break', () => {
    // 到着 (5,3): [E,N] は壁破り2枚で不可 / [N,E] は破りなし
    const s = build([['A', 4, 4], ['B', 0, 0]], [{ o: 'V', x: 4, y: 4 }, { o: 'H', x: 5, y: 3 }]);
    const reps = representativeMoves(legalMovesForPiece(s, 'p0-c0'));
    const r = reps.find((m) => m.path[m.path.length - 1]!.x === 5 && m.path[m.path.length - 1]!.y === 3)!;
    expect(r.dirs).toEqual(['N', 'E']);
    expect(r.breakEdge).toBeNull();
    // 到着セルは重複しない
    expect(new Set(reps.map((m) => `${m.path.at(-1)!.x},${m.path.at(-1)!.y}`)).size).toBe(reps.length);
  });
  it('representativeMoves prefers non-break even when break comes first', () => {
    // (5,5) へ: E は壁あり(破り), その後 S。S→E は破りなし
    const s = build([['A', 4, 4], ['B', 0, 0]], [{ o: 'V', x: 4, y: 4 }]);
    const all = legalMovesForPiece(s, 'p0-c0');
    expect(all.filter((m) => m.path.at(-1)!.x === 5 && m.path.at(-1)!.y === 5)).toHaveLength(2);
    const r = representativeMoves(all).find((m) => m.path.at(-1)!.x === 5 && m.path.at(-1)!.y === 5)!;
    expect(r.breakEdge).toBeNull();
    expect(r.dirs).toEqual(['S', 'E']);
  });
  it('applyMove with wall break', () => {
    const s = build([['a', 4, 4], ['B', 0, 0]], [{ o: 'H', x: 4, y: 3 }]);
    const mv = legalMovesForPiece(s, 'p0-s0').find((m) => m.dirs.join('') === 'NN')!;
    const r = applyMove(s, mv);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.pieces.find((p) => p.id === 'p0-s0')!.pos).toEqual({ x: 4, y: 2 });
    expect(r.state.hWalls[3 * 9 + 4]).toBe(-1);
    expect(r.state.wallBreakUsed[0]).toBe(true);
    expect(r.state.phase).toBe('wall');
    expect(r.state.pendingWall!.cell).toEqual({ x: 4, y: 2 });
    const ev = r.events.find((e) => e.type === 'pieceMoved');
    expect(ev && ev.type === 'pieceMoved' && ev.brokenEdge).toEqual({ o: 'H', x: 4, y: 3 });
  });
  it('applyMove errors', () => {
    const s = build([['a', 4, 4], ['A', 2, 2], ['B', 7, 7]]);
    const base = legalMovesForPiece(s, 'p0-s0')[0]!;
    expect(applyMove(s, { ...base, pieceId: 'p1-c0' })).toEqual({ ok: false, error: 'NOT_YOUR_PIECE' });
    expect(applyMove(s, { ...base, pieceId: 'zzz' })).toEqual({ ok: false, error: 'UNKNOWN_PIECE' });
    expect(applyMove(s, { ...base, dirs: ['N', 'E'] })).toEqual({ ok: false, error: 'ILLEGAL_MOVE' });
    expect(applyMove(s, { ...base, breakEdge: { o: 'H', x: 4, y: 3 } })).toEqual({ ok: false, error: 'ILLEGAL_MOVE' });
    const w = applyMove(s, base);
    expect(w.ok).toBe(true);
    if (w.ok) expect(applyMove(w.state, base)).toEqual({ ok: false, error: 'WRONG_PHASE' });
  });
  it('outer boundary cannot be broken', () => {
    const s = build([['a', 8, 4], ['B', 0, 0]]);
    expect(legalMovesForPiece(s, 'p0-s0').some((m) => m.dirs[0] === 'E')).toBe(false);
  });
  it('immutability', () => {
    const s = build([['a', 4, 4], ['B', 0, 0]]);
    const snap = structuredClone(s);
    applyMove(s, legalMovesForPiece(s, 'p0-s0')[0]!);
    expect(s).toEqual(snap);
  });
});
