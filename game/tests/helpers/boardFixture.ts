import type { Edge, GameState, Piece, PlayerCount, PlayerId, WallValue } from '../../src/logic/types';
import { NEUTRAL_WALL, NO_WALL } from '../../src/logic/types';

type Overrides = Partial<GameState> & { playerCount?: PlayerCount };

const CHARS: Record<string, [PlayerId, 'circle' | 'square']> = {
  A: [0, 'circle'], a: [0, 'square'], B: [1, 'circle'], b: [1, 'square'], C: [2, 'circle'], c: [2, 'square'],
};

export interface PieceSpec { ch: string; x: number; y: number; }

function finalize(pieceSpecs: PieceSpec[], hWalls: WallValue[], vWalls: WallValue[], overrides?: Overrides): GameState {
  const raw = pieceSpecs
    .map((p) => ({ ...p, owner: CHARS[p.ch]![0], kind: CHARS[p.ch]![1] }))
    .sort((a, b) => a.owner - b.owner || (a.kind === b.kind ? 0 : a.kind === 'circle' ? -1 : 1) || a.y * 9 + a.x - (b.y * 9 + b.x));
  const counters = new Map<string, number>();
  const pieces: Piece[] = raw.map((p) => {
    const k = `${p.owner}${p.kind}`;
    const n = counters.get(k) ?? 0;
    counters.set(k, n + 1);
    return { id: `p${p.owner}-${p.kind === 'circle' ? 'c' : 's'}${n}`, owner: p.owner, kind: p.kind, pos: { x: p.x, y: p.y } };
  });
  const maxP = pieces.reduce((m, p) => Math.max(m, p.owner), 1);
  const playerCount = (overrides?.playerCount ?? (maxP + 1)) as PlayerCount;
  const { playerCount: _pc, ...rest } = overrides ?? {};
  void _pc;
  return {
    config: { playerCount, playerNames: Array.from({ length: playerCount }, (_, i) => `プレイヤー${i + 1}`) },
    phase: 'move', currentPlayer: 0, pieces, hWalls, vWalls,
    wallBreakUsed: new Array(playerCount).fill(false),
    placementQueue: [], pendingWall: null, turnCount: 0, consecutivePasses: 0, log: [], result: null,
    ...rest,
  };
}

export function fx(ascii: string, overrides?: Overrides): GameState {
  const lines = ascii.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length !== 19 || lines.some((l) => l.length !== 19)) {
    throw new Error(`fixture must be 19x19, got ${lines.length} lines (${lines.map((l) => l.length).join(',')})`);
  }
  const h: WallValue[] = new Array(72).fill(NO_WALL);
  const v: WallValue[] = new Array(72).fill(NO_WALL);
  const specs: PieceSpec[] = [];
  for (let y = 0; y < 9; y++) {
    const row = lines[2 * y + 1]!;
    for (let x = 0; x < 9; x++) {
      const ch = row[2 * x + 1]!;
      if (ch !== '.' && ch !== ' ') {
        if (!CHARS[ch]) throw new Error(`bad char ${ch}`);
        specs.push({ ch, x, y });
      }
      if (x < 8 && row[2 * x + 2] === '|') v[y * 8 + x] = NEUTRAL_WALL;
    }
    if (y < 8) {
      const hr = lines[2 * y + 2]!;
      for (let x = 0; x < 9; x++) if (hr[2 * x + 1] === '-') h[y * 9 + x] = NEUTRAL_WALL;
    }
  }
  return finalize(specs, h, v, overrides);
}

/** プログラム的に組み立てる版(ASCII を書くまでもないテスト用) */
export function build(pieces: [string, number, number][], walls: Edge[] = [], overrides?: Overrides): GameState {
  const h: WallValue[] = new Array(72).fill(NO_WALL);
  const v: WallValue[] = new Array(72).fill(NO_WALL);
  for (const e of walls) (e.o === 'H' ? h : v)[e.o === 'H' ? e.y * 9 + e.x : e.y * 8 + e.x] = NEUTRAL_WALL;
  return finalize(pieces.map(([ch, x, y]) => ({ ch, x, y })), h, v, overrides);
}

export function toAscii(s: GameState): string {
  const grid: string[][] = Array.from({ length: 19 }, (_, r) => Array.from({ length: 19 }, (_, c) => (r % 2 === 0 ? (c % 2 === 0 ? '+' : ' ') : (c % 2 === 0 ? ' ' : '.'))));
  for (let i = 0; i < 19; i++) { grid[0]![i] = i % 2 ? '-' : '+'; grid[18]![i] = i % 2 ? '-' : '+'; grid[i]![0] = i % 2 ? '|' : '+'; grid[i]![18] = i % 2 ? '|' : '+'; }
  for (const p of s.pieces) {
    const ch = 'ABC'[p.owner]!;
    grid[2 * p.pos.y + 1]![2 * p.pos.x + 1] = p.kind === 'circle' ? ch : ch.toLowerCase();
  }
  s.vWalls.forEach((w, i) => { if (w !== NO_WALL) grid[2 * Math.floor(i / 8) + 1]![2 * (i % 8) + 2] = '|'; });
  s.hWalls.forEach((w, i) => { if (w !== NO_WALL) grid[2 * Math.floor(i / 9) + 2]![2 * (i % 9) + 1] = '-'; });
  return grid.map((r) => r.join('')).join('\n');
}

export const SAMPLE_S1 = `
+-+-+-+-+-+-+-+-+-+
|. . . . . . . . .|
+ + + + + + + + + +
|. b . . . . . . .|
+ + + + + + + + + +
|. . B . . . A . .|
+ + + + +-+ + + + +
|. . . . . . . . .|
+ + + + + + + + + +
|. . . . . . a . .|
+ + + + + + + + + +
|. . . . . . . . .|
+-+-+-+ + + + + + +
|. . A|. . . B . .|
+ + + + + + + + + +
|. . .|. b . . . .|
+ + + + + + + + + +
|a . .|. . . . . .|
+-+-+-+-+-+-+-+-+-+
`;

export const NEAR_END = `
+-+-+-+-+-+-+-+-+-+
|. . . .|. . . . .|
+ + + + + + + + + +
|. . . .|. . . . .|
+ + + + + + + + + +
|. . . .|. . B . .|
+ + + + + + + + + +
|. a . .|. . . b .|
+ + + + + + + + + +
|. . . .|. . . . .|
+ + + + + + + + + +
|. . . .|. b . . .|
+ + + + + + + + + +
|. . A .|. . B . .|
+ + + + + + + + + +
|. . . .|. . . . .|
+ + + + + + + + + +
|. a . A . . . . .|
+-+-+-+-+-+-+-+-+-+
`;
