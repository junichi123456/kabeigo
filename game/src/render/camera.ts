import * as THREE from 'three';
import { CAMERA_MOVE_MS, easeInOutCubic } from './animMath';

const FOV = 40;
const TAN_HALF = Math.tan((FOV * Math.PI) / 360);
const D2R = Math.PI / 180;
export const FIT_RADIUS = 6.4;       // 俯瞰(斜め)ポーズ: 7.5 節の球フィット
/** 真上ポーズ: 盤の外枠(半幅 4.8)に余白を足した半幅。横幅(または短辺)いっぱいに表示する */
export const TOP_FIT_HALF = 5.1;

export type CameraMode = 'oblique' | 'top';
export interface CameraRecord { kind: 'camera'; startedAt: number; endedAt: number | null; }

interface Pose { elev: number; dist: number; tz: number; }

function obliquePose(aspect: number): Pose {
  const vFov = FOV * D2R;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const d = FIT_RADIUS / Math.sin(Math.min(vFov, hFov) / 2);
  return { elev: 58, dist: Math.max(10, Math.min(60, d)), tz: 0.3 };
}
function topPose(aspect: number): Pose {
  // 縦横どちらか狭い方に盤が収まる最小距離(= 可能な限り最大表示)
  const d = Math.max(TOP_FIT_HALF / TAN_HALF, TOP_FIT_HALF / (TAN_HALF * aspect));
  return { elev: 90, dist: d, tz: 0 };
}

/** カメラ姿勢の管理。斜め俯瞰 ⇄ 真上を CAMERA_MOVE_MS(1.2 秒)で移動する。 */
export class CameraRig {
  readonly records: CameraRecord[] = [];
  private k = 0;          // 0 = 斜め, 1 = 真上
  private from = 0;
  private to = 0;
  private start = 0;
  private active = false;
  private aspect = 1;

  constructor(readonly camera: THREE.PerspectiveCamera) {
    camera.fov = FOV;
    camera.up.set(0, 0, -1);
    this.apply();
  }

  get mode(): CameraMode { return this.to === 1 ? 'top' : 'oblique'; }
  get moving(): boolean { return this.active; }
  get elevationDeg(): number { return this.pose().elev; }

  setAspect(a: number): void { this.aspect = a; this.apply(); }

  setMode(mode: CameraMode, animate = true): void {
    const to = mode === 'top' ? 1 : 0;
    if (!animate) { this.to = to; this.k = to; this.active = false; this.apply(); return; }
    if (this.to === to && (this.active || this.k === to)) return;
    this.from = this.k;
    this.to = to;
    this.start = performance.now();
    this.active = true;
    this.records.push({ kind: 'camera', startedAt: this.start, endedAt: null });
    if (this.records.length > 20) this.records.shift();
  }

  update(now: number): void {
    if (!this.active) return;
    const t = (now - this.start) / CAMERA_MOVE_MS;
    if (t >= 1) {
      this.k = this.to; this.active = false;
      const r = this.records[this.records.length - 1];
      if (r && r.endedAt === null) r.endedAt = performance.now();
    } else this.k = this.from + (this.to - this.from) * easeInOutCubic(t);
    this.apply();
  }

  private pose(): Pose {
    const a = obliquePose(this.aspect), b = topPose(this.aspect), k = this.k;
    return { elev: a.elev + (b.elev - a.elev) * k, dist: a.dist + (b.dist - a.dist) * k, tz: a.tz + (b.tz - a.tz) * k };
  }

  private apply(): void {
    const p = this.pose();
    const e = p.elev * D2R;
    const cam = this.camera;
    cam.aspect = this.aspect;
    cam.position.set(0, p.dist * Math.sin(e), p.tz + p.dist * Math.cos(e));
    cam.up.set(0, 0, -1);
    cam.lookAt(0, 0, p.tz);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
  }
}

export function createCamera(): THREE.PerspectiveCamera {
  return new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
}
