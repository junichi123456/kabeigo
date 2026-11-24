import { describe, expect, it } from 'vitest';
import { applyMove, applyWall, chooseCpuPlacement, chooseCpuTurn, chooseCpuWall, createGame, legalMoves, legalPlacementCells, placeSquare, wallOptions } from '../../src/logic';
import type { GameState, PlayerCount, PlayerId } from '../../src/logic';
import { NEAR_END, fx } from '../helpers/boardFixture';

function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

type Policy = 'cpu' | 'random';

/** 席ごとに CPU / ランダムを割り当てて 1 局進める。手数ガード付き。 */
function play(n: PlayerCount, seats: Policy[], seed: number): GameState {
  const rnd = mulberry32(seed);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]!;
  let s = createGame({ playerCount: n, playerNames: [] });
  for (let guard = 0; s.phase !== 'finished'; guard++) {
    if (guard > 1000) throw new Error('infinite loop');
    const seat = seats[s.currentPlayer]!;
    if (s.phase === 'placement') {
      const cell = seat === 'cpu' ? chooseCpuPlacement(s, rnd) : pick(legalPlacementCells(s));
      const r = placeSquare(s, cell);
      if (!r.ok) throw new Error(r.error);
      s = r.state;
    } else if (s.phase === 'move') {
      if (seat === 'cpu') {
        const t = chooseCpuTurn(s, rnd);
        const r1 = applyMove(s, t.move);
        if (!r1.ok) throw new Error(r1.error);
        s = r1.state;
        if (s.phase === 'wall') {
          const r2 = applyWall(s, t.wall!);
          if (!r2.ok) throw new Error(r2.error);
          s = r2.state;
        }
      } else {
        const r1 = applyMove(s, pick(legalMoves(s)));
        if (!r1.ok) throw new Error(r1.error);
        s = r1.state;
        if (s.phase === 'wall') {
          const r2 = applyWall(s, pick(wallOptions(s, s.pendingWall!.cell)));
          if (!r2.ok) throw new Error(r2.error);
          s = r2.state;
        }
      }
    } else throw new Error(`unexpected phase ${s.phase}`);
  }
  return s;
}

describe('cpu', () => {
  it('returns legal choices and does not mutate the state', () => {
    let s = createGame({ playerCount: 2, playerNames: [] });
    const snap0 = structuredClone(s);
    const cell = chooseCpuPlacement(s, mulberry32(1));
    expect(s).toEqual(snap0);
    expect(legalPlacementCells(s).some((c) => c.x === cell.x && c.y === cell.y)).toBe(true);
    const p = placeSquare(s, cell); if (!p.ok) throw new Error('x'); s = p.state;
    const c2 = chooseCpuPlacement(s, mulberry32(2));
    const p2 = placeSquare(s, c2); if (!p2.ok) throw new Error('x'); s = p2.state;
    expect(s.phase).toBe('move');
    const snap = structuredClone(s);
    const t = chooseCpuTurn(s, mulberry32(3));
    expect(s).toEqual(snap);
    const r1 = applyMove(s, t.move);
    expect(r1.ok).toBe(true);
    if (r1.ok) {
      expect(r1.state.phase).toBe('wall');
      expect(applyWall(r1.state, t.wall!).ok).toBe(true);
      const w = chooseCpuWall(r1.state, mulberry32(4));
      expect(applyWall(r1.state, w).ok).toBe(true);
    }
  });

  it('is deterministic for the same rng seed', () => {
    const a = play(2, ['cpu', 'cpu'], 42), b = play(2, ['cpu', 'cpu'], 42);
    expect(a.log).toEqual(b.log);
  });

  it('takes a winning separation when one is available', () => {
    // 図4の盤面(左 36 / 右 45)で P1 の b を (4,7) に置き、(4,8) へ進んで V(3,8) を建てれば P1 の勝ちで終局する
    const base = fx(NEAR_END);
    const s: GameState = {
      ...base, phase: 'move', currentPlayer: 1,
      pieces: base.pieces.map((p) => (p.id === 'p1-s0' ? { ...p, pos: { x: 4, y: 7 } } : p)),
    };
    // 念のため前提を確認: b が (4,7) にいて、P0 の駒は全て左側
    expect(s.pieces.find((p) => p.id === 'p1-s0')!.pos).toEqual({ x: 4, y: 7 });
    const t = chooseCpuTurn(s, mulberry32(7));
    const r1 = applyMove(s, t.move);
    if (!r1.ok) throw new Error(r1.error);
    const r2 = applyWall(r1.state, t.wall!);
    if (!r2.ok) throw new Error(r2.error);
    expect(r2.state.phase).toBe('finished');
    expect(r2.state.result!.winners).toEqual([1]);
  });

  it('CPU self-play terminates (2 and 3 players, 6 games each)', () => {
    for (const n of [2, 3] as const) {
      for (let seed = 1; seed <= 6; seed++) {
        const s = play(n, new Array(n).fill('cpu'), seed * 31 + n);
        expect(s.result).not.toBeNull();
        for (let p = 0; p < n; p++) expect(s.pieces.filter((x) => x.owner === p)).toHaveLength(2);
      }
    }
  }, 60_000);

  it('CPU beats a random player clearly (2 players, alternating seats)', () => {
    let wins = 0, losses = 0, draws = 0;
    const N = 40;
    for (let i = 0; i < N; i++) {
      const cpuSeat = (i % 2) as PlayerId;
      const seats: Policy[] = cpuSeat === 0 ? ['cpu', 'random'] : ['random', 'cpu'];
      const s = play(2, seats, 1000 + i);
      const w = s.result!.winners;
      if (w.length === 1 && w[0] === cpuSeat) wins++; else if (w.length === 1) losses++; else draws++;
    }
    console.log(`[cpu vs random, ${N} games] wins ${wins} / losses ${losses} / draws ${draws}`);
    expect(wins).toBeGreaterThan(losses * 2);
    expect(wins / N).toBeGreaterThanOrEqual(0.6);
  }, 60_000);
});
