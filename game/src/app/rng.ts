/** CPU 用の乱数。?seed=N を付けると再現可能(E2E・デバッグ用)。ロジック層は rng を引数で受け取るだけ。 */
export function makeRng(): () => number {
  let seed: number | null = null;
  try { const v = new URLSearchParams(location.search).get('seed'); if (v !== null && v !== '' && !Number.isNaN(Number(v))) seed = Number(v); } catch { /* 無視 */ }
  if (seed === null) return Math.random;
  let a = seed | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
