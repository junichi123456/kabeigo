import { describe, expect, it } from 'vitest';
import { applyMove, applyWall, computeRegions, createGame, legalMoves, legalPlacementCells, placeSquare, wallOptions, MAX_TURNS } from '../../src/logic';
import type { GameState, PlayerCount } from '../../src/logic';

function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function playOut(n: PlayerCount, seed: number): GameState {
  const rnd = mulberry32(seed);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]!;
  let s = createGame({ playerCount: n, playerNames: [] });
  let guard = 0;
  while (s.phase !== 'finished') {
    if (++guard > 2000) throw new Error('infinite loop');
    if (s.phase === 'placement') {
      const r = placeSquare(s, pick(legalPlacementCells(s)));
      if (!r.ok) throw new Error(r.error);
      s = r.state;
    } else if (s.phase === 'move') {
      const ms = legalMoves(s);
      expect(ms.length).toBeGreaterThan(0);
      const r = applyMove(s, pick(ms));
      if (!r.ok) throw new Error(r.error);
      s = r.state;
    } else {
      const opts = wallOptions(s, s.pendingWall!.cell);
      expect(opts.length).toBeGreaterThan(0);
      const r = applyWall(s, pick(opts));
      if (!r.ok) throw new Error(r.error);
      s = r.state;
    }
  }
  return s;
}

describe('random play always terminates', () => {
  for (const n of [2, 3] as const) {
    it(`${n} players, 30 games`, () => {
      const reasons: Record<string, number> = {};
      for (let seed = 1; seed <= 30; seed++) {
        const s = playOut(n, seed * 7919 + n);
        expect(s.result).not.toBeNull();
        expect(s.turnCount).toBeLessThanOrEqual(MAX_TURNS + n);
        // 整合性: 駒の重複なし、領域のセル総数 81
        const cells = new Set(s.pieces.map((p) => p.pos.y * 9 + p.pos.x));
        expect(cells.size).toBe(s.pieces.length);
        expect(computeRegions(s).reduce((a, r) => a + r.cells.length, 0)).toBe(81);
        reasons[s.result!.reason] = (reasons[s.result!.reason] ?? 0) + 1;
      }
      console.log(`[randomplay ${n}p]`, JSON.stringify(reasons));
    });
  }
});
