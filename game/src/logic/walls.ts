import { edgeEq, edgeIdx, edgesOfCell, hasWall } from './board';
import type { ActionResult, Cell, Edge, GameEvent, GameState } from './types';
import { advanceTurn } from './turn';

export function wallOptions(s: GameState, cell: Cell): Edge[] {
  return edgesOfCell(cell).filter((e) => !hasWall(s, e));
}

export function applyWall(s: GameState, edge: Edge): ActionResult {
  if (s.phase !== 'wall' || !s.pendingWall) return { ok: false, error: 'WRONG_PHASE' };
  if (!wallOptions(s, s.pendingWall.cell).some((e) => edgeEq(e, edge))) return { ok: false, error: 'ILLEGAL_WALL' };
  const hWalls = s.hWalls.slice(), vWalls = s.vWalls.slice();
  (edge.o === 'H' ? hWalls : vWalls)[edgeIdx(edge)] = s.currentPlayer;
  const e: Edge = { o: edge.o, x: edge.x, y: edge.y };
  const events: GameEvent[] = [{ type: 'wallPlaced', edge: e, owner: s.currentPlayer }];
  const next: GameState = {
    ...s, hWalls, vWalls, pendingWall: null, phase: 'move',
    log: [...s.log, { t: 'wall', player: s.currentPlayer, edge: e }],
  };
  const r = advanceTurn(next, events);
  return { ok: true, state: r.state, events: r.events };
}
