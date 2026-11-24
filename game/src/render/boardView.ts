import * as THREE from 'three';
import { PLAYER_COLORS } from '../logic/constants';
import { cellOwnerMap } from '../logic/regions';
import { edgeKey, edgeIdx } from '../logic/board';
import type { Cell, Edge, GameEvent, GameState, PlayerId } from '../logic/types';
import { Animator } from './animator';
import { HOP_HEIGHT, MOVE_DURATION_MS, PLACE_DROP_MS, WALL_BREAK_MS, WALL_RISE_MS, easeInOutCubic, easeOutBack, easeOutQuad, pathDistance, samplePath } from './animMath';
import { CellOverlay, HighlightView, emptyOverlay } from './highlightView';
import type { Overlay } from './highlightView';
import { PieceObj, makePiece, pulseEmissive } from './pieceView';
import { cellToWorld, edgeMid } from './picking';
import { makeWall, ownMaterial, wallColor } from './wallView';

const dummy = new THREE.Object3D();

export class BoardView {
  readonly root = new THREE.Group();
  readonly highlights = new HighlightView();
  private pieces = new Map<string, PieceObj>();
  private walls = new Map<string, THREE.Mesh>();
  private animating = new Set<string>();
  private breaking = new Set<string>();
  private selectedId: string | null = null;
  private territory: CellOverlay;
  private territoryTarget = 0.18;
  private territoryNow = 0.18;
  private ghostPieceKey = '';
  private lastNow = 0;

  constructor(private animator: Animator) {
    // 台座・溝の下地・枠・マス
    const base = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.4, 10.2), new THREE.MeshLambertMaterial({ color: '#5D4037' }));
    base.position.y = -0.22; base.receiveShadow = true;
    const grout = new THREE.Mesh(new THREE.BoxGeometry(9, 0.02, 9), new THREE.MeshLambertMaterial({ color: '#8D6E4F' }));
    grout.position.y = -0.011;
    grout.receiveShadow = true;
    this.root.add(base, grout);

    const tileGeo = new THREE.PlaneGeometry(0.96, 0.96).rotateX(-Math.PI / 2);
    const tiles = new THREE.InstancedMesh(tileGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), 81);
    const ca = new THREE.Color('#D9B98A'), cb = new THREE.Color('#CFAE7E');
    for (let i = 0; i < 81; i++) {
      const x = i % 9, y = Math.floor(i / 9);
      dummy.position.set(x - 4, 0, y - 4); dummy.updateMatrix();
      tiles.setMatrixAt(i, dummy.matrix);
      tiles.setColorAt(i, (x + y) % 2 === 0 ? ca : cb);
    }
    tiles.receiveShadow = true;
    this.root.add(tiles);

    const frameMat = new THREE.MeshLambertMaterial({ color: '#6D4C41' });
    const mk = (w: number, d: number, x: number, z: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), frameMat);
      m.position.set(x, 0.25, z); m.castShadow = true; m.receiveShadow = true; this.root.add(m);
    };
    mk(9.6, 0.3, 0, -4.65); mk(9.6, 0.3, 0, 4.65); mk(0.3, 9, -4.65, 0); mk(0.3, 9, 4.65, 0);

    this.territory = new CellOverlay(81, 0.96, 0.008, null, 0.18);
    this.root.add(this.territory.mesh, this.highlights.root);
  }

  /** 状態へ即時同期(アニメなし) */
  sync(s: GameState): void {
    const ids = new Set(s.pieces.map((p) => p.id));
    for (const [id, p] of this.pieces) if (!ids.has(id)) { this.root.remove(p.group); this.pieces.delete(id); }
    for (const pc of s.pieces) {
      let o = this.pieces.get(pc.id);
      if (!o) { o = makePiece(pc.kind, pc.owner); this.pieces.set(pc.id, o); this.root.add(o.group); }
      if (!this.animating.has(pc.id)) {
        const w = cellToWorld(pc.pos);
        o.group.position.set(w.x, o.lift, w.z);
      }
    }
    const want = new Map<string, number>();
    s.hWalls.forEach((v, i) => { if (v !== -1) want.set(edgeKey({ o: 'H', x: i % 9, y: Math.floor(i / 9) }), v); });
    s.vWalls.forEach((v, i) => { if (v !== -1) want.set(edgeKey({ o: 'V', x: i % 8, y: Math.floor(i / 8) }), v); });
    for (const [k, m] of this.walls) if (!want.has(k) && !this.breaking.has(k)) { this.root.remove(m); this.walls.delete(k); }
    for (const [k, v] of want) {
      if (this.walls.has(k)) continue;
      const [o, xy] = k.split(':') as ['H' | 'V', string];
      const [x, y] = xy.split(',').map(Number) as [number, number];
      const m = makeWall({ o, x, y }, v as never);
      this.walls.set(k, m); this.root.add(m);
    }
    this.updateTerritory(s, false);
  }

  updateTerritory(s: GameState, strong: boolean): void {
    const owners = cellOwnerMap(s);
    const cells: Cell[] = [], colors: THREE.Color[] = [];
    owners.forEach((o, i) => { if (o !== null) { cells.push({ x: i % 9, y: Math.floor(i / 9) }); colors.push(new THREE.Color(PLAYER_COLORS[o])); } });
    this.territory.set(cells, colors);
    this.territoryTarget = strong ? 0.4 : 0.18;
  }

  setOverlay(o: Overlay, selectedPieceId: string | null): void {
    this.selectedId = selectedPieceId;
    for (const [id, p] of this.pieces) p.liftTarget = id === selectedPieceId ? 0.15 : 0;
    // 配置ゴースト(□)
    const key = String(o.ghostPlayer);
    if (o.selCell && this.ghostPieceKey !== key) {
      this.highlights.setGhostPiece(makePiece('square', o.ghostPlayer as PlayerId, true).group);
      this.ghostPieceKey = key;
    }
    if (!o.selCell && this.ghostPieceKey) { /* 非表示は apply 内で処理 */ }
    this.highlights.apply(o);
  }

  tick(now: number): void {
    const dt = this.lastNow ? Math.min(0.1, (now - this.lastNow) / 1000) : 0.016;
    this.lastNow = now;
    for (const [id, p] of this.pieces) {
      // 選択駒の浮上: 120ms
      const speed = 0.15 / 0.12;
      if (p.lift < p.liftTarget) p.lift = Math.min(p.liftTarget, p.lift + speed * dt);
      else if (p.lift > p.liftTarget) p.lift = Math.max(p.liftTarget, p.lift - speed * dt);
      if (!this.animating.has(id)) p.group.position.y = p.lift;
      pulseEmissive(p, now, id === this.selectedId);
    }
    const d = this.territoryTarget - this.territoryNow;
    if (Math.abs(d) > 1e-4) {
      this.territoryNow += Math.sign(d) * Math.min(Math.abs(d), (0.22 / 0.4) * dt);
      this.territory.mat.opacity = this.territoryNow;
    }
    this.highlights.tick(now);
  }

  /** イベントを順に再生。完了後に呼び出し側が sync する */
  async playEvents(events: GameEvent[], s: GameState): Promise<void> {
    for (const ev of events) {
      if (ev.type === 'squarePlaced') await this.animDrop(ev.pieceId, ev.cell, s);
      else if (ev.type === 'pieceMoved') await this.animMove(ev.pieceId, ev.from, ev.path, ev.brokenEdge);
      else if (ev.type === 'wallPlaced') await this.animWallRise(ev.edge, ev.owner);
    }
  }

  private async animDrop(pieceId: string, cell: Cell, s: GameState): Promise<void> {
    const pc = s.pieces.find((p) => p.id === pieceId);
    if (!pc) return;
    let o = this.pieces.get(pieceId);
    if (!o) { o = makePiece(pc.kind, pc.owner); this.pieces.set(pieceId, o); this.root.add(o.group); }
    this.animating.add(pieceId);
    const w = cellToWorld(cell);
    await this.animator.run('drop', PLACE_DROP_MS, (t) => o!.group.position.set(w.x, 3 * (1 - easeOutQuad(t)), w.z));
    this.animating.delete(pieceId);
  }

  private async animMove(pieceId: string, from: Cell, path: Cell[], brk: Edge | null): Promise<void> {
    const o = this.pieces.get(pieceId);
    if (!o) return;
    const pts = [from, ...path];
    const L = pts.length - 1;
    // 壁破りの開始距離: 破る辺を越える区間 k の中点 − 0.45
    let thr = Infinity;
    if (brk) {
      const mid = edgeMid(brk);
      for (let k = 0; k < L; k++) {
        const a = cellToWorld(pts[k]!), b = cellToWorld(pts[k + 1]!);
        if (Math.abs((a.x + b.x) / 2 - mid.x) < 1e-6 && Math.abs((a.z + b.z) / 2 - mid.z) < 1e-6) thr = k + 0.5 - 0.45;
      }
    }
    let breakP: Promise<void> | null = null;
    this.animating.add(pieceId);
    o.lift = o.liftTarget = 0;
    await this.animator.run('move', MOVE_DURATION_MS, (t) => {
      const sp = samplePath(pts, t);
      o.group.position.set(sp.x - 4, sp.hop, sp.y - 4);
      if (brk && !breakP && pathDistance(pts, t) >= thr) breakP = this.animBreak(brk);
    });
    if (brk && !breakP) breakP = this.animBreak(brk);
    if (breakP) await breakP;
    this.animating.delete(pieceId);
    void HOP_HEIGHT; void easeInOutCubic;
  }

  private async animBreak(e: Edge): Promise<void> {
    const key = edgeKey(e);
    const mesh = this.walls.get(key);
    if (!mesh) return;
    this.breaking.add(key);
    const mat = ownMaterial(mesh);
    const base = mat.color.clone();
    const debris: { m: THREE.Mesh; v: THREE.Vector3 }[] = [];
    const dMat = new THREE.MeshLambertMaterial({ color: base, transparent: true, opacity: 1 });
    const dGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const mid = edgeMid(e);
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(dGeo, dMat);
      m.position.set(mid.x + (Math.random() - 0.5) * 0.6 * (e.o === 'H' ? 1 : 0.2), 0.3, mid.z + (Math.random() - 0.5) * 0.6 * (e.o === 'V' ? 1 : 0.2));
      debris.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 1.6, 1.8 + Math.random(), (Math.random() - 0.5) * 1.6) });
      this.root.add(m);
    }
    await this.animator.run('wallBreak', WALL_BREAK_MS, (t) => {
      mat.color.copy(base).lerp(new THREE.Color(0xff3010), Math.min(1, t * 3));
      const k = Math.max(0.001, 1 - t);
      mesh.scale.y = k; mesh.position.y = 0.25 * k;
      const sec = (t * WALL_BREAK_MS) / 1000;
      debris.forEach(({ m, v }) => {
        m.position.x = mid.x + v.x * sec; m.position.z = mid.z + v.z * sec;
        m.position.y = 0.3 + v.y * sec - 4.9 * sec * sec;
      });
      dMat.opacity = 1 - t;
    });
    for (const d of debris) this.root.remove(d.m);
    dMat.dispose(); dGeo.dispose();
    this.root.remove(mesh); this.walls.delete(key); this.breaking.delete(key);
  }

  private async animWallRise(e: Edge, owner: PlayerId): Promise<void> {
    const key = edgeKey(e);
    if (this.walls.has(key)) { this.root.remove(this.walls.get(key)!); this.walls.delete(key); }
    const m = makeWall(e, owner);
    this.walls.set(key, m); this.root.add(m);
    await this.animator.run('wallRise', WALL_RISE_MS, (t) => {
      const k = Math.max(0.001, easeOutBack(t));
      m.scale.y = k; m.position.y = 0.25 * k;
    });
    m.scale.y = 1; m.position.y = 0.25;
  }

  /** E2E / デバッグ用 */
  pieceWorld(id: string): THREE.Vector3 | null { return this.pieces.get(id)?.group.position.clone() ?? null; }
  wallCount(): number { return this.walls.size; }
  static edgeIndex = edgeIdx;
  static wallTint = wallColor;
}

export { emptyOverlay };
