import * as THREE from 'three';
import type { Cell, Edge } from '../logic/types';

export const cellToWorld = (c: Cell): THREE.Vector3 => new THREE.Vector3(c.x - 4, 0, c.y - 4);
export const edgeMid = (e: Edge): { x: number; z: number } =>
  e.o === 'H' ? { x: e.x - 4, z: e.y - 4 + 0.5 } : { x: e.x - 4 + 0.5, z: e.y - 4 };

const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export class Picker {
  private ray = new THREE.Raycaster();
  constructor(private camera: THREE.PerspectiveCamera, private canvas: HTMLCanvasElement) {}

  groundPoint(clientX: number, clientY: number): { x: number; z: number } | null {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -(((clientY - r.top) / r.height) * 2 - 1));
    this.ray.setFromCamera(ndc, this.camera);
    const p = new THREE.Vector3();
    return this.ray.ray.intersectPlane(plane, p) ? { x: p.x, z: p.z } : null;
  }

  cellAt(clientX: number, clientY: number): Cell | null {
    const g = this.groundPoint(clientX, clientY);
    if (!g) return null;
    const x = Math.floor(g.x + 4.5), y = Math.floor(g.z + 4.5);
    return x >= 0 && x < 9 && y >= 0 && y < 9 ? { x, y } : null;
  }

  /** 候補辺のうちタップ位置に最も近いもの(距離 0.9 以内) */
  nearestEdge(clientX: number, clientY: number, edges: Edge[]): Edge | null {
    const g = this.groundPoint(clientX, clientY);
    if (!g) return null;
    let best: Edge | null = null, bd = 0.9;
    for (const e of edges) {
      const m = edgeMid(e);
      const d = Math.hypot(m.x - g.x, m.z - g.z);
      if (d <= bd) { bd = d; best = e; }
    }
    return best;
  }

  /** ワールド → ページ座標(CSS px) */
  worldToPage(v: THREE.Vector3): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    const p = v.clone().project(this.camera);
    return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height };
  }
}
