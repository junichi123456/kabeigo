import * as THREE from 'three';
import type { Cell, Edge } from '../logic/types';
import { PLAYER_COLORS } from '../logic/constants';
import { cellToWorld, edgeMid } from './picking';
import { makeGhostWall } from './wallView';

const dummy = new THREE.Object3D();

/** 同一形状のセル重ね板を InstancedMesh でまとめて描く */
export class CellOverlay {
  readonly mesh: THREE.InstancedMesh;
  readonly mat: THREE.MeshBasicMaterial;
  constructor(max: number, size: number, y: number, color: string | null, opacity: number) {
    this.mat = new THREE.MeshBasicMaterial({ color: color ?? 0xffffff, transparent: true, opacity, depthWrite: false });
    const geo = new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2);
    this.mesh = new THREE.InstancedMesh(geo, this.mat, max);
    this.mesh.position.y = y;
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
  }
  set(cells: Cell[], colors?: THREE.Color[]): void {
    const n = Math.min(cells.length, this.mesh.instanceMatrix.count);
    for (let i = 0; i < n; i++) {
      const w = cellToWorld(cells[i]!);
      dummy.position.set(w.x, 0, w.z);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
      if (colors) this.mesh.setColorAt(i, colors[i]!);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (colors && this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

export interface Overlay {
  placeCells: Cell[];
  selCell: Cell | null;
  ghostPlayer: number;
  movable: { cell: Cell; owner: number }[];
  targets: Cell[];
  breakTargets: Cell[];
  selTarget: Cell | null;
  previewPath: Cell[] | null;
  previewBreak: Edge | null;
  ghostEdges: Edge[];
  selEdge: Edge | null;
}
export const emptyOverlay = (): Overlay => ({
  placeCells: [], selCell: null, ghostPlayer: 0, movable: [], targets: [], breakTargets: [], selTarget: null,
  previewPath: null, previewBreak: null, ghostEdges: [], selEdge: null,
});

export class HighlightView {
  readonly root = new THREE.Group();
  private place = new CellOverlay(81, 0.9, 0.01, '#ffffff', 0.22);
  private normal = new CellOverlay(16, 0.9, 0.014, '#7CFC00', 0.45);
  private brk = new CellOverlay(16, 0.9, 0.014, '#FF9800', 0.55);
  private brkMark = new CellOverlay(16, 0.32, 0.02, '#ffffff', 0.95); // 壁破りの移動先に白い目印(色覚に依存しない)
  private sel = new CellOverlay(1, 0.96, 0.018, '#ffffff', 0.5);
  private rings: THREE.Mesh[] = [];
  private pathBoxes: THREE.Mesh[] = [];
  private breakBox = new THREE.Mesh(new THREE.BoxGeometry(1, 0.52, 0.14), new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.8, depthWrite: false }));
  private ghosts: { mesh: THREE.Mesh; edge: Edge }[] = [];
  private ringGeo = new THREE.RingGeometry(0.38, 0.46, 32).rotateX(-Math.PI / 2);
  private ringMat: THREE.MeshBasicMaterial[] = PLAYER_COLORS.map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.6, depthWrite: false }));
  private pathGeo = new THREE.BoxGeometry(0.08, 0.02, 1);
  private pathMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
  private ghostPiece: THREE.Object3D | null = null;
  private hasMovable = false;
  private hasBreak = false;

  constructor() {
    this.root.add(this.place.mesh, this.normal.mesh, this.brk.mesh, this.brkMark.mesh, this.sel.mesh, this.breakBox);
    this.breakBox.visible = false;
  }

  /** 配置ゴースト用の駒メッシュは BoardView が生成して渡す */
  setGhostPiece(obj: THREE.Object3D | null): void {
    if (this.ghostPiece) this.root.remove(this.ghostPiece);
    this.ghostPiece = obj;
    if (obj) this.root.add(obj);
  }

  apply(o: Overlay): void {
    this.place.set(o.placeCells);
    this.normal.set(o.targets);
    this.brk.set(o.breakTargets);
    this.brkMark.set(o.breakTargets);
    this.sel.set(o.selTarget ? [o.selTarget] : o.selCell ? [o.selCell] : []);
    // リング
    while (this.rings.length < o.movable.length) {
      const r = new THREE.Mesh(this.ringGeo, this.ringMat[0]);
      r.position.y = 0.02; r.renderOrder = 2;
      this.rings.push(r); this.root.add(r);
    }
    this.rings.forEach((r, i) => {
      const m = o.movable[i];
      r.visible = !!m;
      if (m) { const w = cellToWorld(m.cell); r.position.set(w.x, 0.02, w.z); r.material = this.ringMat[m.owner]!; }
    });
    this.hasMovable = o.movable.length > 0;
    // 経路プレビュー
    const segs: [Cell, Cell][] = [];
    if (o.previewPath && o.previewPath.length > 1) for (let i = 0; i < o.previewPath.length - 1; i++) segs.push([o.previewPath[i]!, o.previewPath[i + 1]!]);
    while (this.pathBoxes.length < segs.length) {
      const b = new THREE.Mesh(this.pathGeo, this.pathMat);
      b.position.y = 0.03; b.renderOrder = 3;
      this.pathBoxes.push(b); this.root.add(b);
    }
    this.pathBoxes.forEach((b, i) => {
      const s = segs[i];
      b.visible = !!s;
      if (!s) return;
      const a = cellToWorld(s[0]), c = cellToWorld(s[1]);
      b.position.set((a.x + c.x) / 2, 0.03, (a.z + c.z) / 2);
      b.rotation.y = a.x !== c.x ? Math.PI / 2 : 0;
    });
    // 壁破りプレビュー
    this.hasBreak = !!o.previewBreak;
    this.breakBox.visible = this.hasBreak;
    if (o.previewBreak) {
      const m = edgeMid(o.previewBreak);
      this.breakBox.position.set(m.x, 0.26, m.z);
      this.breakBox.rotation.y = o.previewBreak.o === 'H' ? 0 : Math.PI / 2;
      this.breakBox.scale.x = 1.06;
    }
    // ゴースト壁
    for (const g of this.ghosts) this.root.remove(g.mesh);
    this.ghosts = o.ghostEdges.map((e) => {
      const mesh = makeGhostWall(e, PLAYER_COLORS[o.ghostPlayer] ?? '#fff');
      const sel = !!o.selEdge && o.selEdge.o === e.o && o.selEdge.x === e.x && o.selEdge.y === e.y;
      (mesh.material as THREE.MeshBasicMaterial).opacity = sel ? 0.8 : 0.35;
      mesh.renderOrder = 4;
      this.root.add(mesh);
      return { mesh, edge: e };
    });
    // 配置ゴースト
    if (this.ghostPiece) {
      this.ghostPiece.visible = !!o.selCell;
      if (o.selCell) { const w = cellToWorld(o.selCell); this.ghostPiece.position.set(w.x, 0, w.z); }
    }
  }

  tick(now: number): void {
    const k = 0.5 + 0.5 * Math.sin(now / 1000 * Math.PI * 2 * 1.2);
    if (this.hasMovable) for (const r of this.rings) if (r.visible) (r.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.4 * k;
    if (this.hasBreak) (this.breakBox.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(now / 1000 * Math.PI * 2 * 3));
  }
}
