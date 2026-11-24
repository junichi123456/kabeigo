import * as THREE from 'three';
import { PLAYER_COLORS } from '../logic/constants';
import type { PieceKind, PlayerId } from '../logic/types';

export interface PieceObj {
  group: THREE.Group;
  body: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  kind: PieceKind;
  owner: PlayerId;
  lift: number;      // 現在の浮上量
  liftTarget: number;
}

const circleGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 32);
const torusGeo = new THREE.TorusGeometry(0.2, 0.03, 8, 32).rotateX(Math.PI / 2);
const squareGeo = new THREE.BoxGeometry(0.6, 0.4, 0.6);
const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
const outlineGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-0.2, 0, -0.2), new THREE.Vector3(0.2, 0, -0.2), new THREE.Vector3(0.2, 0, 0.2), new THREE.Vector3(-0.2, 0, 0.2),
]);

export function makePiece(kind: PieceKind, owner: PlayerId, ghost = false): PieceObj {
  const color = new THREE.Color(PLAYER_COLORS[owner]);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, emissive: color, emissiveIntensity: 0 });
  if (ghost) { mat.transparent = true; mat.opacity = 0.5; }
  const group = new THREE.Group();
  let body: THREE.Mesh;
  if (kind === 'circle') {
    body = new THREE.Mesh(circleGeo, mat);
    body.position.y = 0.11;
    const ring = new THREE.Mesh(torusGeo, whiteMat);
    ring.position.y = 0.225;
    group.add(body, ring);
  } else {
    body = new THREE.Mesh(squareGeo, mat);
    body.position.y = 0.2;
    const outline = new THREE.LineLoop(outlineGeo, lineMat);
    outline.position.y = 0.402;
    group.add(body, outline);
  }
  body.castShadow = !ghost;
  body.receiveShadow = false;
  return { group, body, mat, kind, owner, lift: 0, liftTarget: 0 };
}

export function pulseEmissive(p: PieceObj, now: number, active: boolean): void {
  if (!active) { p.mat.emissiveIntensity = 0; return; }
  const k = 0.5 + 0.5 * Math.sin((now / 1000) * Math.PI * 2 * 1.2);
  p.mat.emissiveIntensity = 0.2 + 0.3 * k;
}
