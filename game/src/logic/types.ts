export type PlayerId = 0 | 1 | 2;
export type PlayerCount = 2 | 3;
export type Dir = 'N' | 'E' | 'S' | 'W';
export type PieceKind = 'circle' | 'square';

export interface Cell { x: number; y: number; }
export interface Edge { o: 'H' | 'V'; x: number; y: number; }

/** 壁配列の値: -1 = 壁なし, 0..2 = 建てたプレイヤー, 3 = 中立(テスト用フィクスチャ) */
export type WallValue = -1 | 0 | 1 | 2 | 3;
export const NO_WALL = -1;
export const NEUTRAL_WALL = 3;

export interface Piece { id: string; owner: PlayerId; kind: PieceKind; pos: Cell; }

export interface GameConfig { playerCount: PlayerCount; playerNames: string[]; }

export type Phase = 'placement' | 'move' | 'wall' | 'finished';

export interface Move {
  pieceId: string;
  dirs: Dir[];
  path: Cell[];
  breakEdge: Edge | null;
}

export interface PendingWall { pieceId: string; cell: Cell; }

export type EndReason = 'separated' | 'turnLimit' | 'allPassed';

export interface PlayerScore {
  player: PlayerId;
  territory: number;
  bestRegionCells: number;
  bestRegionPieces: number;
}

export interface RankEntry { player: PlayerId; rank: number; score: PlayerScore; }

export interface GameResult {
  reason: EndReason;
  ranking: RankEntry[];
  winners: PlayerId[];
  decidedBy: 'territory' | 'efficiency' | 'draw';
}

export interface Region {
  id: number;
  cells: Cell[];
  owners: PlayerId[];
  piecesByPlayer: number[];
}

export type LogEntry =
  | { t: 'place'; player: PlayerId; pieceId: string; cell: Cell }
  | { t: 'move'; player: PlayerId; move: Move }
  | { t: 'wall'; player: PlayerId; edge: Edge }
  | { t: 'pass'; player: PlayerId }
  | { t: 'skip'; player: PlayerId };

export interface GameState {
  config: GameConfig;
  phase: Phase;
  currentPlayer: PlayerId;
  pieces: Piece[];
  hWalls: WallValue[];
  vWalls: WallValue[];
  wallBreakUsed: boolean[];
  placementQueue: PlayerId[];
  pendingWall: PendingWall | null;
  turnCount: number;
  consecutivePasses: number;
  log: LogEntry[];
  result: GameResult | null;
}

export type GameEvent =
  | { type: 'squarePlaced'; pieceId: string; cell: Cell }
  | { type: 'phaseChanged'; phase: Phase }
  | { type: 'pieceMoved'; pieceId: string; from: Cell; path: Cell[]; brokenEdge: Edge | null }
  | { type: 'wallPlaced'; edge: Edge; owner: PlayerId }
  | { type: 'wallSkipped'; cell: Cell }
  | { type: 'turnStarted'; player: PlayerId }
  | { type: 'turnPassed'; player: PlayerId }
  | { type: 'playerSkipped'; player: PlayerId }
  | { type: 'gameEnded'; result: GameResult };

export type ErrorCode =
  | 'WRONG_PHASE' | 'OUT_OF_BOUNDS' | 'CELL_OCCUPIED'
  | 'NOT_YOUR_PIECE' | 'ILLEGAL_MOVE' | 'ILLEGAL_WALL' | 'UNKNOWN_PIECE';

export type ActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: ErrorCode };
