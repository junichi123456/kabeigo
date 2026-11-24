import { describe, expect, it } from 'vitest';
import { edgeBetween, edgesOfCell, neighbor, perpendicular, DIRS } from '../../src/logic';

describe('board', () => {
  it('edgeBetween', () => {
    expect(edgeBetween({ x: 4, y: 4 }, { x: 4, y: 5 })).toEqual({ o: 'H', x: 4, y: 4 });
    expect(edgeBetween({ x: 4, y: 4 }, { x: 4, y: 3 })).toEqual({ o: 'H', x: 4, y: 3 });
    expect(edgeBetween({ x: 4, y: 4 }, { x: 5, y: 4 })).toEqual({ o: 'V', x: 4, y: 4 });
    expect(edgeBetween({ x: 4, y: 4 }, { x: 3, y: 4 })).toEqual({ o: 'V', x: 3, y: 4 });
    expect(() => edgeBetween({ x: 0, y: 0 }, { x: 2, y: 0 })).toThrow();
  });
  it('edgesOfCell', () => {
    expect(edgesOfCell({ x: 0, y: 0 })).toEqual([{ o: 'V', x: 0, y: 0 }, { o: 'H', x: 0, y: 0 }]);
    expect(edgesOfCell({ x: 4, y: 4 })).toHaveLength(4);
    expect(edgesOfCell({ x: 8, y: 4 })).toHaveLength(3);
  });
  it('neighbor out of bounds', () => {
    expect(neighbor({ x: 0, y: 0 }, 'N')).toBeNull();
    expect(neighbor({ x: 8, y: 8 }, 'E')).toBeNull();
    expect(neighbor({ x: 4, y: 4 }, 'S')).toEqual({ x: 4, y: 5 });
  });
  it('perpendicular', () => {
    expect(perpendicular('N')).toEqual(['E', 'W']);
    expect(perpendicular('S')).toEqual(['E', 'W']);
    expect(perpendicular('E')).toEqual(['N', 'S']);
    expect(perpendicular('W')).toEqual(['N', 'S']);
    expect(DIRS).toEqual(['N', 'E', 'S', 'W']);
  });
});
