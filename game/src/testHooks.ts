import * as THREE from 'three';
import type { Cell, Edge, GameState } from './logic';
import type { Animator } from './render/animator';
import type { Picker } from './render/picking';
import { cellToWorld, edgeMid } from './render/picking';
import type { Controller } from './app/controller';
import type { CameraRig } from './render/camera';

export interface HangTestHooks {
  getState(): GameState;
  loadState(json: string | GameState, cpu?: boolean[]): void;
  cellToScreen(x: number, y: number): { x: number; y: number };
  edgeToScreen(e: Edge): { x: number; y: number };
  getHighlights(): { cells: Cell[]; breakCells: Cell[]; edges: Edge[] };
  getSelection(): { pieceId: string | null; target: Cell | null; edge: Edge | null };
  isBusy(): boolean;
  lastAnimations(): { kind: 'move' | 'wallRise' | 'wallBreak' | 'drop' | 'camera'; startedAt: number; endedAt: number | null }[];
  getBoardCorners(): { x: number; y: number }[];
  getCamera(): { mode: 'oblique' | 'top'; elevationDeg: number; moving: boolean };
}

export function hooksEnabled(): boolean {
  return import.meta.env.DEV || new URLSearchParams(location.search).get('test') === '1';
}

export function installHooks(ctrl: Controller, picker: Picker, animator: Animator, rig: CameraRig, loadIntoGame: (s: string | GameState, cpu?: boolean[]) => void): void {
  const hooks: HangTestHooks = {
    getState: () => structuredClone(ctrl.state),
    loadState: (j, cpu) => loadIntoGame(j, cpu),
    cellToScreen: (x, y) => picker.worldToPage(cellToWorld({ x, y })),
    edgeToScreen: (e) => { const m = edgeMid(e); return picker.worldToPage(new THREE.Vector3(m.x, 0, m.z)); },
    getHighlights: () => {
      const o = ctrl.getOverlay();
      return { cells: ctrl.state.phase === 'placement' ? o.placeCells : o.targets, breakCells: o.breakTargets, edges: o.ghostEdges };
    },
    getSelection: () => { const s = ctrl.getSelection(); return { pieceId: s.pieceId, target: s.target ?? s.cell, edge: s.edge }; },
    isBusy: () => ctrl.isBusy(),
    lastAnimations: () => [...animator.records, ...rig.records].map((r) => ({ ...r })),
    getCamera: () => ({ mode: rig.mode, elevationDeg: rig.elevationDeg, moving: rig.moving }),
    getBoardCorners: () => [[-4.8, -4.8], [4.8, -4.8], [4.8, 4.8], [-4.8, 4.8]].map(([x, z]) => picker.worldToPage(new THREE.Vector3(x, 0, z))),
  };
  (window as unknown as { __HANG__: HangTestHooks }).__HANG__ = hooks;
}
