import { describe, expect, it } from 'vitest';
import { CAMERA_MOVE_MS, HOP_HEIGHT, MOVE_DURATION_MS, easeInOutCubic, samplePath } from '../../src/render/animMath';

describe('animMath', () => {
  it('MOVE_DURATION_MS is within 0.7–0.9s; camera move is 1.2s', () => {
    expect(MOVE_DURATION_MS).toBeGreaterThanOrEqual(700);
    expect(MOVE_DURATION_MS).toBeLessThanOrEqual(900);
    expect(CAMERA_MOVE_MS).toBe(1200);
  });
  it('easeInOutCubic endpoints and monotonic', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    let prev = -1;
    for (let i = 0; i <= 100; i++) { const v = easeInOutCubic(i / 100); expect(v).toBeGreaterThanOrEqual(prev); prev = v; }
  });
  it('samplePath: one step midpoint hops', () => {
    const p = samplePath([{ x: 4, y: 4 }, { x: 5, y: 4 }], 0.5);
    expect(p.x).toBeCloseTo(4.5); expect(p.y).toBeCloseTo(4); expect(p.hop).toBeCloseTo(HOP_HEIGHT);
  });
  it('samplePath: two steps pass the corner at t=0.5 without a stop-and-go split', () => {
    const pts = [{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 5, y: 3 }];
    const c = samplePath(pts, 0.5);
    expect(c.x).toBeCloseTo(5); expect(c.y).toBeCloseTo(4); expect(c.hop).toBeCloseTo(0, 6);
    const e = samplePath(pts, 1), s = samplePath(pts, 0);
    expect([e.x, e.y]).toEqual([5, 3]); expect([s.x, s.y]).toEqual([4, 4]);
  });
  it('samplePath clamps t', () => {
    const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
    expect(samplePath(pts, -3).x).toBe(0);
    expect(samplePath(pts, 7).x).toBe(1);
  });
});
