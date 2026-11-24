import type { Cell } from './types';

export const BOARD_SIZE = 9;
export const MAX_TURNS = 200;
export const SQUARES_PER_PLAYER = 2;
export const PLAYER_COLORS = ['#E53935', '#1E88E5', '#FDD835'] as const;

export const CIRCLE_START: Record<2 | 3, Cell[][]> = {
  2: [ [{ x: 6, y: 2 }, { x: 2, y: 6 }], [{ x: 2, y: 2 }, { x: 6, y: 6 }] ],
  3: [ [{ x: 2, y: 6 }], [{ x: 6, y: 2 }], [{ x: 6, y: 6 }] ],
};
