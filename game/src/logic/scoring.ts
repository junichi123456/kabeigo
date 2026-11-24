import { computeRegions } from './regions';
import type { EndReason, GameResult, GameState, PlayerId, PlayerScore, RankEntry } from './types';

export function computeScores(s: GameState): PlayerScore[] {
  const regions = computeRegions(s);
  const out: PlayerScore[] = [];
  for (let p = 0; p < s.config.playerCount; p++) {
    let territory = 0, bc = 0, bp = 1;
    for (const r of regions) {
      if (r.owners.length !== 1 || r.owners[0] !== p) continue;
      territory += r.cells.length;
      const pc = r.piecesByPlayer[p]!;
      const lhs = r.cells.length * bp, rhs = bc * pc;
      if (lhs > rhs || (lhs === rhs && r.cells.length > bc)) { bc = r.cells.length; bp = pc; }
    }
    out.push({ player: p as PlayerId, territory, bestRegionCells: bc, bestRegionPieces: bp });
  }
  return out;
}

export function compareEfficiency(a: PlayerScore, b: PlayerScore): number {
  return a.bestRegionCells * b.bestRegionPieces - b.bestRegionCells * a.bestRegionPieces;
}

export function rankPlayers(scores: PlayerScore[], reason: EndReason): GameResult {
  const sorted = [...scores].sort((a, b) => {
    if (b.territory !== a.territory) return b.territory - a.territory;
    const e = compareEfficiency(b, a);
    return e !== 0 ? e : a.player - b.player;
  });
  const ranking: RankEntry[] = [];
  sorted.forEach((sc, i) => {
    const prev = ranking[i - 1];
    const tie = prev && prev.score.territory === sc.territory && compareEfficiency(prev.score, sc) === 0;
    ranking.push({ player: sc.player, rank: tie ? prev.rank : i + 1, score: sc });
  });
  const winners = ranking.filter((r) => r.rank === 1).map((r) => r.player).sort((a, b) => a - b);
  let decidedBy: GameResult['decidedBy'];
  if (winners.length > 1) decidedBy = 'draw';
  else {
    const top = sorted[0]!;
    const tiedOnTerritory = sorted.filter((x) => x.territory === top.territory).length > 1;
    decidedBy = tiedOnTerritory ? 'efficiency' : 'territory';
  }
  ranking.sort((a, b) => a.rank - b.rank || a.player - b.player);
  return { reason, ranking, winners, decidedBy };
}
