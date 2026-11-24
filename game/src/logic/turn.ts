import { MAX_TURNS } from './constants';
import { computeRegions, settledIn } from './regions';
import { computeScores, rankPlayers } from './scoring';
import { rawMovesForPiece } from './moves';
import type { EndReason, GameEvent, GameState, PlayerId } from './types';

function finish(s: GameState, events: GameEvent[], reason: EndReason): { state: GameState; events: GameEvent[] } {
  const result = rankPlayers(computeScores(s), reason);
  const state: GameState = { ...s, phase: 'finished', pendingWall: null, result };
  return { state, events: [...events, { type: 'phaseChanged', phase: 'finished' }, { type: 'gameEnded', result }] };
}

function hasMoves(s: GameState, p: PlayerId): boolean {
  return s.pieces.some((pc) => pc.owner === p && rawMovesForPiece({ ...s, phase: 'move' }, pc).length > 0);
}

/**
 * 手番終了処理(4.9)。initial=true は配置フェーズ直後の最初の手番決定用(turnCount を進めない)。
 */
export function advanceTurn(s: GameState, events: GameEvent[], initial = false): { state: GameState; events: GameEvent[] } {
  let st: GameState = { ...s, phase: 'move', pendingWall: null };
  const ev = [...events];
  if (!initial) st = { ...st, turnCount: st.turnCount + 1, consecutivePasses: 0 };
  let regions = computeRegions(st);
  if (regions.every((r) => r.owners.length <= 1)) return finish(st, ev, 'separated');
  if (st.turnCount >= MAX_TURNS) return finish(st, ev, 'turnLimit');

  const n = st.config.playerCount;
  const base = st.currentPlayer;
  for (let i = 1; i <= n; i++) {
    const p = ((base + i) % n) as PlayerId;
    regions = computeRegions(st);
    if (settledIn(regions, st, p)) {
      ev.push({ type: 'playerSkipped', player: p });
      st = { ...st, log: [...st.log, { t: 'skip', player: p }] };
      continue;
    }
    if (!hasMoves(st, p)) {
      ev.push({ type: 'turnPassed', player: p });
      st = { ...st, turnCount: st.turnCount + 1, consecutivePasses: st.consecutivePasses + 1, log: [...st.log, { t: 'pass', player: p }] };
      let unsettled = 0;
      for (let q = 0; q < n; q++) if (!settledIn(regions, st, q as PlayerId)) unsettled++;
      if (st.consecutivePasses >= unsettled) return finish(st, ev, 'allPassed');
      if (st.turnCount >= MAX_TURNS) return finish(st, ev, 'turnLimit');
      continue;
    }
    st = { ...st, currentPlayer: p, phase: 'move' };
    ev.push({ type: 'turnStarted', player: p });
    return { state: st, events: ev };
  }
  return finish(st, ev, 'allPassed');
}
