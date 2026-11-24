import * as THREE from 'three';

export const CAM_TARGET = new THREE.Vector3(0, 0, 0.3);
const ELEV = (58 * Math.PI) / 180;
const FOV = 40;
export const FIT_RADIUS = 6.4;

export function createCamera(): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  fitCamera(cam, 1);
  return cam;
}

/** 盤を包む半径 R の球が収まる距離にカメラを置く(7.5) */
export function fitCamera(cam: THREE.PerspectiveCamera, aspect: number): void {
  const vFov = (FOV * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  let d = FIT_RADIUS / Math.sin(Math.min(vFov, hFov) / 2);
  d = Math.max(10, Math.min(60, d));
  cam.aspect = aspect;
  cam.position.set(CAM_TARGET.x, CAM_TARGET.y + d * Math.sin(ELEV), CAM_TARGET.z + d * Math.cos(ELEV));
  cam.lookAt(CAM_TARGET);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
}
