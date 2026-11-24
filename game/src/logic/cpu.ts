import { DIRS, cellIdx, edgeBetween, hasWall, idxToCell, neighbor } from './board';
import { legalMoves } from './moves';
import { applyMove } from './moves';
import { legalPlacementCells, placeSquare } from './setup';
import { applyWall, wallOptions } from './walls';
import type { Cell, Edge, GameState, Move, PlayerId } from './types';

/**
 * 簡易 CPU(仕様 9 章を拡張)。純粋関数: 乱数は呼び出し側から rng() で受け取る。
 * 方針: 各「移動 + 壁」候補を 1 手先まで実際に適用し、結果の盤面を評価して最良手(同点は rng)を選ぶ。
 *   - 終局する手は勝敗で直接評価(勝ち +1000 / 引き分け 0 / 負け -1000 に支配マス差を加味)
 *   - 未終局は「距離ベースの陣地推定」: 各マスを、最も近い(同距離は中立)プレイヤーのものとみなした
 *     マス数の差(自分 − 最大の相手)。囲い込み後は実際の支配マス数と一致する。
 *   - 壁破りは貴重なので、使う手には小さな減点
 */

const WIN = 1000;
const BREAK_PENALTY = 2;

/** 各プレイヤーの駒から開いた辺だけを辿る BFS。cellIdx → 最短歩数(到達不能は Infinity) */
function distancesFrom(s: GameState, player: PlayerId): number[] {
  const dist = new Array<number>(81).fill(Infinity);
  const queue: number[] = [];
  for (const p of s.pieces) if (p.owner === player) { const i = cellIdx(p.pos); dist[i] = 0; queue.push(i); }
  for (let h = 0; h < queue.length; h++) {
    const cur = queue[h]!;
    const c = idxToCell(cur);
    for (const d of DIRS) {
      const nb = neighbor(c, d);
      if (!nb) continue;
      const ni = cellIdx(nb);
      if (dist[ni]! !== Infinity || hasWall(s, edgeBetween(c, nb))) continue;
      dist[ni] = dist[cur]! + 1;
      queue.push(ni);
    }
  }
  return dist;
}

/** 距離ベースの陣地推定: プレイヤーごとの「最も近いマス数」 */
export function influenceCounts(s: GameState): number[] {
  const n = s.config.playerCount;
  const ds = Array.from({ length: n }, (_, p) => distancesFrom(s, p as PlayerId));
  const counts = new Array<number>(n).fill(0);
  for (let i = 0; i < 81; i++) {
    let best = Infinity, who = -1, tie = false;
    for (let p = 0; p < n; p++) {
      const d = ds[p]![i]!;
      if (d < best) { best = d; who = p; tie = false; } else if (d === best && d !== Infinity) tie = true;
    }
    if (who >= 0 && !tie && best !== Infinity) counts[who]!++;
  }
  return counts;
}

function evaluate(s: GameState, me: PlayerId): number {
  if (s.phase === 'finished' && s.result) {
    const mine = s.result.ranking.find((r) => r.player === me)!.score.territory;
    const bestOpp = Math.max(...s.result.ranking.filter((r) => r.player !== me).map((r) => r.score.territory));
    const won = s.result.winners.includes(me);
    const sole = won && s.result.winners.length === 1;
    return (sole ? WIN : won ? 0 : -WIN) + (mine - bestOpp);
  }
  const c = influenceCounts(s);
  let opp = -Infinity;
  for (let p = 0; p < c.length; p++) if (p !== me) opp = Math.max(opp, c[p]!);
  return c[me]! - opp;
}

function pickBest<T>(items: { v: T; score: number }[], rng: () => number): T {
  let max = -Infinity;
  for (const it of items) if (it.score > max) max = it.score;
  const top = items.filter((it) => it.score >= max - 1e-9);
  return top[Math.min(top.length - 1, Math.floor(rng() * top.length))]!.v;
}

/** 配置フェーズ: □を置くマスを選ぶ(置いた結果の陣地推定が最良のマス) */
export function chooseCpuPlacement(s: GameState, rng: () => number): Cell {
  const me = s.placementQueue[0] ?? s.currentPlayer;
  const cands: { v: Cell; score: number }[] = [];
  for (const cell of legalPlacementCells(s)) {
    const r = placeSquare(s, cell);
    if (!r.ok) continue;
    cands.push({ v: cell, score: evaluate(r.state, me) });
  }
  return pickBest(cands, rng);
}

/** 移動フェーズ(phase === 'move')の手番: 動かす駒・移動先(壁破り含む)・壁を選ぶ */
export function chooseCpuTurn(s: GameState, rng: () => number): { move: Move; wall: Edge | null } {
  const me = s.currentPlayer;
  const cands: { v: { move: Move; wall: Edge | null }; score: number }[] = [];
  for (const mv of legalMoves(s)) {
    const r1 = applyMove(s, mv);
    if (!r1.ok) continue;
    const pen = mv.breakEdge ? BREAK_PENALTY : 0;
    if (r1.state.phase !== 'wall' || !r1.state.pendingWall) {
      cands.push({ v: { move: mv, wall: null }, score: evaluate(r1.state, me) - pen });
      continue;
    }
    for (const e of wallOptions(r1.state, r1.state.pendingWall.cell)) {
      const r2 = applyWall(r1.state, e);
      if (!r2.ok) continue;
      cands.push({ v: { move: mv, wall: e }, score: evaluate(r2.state, me) - pen });
    }
  }
  return pickBest(cands, rng);
}

/** 壁フェーズだけが残っているとき(移動後)の壁選び */
export function chooseCpuWall(s: GameState, rng: () => number): Edge {
  const me = s.currentPlayer;
  const opts = wallOptions(s, s.pendingWall!.cell);
  return pickBest(opts.map((e) => { const r = applyWall(s, e); return { v: e, score: r.ok ? evaluate(r.state, me) : -Infinity }; }), rng);
}
