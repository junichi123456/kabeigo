import * as THREE from 'three';

/** 海賊船の船室の卓上を手続き生成する。盤(|x|,|z| ≤ 5.1)には一切重ならないよう小物は盤の外に置く。 */

function tex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

function woodTexture(base: [number, number, number], vertical: boolean, repeat: [number, number]): THREE.CanvasTexture {
  return tex(512, 512, (g) => {
    const planks = 8;
    for (let i = 0; i < planks; i++) {
      const k = (rnd() - 0.5) * 22;
      g.fillStyle = `rgb(${base[0] + k},${base[1] + k * 0.8},${base[2] + k * 0.6})`;
      if (vertical) g.fillRect((512 / planks) * i, 0, 512 / planks, 512); else g.fillRect(0, (512 / planks) * i, 512, 512 / planks);
      for (let j = 0; j < 14; j++) {
        g.strokeStyle = `rgba(40,22,10,${0.05 + rnd() * 0.12})`;
        g.lineWidth = 1 + rnd() * 1.5;
        g.beginPath();
        if (vertical) { const x = (512 / planks) * i + rnd() * (512 / planks); g.moveTo(x, 0); g.bezierCurveTo(x + 6, 170, x - 6, 340, x + 2, 512); }
        else { const y = (512 / planks) * i + rnd() * (512 / planks); g.moveTo(0, y); g.bezierCurveTo(170, y + 4, 340, y - 4, 512, y + 1); }
        g.stroke();
      }
      g.strokeStyle = 'rgba(20,10,4,.75)'; g.lineWidth = 3;
      g.beginPath();
      if (vertical) { g.moveTo((512 / planks) * i, 0); g.lineTo((512 / planks) * i, 512); } else { g.moveTo(0, (512 / planks) * i); g.lineTo(512, (512 / planks) * i); }
      g.stroke();
    }
  }, repeat);
}

const lam = (c: string | number, extra: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
const emi = (c: string, intensity = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(intensity) });

export function buildCabin(): THREE.Group {
  const g = new THREE.Group();
  const T = -0.42; // 卓の天板の高さ

  // 卓(板張り)
  const table = new THREE.Mesh(new THREE.BoxGeometry(46, 0.6, 32), new THREE.MeshLambertMaterial({ map: woodTexture([128, 84, 48], false, [4, 3]) }));
  table.position.set(0, T - 0.3, 0.5);
  table.receiveShadow = true;
  g.add(table);

  // 奥の内壁と丸窓
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 16), new THREE.MeshLambertMaterial({ map: woodTexture([86, 54, 30], true, [6, 1]) }));
  wall.position.set(0, 7.6, -15);
  g.add(wall);
  const beamMat = lam('#3a2412');
  for (const x of [-18, -6, 6, 18]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 16, 0.5), beamMat); b.position.set(x, 7.6, -14.8); g.add(b); }
  const seaTex = tex(128, 128, (c) => {
    const gr = c.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#9ad0ee'); gr.addColorStop(0.45, '#4f93bd'); gr.addColorStop(1, '#1f5f8a');
    c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(0, 60 + i * 14); for (let x = 0; x <= 128; x += 16) c.lineTo(x, 60 + i * 14 + (x / 16 % 2 ? 4 : -4)); c.stroke(); }
  });
  const brass = lam('#b8862b');
  for (const x of [-9, 9]) {
    const sea = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshBasicMaterial({ map: seaTex }));
    sea.position.set(x, 6.2, -14.85); g.add(sea);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.22, 8, 28), brass); ring.position.set(x, 6.2, -14.8); g.add(ring);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), brass); bolt.position.set(x + Math.cos(a) * 1.95, 6.2 + Math.sin(a) * 1.95, -14.7); g.add(bolt); }
  }

  // 吊りランタン(梁から鎖で)
  const beam = new THREE.Mesh(new THREE.BoxGeometry(44, 0.5, 0.6), beamMat);
  beam.position.set(0, 11.6, -12.2); g.add(beam);
  for (const x of [-13, 0, 13]) {
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 5), lam('#222'));
    chain.position.set(x, 10.4, -12.2); g.add(chain);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.4, 8), lam('#2b2b2b'));
    body.position.set(x, 8.6, -12.2); g.add(body);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 1.2, 8), emi('#ffd27a', 1.1));
    glass.position.set(x, 8.6, -12.2); g.add(glass);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.5, 8), lam('#2b2b2b')); cap.position.set(x, 9.6, -12.2); g.add(cap);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.16, depthWrite: false }));
    glow.position.set(x, 8.6, -12.2); g.add(glow);
  }

  // ---- 小物 ----
  const addAt = (o: THREE.Object3D, x: number, z: number, ry = 0, y = T) => { o.position.set(x, y, z); o.rotation.y = ry; g.add(o); return o; };

  // 金貨(InstancedMesh にまとめる)
  const coinGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.045, 14);
  const coins: { x: number; y: number; z: number; ry: number; rx: number }[] = [];
  const heap = (cx: number, cz: number, n: number, r: number, h: number) => {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r;
      coins.push({ x: cx + Math.cos(a) * d, y: T + 0.03 + (1 - d / r) * h * rnd() + (rnd() < 0.2 ? 0.05 : 0), z: cz + Math.sin(a) * d, ry: rnd() * 3, rx: (rnd() - 0.5) * 0.7 });
    }
  };
  heap(-7.2, -8.6, 70, 1.0, 0.9);     // 宝箱の中身がこぼれた山
  heap(-5.4, -7.2, 14, 0.8, 0.1);
  heap(9.5, -3, 36, 0.9, 0.4);
  heap(-9.5, 4.5, 28, 0.8, 0.3);
  heap(6.8, 8.6, 30, 0.9, 0.35);
  heap(-4, 9, 12, 0.9, 0.05);
  const inst = new THREE.InstancedMesh(coinGeo, new THREE.MeshLambertMaterial({ color: '#f2b705', emissive: '#4a3400' }), coins.length);
  const d = new THREE.Object3D();
  coins.forEach((c, i) => { d.position.set(c.x, c.y, c.z); d.rotation.set(c.rx, c.ry, 0); d.updateMatrix(); inst.setMatrixAt(i, d.matrix); });
  g.add(inst);

  // 宝箱
  const chest = new THREE.Group();
  const wood = lam('#6b3f1d'), band = lam('#c99a2e');
  const cb = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 1.5), wood); cb.position.y = 0.5; chest.add(cb);
  for (const x of [-0.85, 0.85]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.04, 1.54), band); b.position.set(x, 0.5, 0); chest.add(b); }
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, 1.0, -0.75);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 1.5), wood); lid.position.set(0, 0.25, 0.75); lidPivot.add(lid);
  lidPivot.rotation.x = -1.25; chest.add(lidPivot);
  const fill = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 1.3), lam('#f2b705', { emissive: '#5a4000' })); fill.position.y = 0.98; chest.add(fill);
  addAt(chest, -8.2, -10.2, 0.25);

  // 樽
  const barrel = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.7, 14), lam('#7a4a22')); bar.position.y = 0.85; barrel.add(bar);
  for (const y of [0.35, 1.35]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.87, 0.05, 6, 16).rotateX(Math.PI / 2), lam('#2a2a2a')); r.position.y = y; barrel.add(r); }
  addAt(barrel, 10.2, -9.5);
  const barrel2 = barrel.clone(); addAt(barrel2, 8.4, -11.2);

  // ラム酒の瓶
  const bottle = () => {
    const b = new THREE.Group();
    const m = lam('#1c5a30', { transparent: true, opacity: 0.9 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.1, 12), m); body.position.y = 0.55; b.add(body);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.34, 0.35, 12), m); sh.position.y = 1.27; b.add(sh);
    const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.4, 8), m); nk.position.y = 1.65; b.add(nk);
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 8), lam('#b68b5b')); cork.position.y = 1.9; b.add(cork);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.45, 12, 1, true), lam('#e8d9a8')); label.position.y = 0.55; b.add(label);
    return b;
  };
  addAt(bottle(), 3.6, -8.8); addAt(bottle(), 4.6, -9.6, 1);
  const lying = bottle(); lying.rotation.z = Math.PI / 2; addAt(lying, -9.2, 8.2, 0.4, T + 0.34);

  // ろうそく
  const candle = () => {
    const c = new THREE.Group();
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.12, 14), brass); dish.position.y = 0.06; c.add(dish);
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 1.1, 10), lam('#f0e6c8')); wax.position.y = 0.67; c.add(wax);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6).scale(1, 1.7, 1), emi('#ffb020', 1.2)); flame.position.y = 1.4; c.add(flame);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.18, depthWrite: false })); halo.position.y = 1.4; c.add(halo);
    return c;
  };
  addAt(candle(), -2.6, -8.6); addAt(candle(), -1.5, -9.4); addAt(candle(), 8.2, 4.6); addAt(candle(), 6.9, 9.8);

  // 宝の地図
  const mapTex = tex(256, 180, (c) => {
    c.fillStyle = '#e6cf9a'; c.fillRect(0, 0, 256, 180);
    for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(120,80,30,${rnd() * 0.08})`; c.fillRect(rnd() * 256, rnd() * 180, 3, 3); }
    c.fillStyle = '#c7ae78'; c.beginPath(); c.moveTo(30, 60); c.bezierCurveTo(60, 20, 120, 40, 150, 70); c.bezierCurveTo(190, 100, 230, 80, 230, 130); c.bezierCurveTo(160, 160, 80, 150, 30, 110); c.closePath(); c.fill();
    c.strokeStyle = '#5b3d18'; c.lineWidth = 2; c.stroke();
    c.setLineDash([5, 5]); c.strokeStyle = '#a02020'; c.beginPath(); c.moveTo(50, 100); c.quadraticCurveTo(100, 60, 140, 95); c.quadraticCurveTo(180, 120, 205, 105); c.stroke();
    c.setLineDash([]); c.strokeStyle = '#a02020'; c.lineWidth = 5; c.beginPath(); c.moveTo(198, 98); c.lineTo(212, 112); c.moveTo(212, 98); c.lineTo(198, 112); c.stroke();
    c.strokeStyle = '#5b3d18'; c.lineWidth = 3; c.strokeRect(5, 5, 246, 170);
  });
  const map = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.4).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: mapTex }));
  addAt(map, 0.4, -8.2, 0.12, T + 0.02);

  // 羅針盤
  const compass = new THREE.Group();
  const cbody = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.22, 24), brass); cbody.position.y = 0.11; compass.add(cbody);
  const faceTex = tex(128, 128, (c) => {
    c.fillStyle = '#f4ead0'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill();
    c.strokeStyle = '#5b3d18'; c.lineWidth = 2; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; c.beginPath(); c.moveTo(64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50); c.lineTo(64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60); c.stroke(); }
    c.fillStyle = '#8a1c1c'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center'; c.fillText('N', 64, 34);
  });
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.82, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: faceTex })); face.position.y = 0.225; compass.add(face);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 1.2), lam('#b01818')); needle.position.y = 0.24; needle.rotation.y = 0.7; compass.add(needle);
  addAt(compass, -3.6, 8.6, 0.3);

  // どくろ
  const skull = new THREE.Group();
  const bone = lam('#eee6cf');
  const cr = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 12), bone); cr.position.y = 0.65; skull.add(cr);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.3, 0.55), bone); jaw.position.set(0, 0.2, 0.12); skull.add(jaw);
  for (const x of [-0.22, 0.22]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), emi('#120c08')); e.position.set(x, 0.7, 0.5); skull.add(e); }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 4), emi('#120c08')); nose.position.set(0, 0.45, 0.58); nose.rotation.x = Math.PI; skull.add(nose);
  addAt(skull, -11.4, -4.6, 0.7);

  // 短剣
  const dagger = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 2.0), lam('#c9ced6')); blade.position.set(0, 0.04, -0.7); dagger.add(blade);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.4, 4).rotateX(-Math.PI / 2).scale(1, 0.3, 1), lam('#c9ced6')); tip.position.set(0, 0.04, -1.9); dagger.add(tip);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.12), brass); guard.position.set(0, 0.06, 0.32); dagger.add(guard);
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 8).rotateX(Math.PI / 2), lam('#4a2a14')); hilt.position.set(0, 0.06, 0.72); dagger.add(hilt);
  addAt(dagger, 7.8, -6.8, -0.5);
  addAt(dagger.clone(), 10.4, 6.4, 2.3);

  // 金の杯
  const pts: THREE.Vector2[] = [[0.0, 0], [0.45, 0], [0.5, 0.06], [0.14, 0.14], [0.12, 0.6], [0.3, 0.7], [0.55, 1.2], [0.6, 1.6], [0.52, 1.6], [0.48, 1.25], [0.0, 0.8]].map(([x, y]) => new THREE.Vector2(x, y));
  const goblet = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), lam('#f2b705', { emissive: '#5a4000', side: THREE.DoubleSide }));
  addAt(goblet, 9.4, 0.6);
  const goblet2 = goblet.clone(); addAt(goblet2, -2.4, 10.2, 0.5);

  // ロープ
  const rope = new THREE.Group();
  for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.75 - i * 0.04, 0.13, 6, 20).rotateX(Math.PI / 2), lam('#b79a62')); t.position.y = 0.13 + i * 0.2; rope.add(t); }
  addAt(rope, -9.8, 0.6); addAt(rope.clone(), 4.4, 10.4);

  return g;
}
