export type AnimKind = 'move' | 'wallRise' | 'wallBreak' | 'drop';
export interface AnimRecord { kind: AnimKind; startedAt: number; endedAt: number | null; }

interface Active { start: number; dur: number; update: (t: number) => void; done: () => void; rec: AnimRecord; }

/** 入力ロック判定の源(8.5)。tick は描画ループから毎フレーム呼ぶ。 */
export class Animator {
  private active = new Set<Active>();
  readonly records: AnimRecord[] = [];

  run(kind: AnimKind, durationMs: number, update: (t: number) => void): Promise<void> {
    const rec: AnimRecord = { kind, startedAt: performance.now(), endedAt: null };
    this.records.push(rec);
    if (this.records.length > 20) this.records.shift();
    return new Promise<void>((resolve) => {
      update(0);
      this.active.add({ start: rec.startedAt, dur: durationMs, update, done: resolve, rec });
    });
  }

  tick(now: number): void {
    for (const a of [...this.active]) {
      const t = (now - a.start) / a.dur;
      if (t >= 1) {
        a.update(1);
        a.rec.endedAt = performance.now();
        this.active.delete(a);
        a.done();
      } else a.update(t < 0 ? 0 : t);
    }
  }

  isBusy(): boolean { return this.active.size > 0; }
}
