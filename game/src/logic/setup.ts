import { BOARD_SIZE, CIRCLE_START, SQUARES_PER_PLAYER } from './constants';
import { cellIdx, inBounds, pieceAt, idxToCell } from './board';
import { NO_WALL } from './types';
import type { ActionResult, Cell, GameConfig, GameEvent, GameState, Piece, PlayerId } from './types';
import { advanceTurn } from './turn';

export function createGame(config: GameConfig): GameState {
  const n = config.playerCount;
  const names = Array.from({ length: n }, (_, i) => (config.playerNames[i]?.trim() ? config.playerNames[i]! : `プレイヤー${i + 1}`));
  const pieces: Piece[] = [];
  for (let p = 0; p < n; p++) {
    CIRCLE_START[n][p]!.forEach((c, i) => pieces.push({ id: `p${p}-c${i}`, owner: p as PlayerId, kind: 'circle', pos: { ...c } }));
  }
  const queue: PlayerId[] = [];
  for (let r = 0; r < SQUARES_PER_PLAYER; r++) for (let p = 0; p < n; p++) queue.push(p as PlayerId);
  return {
    config: { playerCount: n, playerNames: names },
    phase: 'placement',
    currentPlayer: 0,
    pieces,
    hWalls: new Array(72).fill(NO_WALL),
    vWalls: new Array(72).fill(NO_WALL),
    wallBreakUsed: new Array(n).fill(false),
    placementQueue: queue,
    pendingWall: null,
    turnCount: 0,
    consecutivePasses: 0,
    log: [],
    result: null,
  };
}

export function legalPlacementCells(s: GameState): Cell[] {
  if (s.phase !== 'placement') return [];
  const occ = new Set(s.pieces.map((p) => cellIdx(p.pos)));
  const out: Cell[] = [];
  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) if (!occ.has(i)) out.push(idxToCell(i));
  return out;
}

/** s.pieces の順序: 生成順固定(p0-c*, p0-s*, p1-c*, ...) */
function insertPiece(pieces: Piece[], piece: Piece): Piece[] {
  const rank = (p: Piece) => p.owner * 100 + (p.kind === 'circle' ? 0 : 50) + Number(p.id.split('-')[1]!.slice(1));
  return [...pieces, piece].sort((a, b) => rank(a) - rank(b));
}

export function placeSquare(s: GameState, cell: Cell): ActionResult {
  if (s.phase !== 'placement') return { ok: false, error: 'WRONG_PHASE' };
  if (!inBounds(cell)) return { ok: false, error: 'OUT_OF_BOUNDS' };
  if (pieceAt(s, cell)) return { ok: false, error: 'CELL_OCCUPIED' };
  const player = s.placementQueue[0]!;
  const n = s.pieces.filter((p) => p.owner === player && p.kind === 'square').length;
  const piece: Piece = { id: `p${player}-s${n}`, owner: player, kind: 'square', pos: { x: cell.x, y: cell.y } };
  const events: GameEvent[] = [{ type: 'squarePlaced', pieceId: piece.id, cell: { ...cell } }];
  let next: GameState = {
    ...s,
    pieces: insertPiece(s.pieces, piece),
    placementQueue: s.placementQueue.slice(1),
    log: [...s.log, { t: 'place', player, pieceId: piece.id, cell: { ...cell } }],
  };
  if (next.placementQueue.length > 0) {
    next.currentPlayer = next.placementQueue[0]!;
    events.push({ type: 'turnStarted', player: next.currentPlayer });
    return { ok: true, state: next, events };
  }
  next = { ...next, phase: 'move', currentPlayer: 0 };
  events.push({ type: 'phaseChanged', phase: 'move' });
  // 最初の手番は P0 から。通常の手番決定ロジックを流用する(P0 から探索)。
  const r = advanceTurn({ ...next, currentPlayer: (next.config.playerCount - 1) as PlayerId }, events, true);
  return { ok: true, state: r.state, events: r.events };
}
