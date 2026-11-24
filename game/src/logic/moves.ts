import { DIRS, cellIdx, edgeBetween, edgeEq, hasWall, neighbor, perpendicular, pieceAt } from './board';
import { NO_WALL } from './types';
import type { ActionResult, Cell, Dir, Edge, GameEvent, GameState, Move, Piece, PlayerId } from './types';
import { wallOptions } from './walls';
import { advanceTurn } from './turn';
import { edgeIdx } from './board';

interface Step { to: Cell; brk: Edge | null; }

/** フェーズ・手番に関係なく、piece の合法手を列挙する(6.3) */
export function rawMovesForPiece(s: GameState, piece: Piece): Move[] {
  const canBreak = !s.wallBreakUsed[piece.owner];
  const occupied = (c: Cell) => s.pieces.some((p) => p.id !== piece.id && p.pos.x === c.x && p.pos.y === c.y);
  const tryStep = (from: Cell, d: Dir, brkSoFar: Edge | null): Step | null => {
    const to = neighbor(from, d);
    if (!to || occupied(to)) return null;
    const e = edgeBetween(from, to);
    if (hasWall(s, e)) {
      if (canBreak && brkSoFar === null) return { to, brk: e };
      return null;
    }
    return { to, brk: brkSoFar };
  };
  const out: Move[] = [];
  const start = piece.pos;
  if (piece.kind === 'circle') {
    for (const d1 of DIRS) {
      const r1 = tryStep(start, d1, null);
      if (!r1) continue;
      out.push({ pieceId: piece.id, dirs: [d1], path: [r1.to], breakEdge: r1.brk });
      for (const d2 of perpendicular(d1)) {
        const r2 = tryStep(r1.to, d2, r1.brk);
        if (!r2) continue;
        out.push({ pieceId: piece.id, dirs: [d1, d2], path: [r1.to, r2.to], breakEdge: r2.brk });
      }
    }
  } else {
    for (const d of DIRS) {
      const r1 = tryStep(start, d, null);
      if (!r1) continue;
      out.push({ pieceId: piece.id, dirs: [d], path: [r1.to], breakEdge: r1.brk });
      const r2 = tryStep(r1.to, d, r1.brk);
      if (!r2) continue;
      out.push({ pieceId: piece.id, dirs: [d, d], path: [r1.to, r2.to], breakEdge: r2.brk });
    }
  }
  return out;
}

export function legalMovesForPiece(s: GameState, pieceId: string): Move[] {
  if (s.phase !== 'move') return [];
  const piece = s.pieces.find((p) => p.id === pieceId);
  if (!piece || piece.owner !== s.currentPlayer) return [];
  return rawMovesForPiece(s, piece);
}

export function legalMoves(s: GameState, player?: PlayerId): Move[] {
  if (s.phase !== 'move') return [];
  const pl = player ?? s.currentPlayer;
  const out: Move[] = [];
  for (const p of s.pieces) if (p.owner === pl) out.push(...rawMovesForPiece(s, p));
  return out;
}

export function movablePieceIds(s: GameState): string[] {
  if (s.phase !== 'move') return [];
  return s.pieces.filter((p) => p.owner === s.currentPlayer && rawMovesForPiece(s, p).length > 0).map((p) => p.id);
}

export function representativeMoves(moves: Move[]): Move[] {
  const order: string[] = [];
  const best = new Map<string, Move>();
  for (const m of moves) {
    const end = m.path[m.path.length - 1]!;
    const k = String(cellIdx(end));
    const cur = best.get(k);
    if (!cur) { best.set(k, m); order.push(k); }
    else if (cur.breakEdge !== null && m.breakEdge === null) best.set(k, m);
  }
  return order.map((k) => best.get(k)!);
}

export function applyMove(s: GameState, move: Move): ActionResult {
  if (s.phase !== 'move') return { ok: false, error: 'WRONG_PHASE' };
  const piece = s.pieces.find((p) => p.id === move.pieceId);
  if (!piece) return { ok: false, error: 'UNKNOWN_PIECE' };
  if (piece.owner !== s.currentPlayer) return { ok: false, error: 'NOT_YOUR_PIECE' };
  const legal = rawMovesForPiece(s, piece).find(
    (m) => m.dirs.length === move.dirs.length && m.dirs.every((d, i) => d === move.dirs[i]) && edgeEq(m.breakEdge, move.breakEdge ?? null),
  );
  if (!legal) return { ok: false, error: 'ILLEGAL_MOVE' };

  const dest = legal.path[legal.path.length - 1]!;
  const from = { ...piece.pos };
  const hWalls = s.hWalls.slice(), vWalls = s.vWalls.slice();
  if (legal.breakEdge) (legal.breakEdge.o === 'H' ? hWalls : vWalls)[edgeIdx(legal.breakEdge)] = NO_WALL;
  const wallBreakUsed = s.wallBreakUsed.slice();
  if (legal.breakEdge) wallBreakUsed[piece.owner] = true;
  const events: GameEvent[] = [
    { type: 'pieceMoved', pieceId: piece.id, from, path: legal.path.map((c) => ({ ...c })), brokenEdge: legal.breakEdge ? { ...legal.breakEdge } : null },
  ];
  let next: GameState = {
    ...s,
    pieces: s.pieces.map((p) => (p.id === piece.id ? { ...p, pos: { ...dest } } : p)),
    hWalls, vWalls, wallBreakUsed,
    log: [...s.log, { t: 'move', player: s.currentPlayer, move: { ...legal, dirs: [...legal.dirs], path: legal.path.map((c) => ({ ...c })) } }],
  };
  if (wallOptions(next, dest).length > 0) {
    next = { ...next, phase: 'wall', pendingWall: { pieceId: piece.id, cell: { ...dest } } };
    events.push({ type: 'phaseChanged', phase: 'wall' });
    return { ok: true, state: next, events };
  }
  events.push({ type: 'wallSkipped', cell: { ...dest } });
  const r = advanceTurn(next, events);
  return { ok: true, state: r.state, events: r.events };
}

export { pieceAt };
