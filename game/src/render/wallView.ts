import * as THREE from 'three';
import { PLAYER_COLORS } from '../logic/constants';
import type { Edge, WallValue } from '../logic/types';
import { edgeMid } from './picking';

const hGeo = new THREE.BoxGeometry(1.04, 0.5, 0.12);
const vGeo = new THREE.BoxGeometry(0.12, 0.5, 1.04);
const matCache = new Map<string, THREE.MeshLambertMaterial>();

export function wallColor(v: WallValue): THREE.Color {
  if (v === 3 || v === -1) return new THREE.Color('#9E9E9E');
  return new THREE.Color(PLAYER_COLORS[v]).lerp(new THREE.Color(0x000000), 0.3);
}

export function makeWall(e: Edge, v: WallValue): THREE.Mesh {
  const key = String(v);
  let mat = matCache.get(key);
  if (!mat) { mat = new THREE.MeshLambertMaterial({ color: wallColor(v) }); matCache.set(key, mat); }
  const m = new THREE.Mesh(e.o === 'H' ? hGeo : vGeo, mat);
  const mid = edgeMid(e);
  m.position.set(mid.x, 0.25, mid.z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const ghostH = new THREE.BoxGeometry(1.04, 0.5, 0.26);
const ghostV = new THREE.BoxGeometry(0.26, 0.5, 1.04);

/** ゴースト壁は実壁(厚さ 0.12)より太く描き、真上表示でも見つけやすくする */
export function makeGhostWall(e: Edge, color: string): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false });
  const m = new THREE.Mesh(e.o === 'H' ? ghostH : ghostV, mat);
  const mid = edgeMid(e);
  m.position.set(mid.x, 0.25, mid.z);
  return m;
}

/** 壁をクローンしたマテリアルに差し替える(破壊演出で個別に着色するため) */
export function ownMaterial(m: THREE.Mesh): THREE.MeshLambertMaterial {
  const mat = (m.material as THREE.MeshLambertMaterial).clone();
  m.material = mat;
  return mat;
}

export { hGeo, vGeo };
