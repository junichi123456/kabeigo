import type { Cell } from './types';

export const BOARD_SIZE = 9;
export const MAX_TURNS = 200;
export const SQUARES_PER_PLAYER = 1;
export const PLAYER_COLORS = ['#E53935', '#1E88E5', '#FDD835'] as const;

// 全モード共通で各プレイヤーは 〇1 + □1 の計2駒(D-05 改訂)。2人戦は点対称の (2,6) / (6,2)。
export const CIRCLE_START: Record<2 | 3, Cell[][]> = {
  2: [ [{ x: 2, y: 6 }], [{ x: 6, y: 2 }] ],
  3: [ [{ x: 2, y: 6 }], [{ x: 6, y: 2 }], [{ x: 6, y: 6 }] ],
};
