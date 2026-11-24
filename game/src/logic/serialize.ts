import type { GameState } from './types';

export function serialize(s: GameState): string { return JSON.stringify(s); }

function fail(msg: string): never { throw new Error(`invalid state: ${msg}`); }

export function deserialize(json: string): GameState {
  const s = JSON.parse(json) as GameState;
  if (!s || typeof s !== 'object') fail('not an object');
  const n = s.config?.playerCount;
  if (n !== 2 && n !== 3) fail('playerCount');
  if (!Array.isArray(s.config.playerNames) || s.config.playerNames.length !== n) fail('playerNames');
  if (!['placement', 'move', 'wall', 'finished'].includes(s.phase)) fail('phase');
  if (!Array.isArray(s.hWalls) || s.hWalls.length !== 72) fail('hWalls');
  if (!Array.isArray(s.vWalls) || s.vWalls.length !== 72) fail('vWalls');
  if (!Array.isArray(s.wallBreakUsed) || s.wallBreakUsed.length !== n) fail('wallBreakUsed');
  if (!Array.isArray(s.pieces)) fail('pieces');
  for (const p of s.pieces) {
    if (!p || typeof p.id !== 'string' || !(p.owner >= 0 && p.owner < n) || !p.pos || p.pos.x < 0 || p.pos.x > 8 || p.pos.y < 0 || p.pos.y > 8) fail('piece');
  }
  if (!Array.isArray(s.placementQueue) || !Array.isArray(s.log)) fail('arrays');
  if (!(s.currentPlayer >= 0 && s.currentPlayer < n)) fail('currentPlayer');
  if (s.phase === 'wall' && !s.pendingWall) fail('pendingWall');
  if (s.phase === 'finished' && !s.result) fail('result');
  return s;
}
