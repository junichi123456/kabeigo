// フィクスチャ JSON 生成: npx vite-node tests/e2e/fixtures/make.ts
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { serialize } from '../../../src/logic';
import type { GameState } from '../../../src/logic';
import { NEAR_END, build, fx } from '../../helpers/boardFixture';

const dir = __dirname;

// wallbreak: P0 の □(4,4) の北に壁 H(4,3)。壁破りでのみ北へ進める
const wb = build(
  [['A', 2, 6], ['a', 4, 4], ['B', 6, 2], ['b', 6, 6]],
  [{ o: 'H', x: 4, y: 3 }],
);
writeFileSync(join(dir, 'wallbreak.json'), serialize(wb));

// near-end: 図4(turn.test 1 相当)
const base = fx(NEAR_END);
const pid = base.pieces.find((p) => p.owner === 0 && p.kind === 'circle' && p.pos.x === 3 && p.pos.y === 8)!.id;
const ne: GameState = { ...base, phase: 'wall', currentPlayer: 0, pendingWall: { pieceId: pid, cell: { x: 3, y: 8 } } };
writeFileSync(join(dir, 'near-end.json'), serialize(ne));
console.log('fixtures written; pending piece', pid);
