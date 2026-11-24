import * as THREE from 'three';
import { createCamera, fitCamera } from './camera';

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  onFrame(cb: (now: number) => void): void;
  resize(): void;
  dispose(): void;
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

export function createStage(wrap: HTMLElement): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.dataset.testid = 'game-canvas';
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
  wrap.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1F2A36');
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(5, 12, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 1; sc.far = 40;
  scene.add(sun);

  const camera = createCamera();
  const cbs: ((now: number) => void)[] = [];
  let raf = 0, running = true;

  const resize = () => {
    const w = Math.max(1, wrap.clientWidth), h = Math.max(1, wrap.clientHeight);
    renderer.setSize(w, h, false);
    fitCamera(camera, w / h);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(wrap);
  resize();

  const loop = (now: number) => {
    if (!running) return;
    for (const cb of cbs) cb(now);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  const vis = () => {
    if (document.hidden) { running = false; cancelAnimationFrame(raf); }
    else if (!running) { running = true; raf = requestAnimationFrame(loop); }
  };
  document.addEventListener('visibilitychange', vis);

  return {
    renderer, scene, camera, canvas,
    onFrame: (cb) => { cbs.push(cb); },
    resize,
    dispose: () => {
      running = false; cancelAnimationFrame(raf); ro.disconnect();
      document.removeEventListener('visibilitychange', vis);
      renderer.dispose(); canvas.remove();
    },
  };
}
