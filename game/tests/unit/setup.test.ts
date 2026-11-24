import { describe, expect, it } from 'vitest';
import { createGame, legalPlacementCells, placeSquare, legalMoves } from '../../src/logic';
import type { GameState } from '../../src/logic';

const g2 = () => createGame({ playerCount: 2, playerNames: [] });
const g3 = () => createGame({ playerCount: 3, playerNames: [] });
const circles = (s: GameState, p: number) => s.pieces.filter((x) => x.owner === p && x.kind === 'circle').map((x) => `${x.pos.x},${x.pos.y}`).sort();

describe('setup', () => {
  it('2 players initial', () => {
    const s = g2();
    expect(circles(s, 0)).toEqual(['2,6', '6,2']);
    expect(circles(s, 1)).toEqual(['2,2', '6,6']);
    expect(s.pieces).toHaveLength(4);
    expect(s.hWalls.every((w) => w === -1) && s.vWalls.every((w) => w === -1)).toBe(true);
    expect(s.placementQueue).toEqual([0, 1, 0, 1]);
    expect(s.phase).toBe('placement');
    expect(s.currentPlayer).toBe(0);
    expect(s.config.playerNames).toEqual(['プレイヤー1', 'プレイヤー2']);
  });
  it('3 players initial', () => {
    const s = g3();
    expect(circles(s, 0)).toEqual(['2,6']);
    expect(circles(s, 1)).toEqual(['6,2']);
    expect(circles(s, 2)).toEqual(['6,6']);
    expect(s.placementQueue).toEqual([0, 1, 2, 0, 1, 2]);
  });
  it('legalPlacementCells', () => {
    expect(legalPlacementCells(g2())).toHaveLength(77);
    expect(legalPlacementCells(g3())).toHaveLength(78);
    const l = legalPlacementCells(g2());
    for (let i = 1; i < l.length; i++) expect(l[i]!.y * 9 + l[i]!.x).toBeGreaterThan(l[i - 1]!.y * 9 + l[i - 1]!.x);
  });
  it('placement errors', () => {
    const s = g2();
    expect(placeSquare(s, { x: 6, y: 2 })).toEqual({ ok: false, error: 'CELL_OCCUPIED' });
    expect(placeSquare(s, { x: 9, y: 2 })).toEqual({ ok: false, error: 'OUT_OF_BOUNDS' });
    expect(placeSquare(s, { x: -1, y: 0 })).toEqual({ ok: false, error: 'OUT_OF_BOUNDS' });
  });
  it('4 placements → move phase', () => {
    let s = g2();
    for (const c of [{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 0, y: 8 }, { x: 8, y: 8 }]) {
      const r = placeSquare(s, c);
      expect(r.ok).toBe(true);
      if (r.ok) s = r.state;
    }
    expect(s.phase).toBe('move');
    expect(s.currentPlayer).toBe(0);
    expect(s.pieces.filter((p) => p.kind === 'square').map((p) => p.id).sort()).toEqual(['p0-s0', 'p0-s1', 'p1-s0', 'p1-s1']);
    expect(s.pieces).toHaveLength(8);
    expect(placeSquare(s, { x: 4, y: 4 })).toEqual({ ok: false, error: 'WRONG_PHASE' });
    expect(legalMoves(s).length).toBeGreaterThan(0);
  });
  it('3 players: placement order and (2,2) placeable', () => {
    let s = g3();
    const r0 = placeSquare(s, { x: 2, y: 2 });
    expect(r0.ok).toBe(true);
    if (r0.ok) s = r0.state;
    expect(s.currentPlayer).toBe(1);
    expect(s.pieces.find((p) => p.id === 'p0-s0')!.pos).toEqual({ x: 2, y: 2 });
  });
  it('immutability', () => {
    const s = g2();
    const snap = structuredClone(s);
    placeSquare(s, { x: 0, y: 0 });
    placeSquare(s, { x: 6, y: 2 });
    expect(s).toEqual(snap);
  });
});
