import { DIRS, edgeBetween, hasWall, idxToCell, neighbor, cellIdx } from './board';
import type { Cell, GameState, PlayerId, Region } from './types';

export function computeRegions(s: GameState): Region[] {
  const n = s.config.playerCount;
  const visited = new Array<boolean>(81).fill(false);
  const pieceAtIdx = new Map<number, PlayerId>();
  const pieceCount = new Map<number, number[]>();
  for (const p of s.pieces) pieceCount.set(cellIdx(p.pos), [...(pieceCount.get(cellIdx(p.pos)) ?? []), p.owner]);
  void pieceAtIdx;
  const regions: Region[] = [];
  for (let i = 0; i < 81; i++) {
    if (visited[i]) continue;
    const idxs: number[] = [];
    const stack = [i];
    visited[i] = true;
    while (stack.length) {
      const cur = stack.pop()!;
      idxs.push(cur);
      const c = idxToCell(cur);
      for (const d of DIRS) {
        const nb = neighbor(c, d);
        if (!nb) continue;
        const ni = cellIdx(nb);
        if (visited[ni] || hasWall(s, edgeBetween(c, nb))) continue;
        visited[ni] = true;
        stack.push(ni);
      }
    }
    idxs.sort((a, b) => a - b);
    const piecesByPlayer = new Array<number>(n).fill(0);
    for (const ix of idxs) for (const o of pieceCount.get(ix) ?? []) piecesByPlayer[o]!++;
    const owners: PlayerId[] = [];
    piecesByPlayer.forEach((cnt, p) => { if (cnt > 0) owners.push(p as PlayerId); });
    regions.push({ id: regions.length, cells: idxs.map(idxToCell) as Cell[], owners, piecesByPlayer });
  }
  return regions;
}

export function isSeparated(s: GameState): boolean {
  return computeRegions(s).every((r) => r.owners.length <= 1);
}

export function isSettled(s: GameState, p: PlayerId): boolean {
  const regions = computeRegions(s);
  return settledIn(regions, s, p);
}

export function settledIn(regions: Region[], s: GameState, p: PlayerId): boolean {
  const mine = s.pieces.filter((x) => x.owner === p);
  if (mine.length === 0) return false;
  return mine.every((pc) => {
    const r = regions.find((rg) => rg.cells.some((c) => c.x === pc.pos.x && c.y === pc.pos.y))!;
    return r.owners.length === 1 && r.owners[0] === p;
  });
}

export function cellOwnerMap(s: GameState): (PlayerId | null)[] {
  const map: (PlayerId | null)[] = new Array(81).fill(null);
  for (const r of computeRegions(s)) {
    if (r.owners.length === 1) for (const c of r.cells) map[cellIdx(c)] = r.owners[0]!;
  }
  return map;
}
