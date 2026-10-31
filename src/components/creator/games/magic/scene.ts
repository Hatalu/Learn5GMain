/**
 * ฉาก 3 มิติของ Magic Kingdom AR (three.js) วาดโปร่งใสทับภาพกล้อง
 * ตำแหน่งทุกชิ้นสั่งเป็นพิกเซลบนจอ (ตรงกับจุดเล็งจากกล้อง) แล้วแปลงเป็นพิกัดโลกบนระนาบ z = 0
 * มอนสเตอร์/บอสน่ารักแบบการ์ตูน toon + เส้นหมึก ไม่มีความรุนแรง: โดนเวท = แตกเป็นดาววิบวับ
 */
import * as THREE from 'three';
import { getGfx, gfxDpr, subscribeGfx } from '@/lib/gfx';
import type { BossId } from '@/lib/game-creator/magic/data';

const INK = 0x2a1d50;
const grad = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter;
grad.needsUpdate = true;
const mats = new Map<string, THREE.Material>();
const toon = (color: string, emissive = 0) => {
  const key = `${color}|${emissive}`;
  let m = mats.get(key) as THREE.MeshToonMaterial | undefined;
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: grad });
    if (emissive) {
      m.emissive = new THREE.Color(color);
      m.emissiveIntensity = emissive;
    }
    mats.set(key, m);
  }
  return m;
};
const INK_MAT = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const SPHERE = new THREE.SphereGeometry(1, 22, 16);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 18);
const CONE = new THREE.ConeGeometry(1, 1, 18);
const OCTA = new THREE.OctahedronGeometry(1, 0);
const RING = new THREE.TorusGeometry(1, 0.08, 8, 40);
const BOX = new THREE.BoxGeometry(1, 1, 1);

type V3 = [number, number, number];
function part(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, pos: V3, s: V3, ink = 0.06, rot?: V3) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.scale.set(...s);
  if (rot) m.rotation.set(...rot);
  parent.add(m);
  if (ink > 0) {
    const o = new THREE.Mesh(geo, INK_MAT);
    o.position.copy(m.position);
    o.rotation.copy(m.rotation);
    o.scale.set(s[0] + ink, s[1] + ink, s[2] + ink);
    parent.add(o);
  }
  return m;
}

function eyes(g: THREE.Object3D, x: number, y: number, z: number, r: number, pupil = '#2a1d50') {
  for (const sx of [-1, 1]) {
    part(g, SPHERE, toon('#ffffff'), [sx * x, y, z], [r, r * 1.15, r * 0.6], 0.02);
    part(g, SPHERE, toon(pupil), [sx * x, y - r * 0.1, z + r * 0.45], [r * 0.5, r * 0.6, r * 0.3], 0);
    part(g, SPHERE, toon('#ffffff', 1), [sx * x + r * 0.2, y + r * 0.25, z + r * 0.6], [r * 0.18, r * 0.18, r * 0.1], 0);
  }
}
function blush(g: THREE.Object3D, x: number, y: number, z: number, r: number) {
  for (const sx of [-1, 1]) part(g, SPHERE, toon('#ff8fb5'), [sx * x, y, z], [r, r * 0.55, r * 0.2], 0);
}

/* ------------------------------ มอนสเตอร์ตัวเล็ก (ถือคำตอบ) ------------------------------ */

/** kind 0 = สไลม์, 1 = ค้างคาวปุกปุย, 2 = ผีหมอก (ขนาดรัศมีราว 1 หน่วย) */
function makeMob(color: string, kind: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  if (kind === 0) {
    part(body, SPHERE, toon(color), [0, -0.1, 0], [1, 0.8, 0.9], 0.07);
    part(body, SPHERE, toon('#ffffff'), [-0.35, 0.3, 0.55], [0.18, 0.12, 0.08], 0);
    eyes(body, 0.28, 0.05, 0.72, 0.17);
    blush(body, 0.55, -0.15, 0.7, 0.13);
    part(body, CONE, toon('#ffd23f'), [0, 0.75, 0], [0.3, 0.35, 0.3], 0.04);
  } else if (kind === 1) {
    part(body, SPHERE, toon(color), [0, 0, 0], [0.8, 0.78, 0.75], 0.07);
    eyes(body, 0.25, 0.1, 0.6, 0.16);
    blush(body, 0.45, -0.12, 0.6, 0.11);
    const wings: THREE.Object3D[] = [];
    for (const sx of [-1, 1]) {
      const w = new THREE.Group();
      w.position.set(sx * 0.75, 0.15, 0);
      part(w, SPHERE, toon('#ffffff'), [sx * 0.45, 0, 0], [0.55, 0.3, 0.08], 0.04);
      body.add(w);
      wings.push(w);
    }
    for (const sx of [-1, 1]) part(body, CONE, toon(color), [sx * 0.35, 0.8, 0], [0.16, 0.3, 0.16], 0.03);
    g.userData.wings = wings;
  } else {
    part(body, SPHERE, toon(color), [0, 0.1, 0], [0.85, 0.85, 0.75], 0.07);
    part(body, CONE, toon(color), [0, -0.75, 0], [0.75, 0.9, 0.65], 0, [Math.PI, 0, 0]);
    eyes(body, 0.25, 0.2, 0.6, 0.15);
    part(body, SPHERE, toon('#2a1d50'), [0, -0.12, 0.66], [0.12, 0.09, 0.05], 0);
    blush(body, 0.45, -0.05, 0.6, 0.11);
  }
  g.userData.body = body;
  return g;
}

/** คริสตัลแห่งความรู้ลอยหมุน */
function makeCrystal(color: string): THREE.Group {
  const g = new THREE.Group();
  const c = part(g, OCTA, toon(color, 0.55), [0, 0, 0], [0.6, 1, 0.6], 0.06);
  part(g, OCTA, toon('#ffffff', 0.8), [0.12, 0.25, 0.3], [0.12, 0.2, 0.05], 0);
  g.userData.spin = c;
  g.userData.crystal = true;
  return g;
}

/** กรงขังชาวเมือง (open() = ประตูเปิด ชาวเมืองกระโดดดีใจ) */
function makeCage(): THREE.Group {
  const g = new THREE.Group();
  const bars = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    part(bars, CYL, toon('#b9a3ff'), [Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9], [0.06, 2, 0.06], 0.02);
  }
  part(bars, CYL, toon('#6d5bff'), [0, 1, 0], [1, 0.12, 1], 0.04);
  part(g, CYL, toon('#6d5bff'), [0, -1, 0], [1.05, 0.14, 1.05], 0.04);
  part(bars, OCTA, toon('#ffd23f', 0.5), [0, 1.3, 0], [0.22, 0.3, 0.22], 0.03);
  g.add(bars);
  // ชาวเมืองตัวจิ๋ว
  const kid = new THREE.Group();
  part(kid, SPHERE, toon('#ffe0c2'), [0, 0.15, 0], [0.38, 0.36, 0.36], 0.04);
  part(kid, CONE, toon('#3fcf7a'), [0, -0.45, 0], [0.38, 0.6, 0.38], 0.04);
  eyes(kid, 0.12, 0.18, 0.3, 0.08);
  part(kid, CONE, toon('#ff8fc7'), [0, 0.6, 0], [0.3, 0.35, 0.3], 0.03);
  kid.position.y = -0.3;
  g.add(kid);
  g.userData = { bars, kid };
  return g;
}

/* ------------------------------ บอส ------------------------------ */

function makeGolem(): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Group();
  g.add(b);
  part(b, OCTA, toon('#9b7bff'), [0, 0, 0], [0.95, 1.15, 0.8], 0.08);
  part(b, OCTA, toon('#c9b5ff'), [0, 0.95, 0], [0.55, 0.55, 0.5], 0.06);
  eyes(b, 0.2, 0.95, 0.35, 0.13, '#ff5ad1');
  const arms: THREE.Object3D[] = [];
  for (const sx of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(sx * 1.05, 0.2, 0);
    part(a, OCTA, toon('#7f5bff'), [sx * 0.2, -0.35, 0], [0.38, 0.6, 0.38], 0.05);
    b.add(a);
    arms.push(a);
  }
  for (let i = 0; i < 3; i++) part(b, OCTA, toon('#ffd23f', 0.6), [-0.4 + i * 0.4, 1.45, 0], [0.1, 0.22, 0.1], 0.02);
  g.userData = { body: b, arms };
  return g;
}
function makeShadow(): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Group();
  g.add(b);
  part(b, SPHERE, toon('#4a3a8a'), [0, 0, 0], [1.05, 1, 0.9], 0.08);
  part(b, CONE, toon('#4a3a8a'), [0, -1, 0], [0.9, 1, 0.8], 0, [Math.PI, 0, 0]);
  for (const sx of [-1, 1]) part(b, SPHERE, toon('#ffe94d', 1), [sx * 0.32, 0.15, 0.82], [0.2, 0.13, 0.06], 0);
  part(b, SPHERE, toon('#2a1d50'), [0, -0.3, 0.85], [0.3, 0.1, 0.05], 0);
  const tent: THREE.Object3D[] = [];
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Group();
    t.position.set(-0.9 + i * 0.6, -0.5, 0.2);
    part(t, CONE, toon('#5b4a9a'), [0, -0.5, 0], [0.18, 0.9, 0.18], 0.03, [Math.PI, 0, 0]);
    b.add(t);
    tent.push(t);
  }
  g.userData = { body: b, tent };
  return g;
}
function makeGiant(): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Group();
  g.add(b);
  part(b, SPHERE, toon('#7fd0ff'), [0, -0.15, 0], [1.1, 1.05, 0.95], 0.08);
  part(b, SPHERE, toon('#e0f7ff'), [0, -0.35, 0.55], [0.7, 0.6, 0.45], 0);
  eyes(b, 0.3, 0.35, 0.8, 0.16, '#1a5fd0');
  part(b, SPHERE, toon('#ffffff'), [0, 0.05, 0.92], [0.35, 0.18, 0.1], 0.02);
  for (let i = 0; i < 5; i++) part(b, CONE, toon('#c8f0ff', 0.25), [-0.6 + i * 0.3, 1.05, 0], [0.13, 0.5 + (i % 2) * 0.25, 0.13], 0.03);
  const arms: THREE.Object3D[] = [];
  for (const sx of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(sx * 1.1, 0.1, 0);
    part(a, SPHERE, toon('#7fd0ff'), [sx * 0.15, -0.45, 0], [0.32, 0.6, 0.32], 0.05);
    b.add(a);
    arms.push(a);
  }
  g.userData = { body: b, arms };
  return g;
}
function makeDragon(): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Group();
  g.add(b);
  part(b, SPHERE, toon('#ff6b3d'), [0, -0.2, 0], [1, 0.9, 0.85], 0.08);
  part(b, SPHERE, toon('#ffd27a'), [0, -0.35, 0.5], [0.6, 0.6, 0.45], 0);
  part(b, SPHERE, toon('#ff6b3d'), [0, 0.75, 0.15], [0.62, 0.55, 0.6], 0.06);
  part(b, SPHERE, toon('#ff9a6b'), [0, 0.6, 0.65], [0.38, 0.25, 0.25], 0.03);
  eyes(b, 0.22, 0.9, 0.62, 0.13);
  for (const sx of [-1, 1]) part(b, CONE, toon('#fff3c4'), [sx * 0.3, 1.3, 0], [0.12, 0.35, 0.12], 0.03, [0, 0, -sx * 0.4]);
  const arms: THREE.Object3D[] = [];
  for (const sx of [-1, 1]) {
    const w = new THREE.Group();
    w.position.set(sx * 0.8, 0.3, -0.3);
    part(w, CONE, toon('#ffb347'), [sx * 0.6, 0.2, 0], [0.5, 1.2, 0.08], 0.04, [0, 0, -sx * 1.1]);
    b.add(w);
    arms.push(w);
  }
  g.userData = { body: b, arms };
  return g;
}
function makeWizard(): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Group();
  g.add(b);
  part(b, CONE, toon('#7a3ad0'), [0, -0.5, 0], [1, 1.6, 0.9], 0.08);
  part(b, SPHERE, toon('#c9a3ff'), [0, 0.45, 0.05], [0.5, 0.48, 0.46], 0.05);
  eyes(b, 0.17, 0.5, 0.4, 0.1, '#ff3a8a');
  part(b, CONE, toon('#5b2fc0'), [0, 1.2, 0], [0.62, 1.1, 0.6], 0.06, [0.15, 0, 0.12]);
  part(b, OCTA, toon('#ffd23f', 0.6), [0.1, 1.85, 0.1], [0.12, 0.16, 0.12], 0.02);
  part(b, SPHERE, toon('#e8e0ff'), [0, 0.1, 0.42], [0.35, 0.3, 0.2], 0.02);
  const arms: THREE.Object3D[] = [];
  const st = new THREE.Group();
  st.position.set(1, 0, 0.2);
  part(st, CYL, toon('#8a5a3a'), [0, 0, 0], [0.06, 1.8, 0.06], 0.02);
  part(st, SPHERE, toon('#ff5ad1', 0.8), [0, 0.95, 0], [0.22, 0.22, 0.22], 0.03);
  b.add(st);
  arms.push(st);
  g.userData = { body: b, arms };
  return g;
}
function makeKing(): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Group();
  g.add(b);
  part(b, CONE, toon('#2a1d50'), [0, -0.55, -0.2], [1.3, 1.6, 0.6], 0.06);
  part(b, SPHERE, toon('#3a2a6b'), [0, -0.1, 0], [0.9, 0.95, 0.8], 0.08);
  part(b, SPHERE, toon('#5b3f9a'), [0, 0.8, 0], [0.55, 0.52, 0.5], 0.05);
  for (const sx of [-1, 1]) part(b, SPHERE, toon('#ff4d8a', 1), [sx * 0.2, 0.82, 0.45], [0.11, 0.08, 0.05], 0);
  part(b, CYL, toon('#ffc53a', 0.3), [0, 1.3, 0], [0.45, 0.22, 0.45], 0.04);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    part(b, CONE, toon('#ffc53a', 0.3), [Math.cos(a) * 0.4, 1.55, Math.sin(a) * 0.4], [0.1, 0.3, 0.1], 0.02);
  }
  part(b, OCTA, toon('#ff4d8a', 0.8), [0, 1.35, 0.46], [0.1, 0.13, 0.05], 0);
  const arms: THREE.Object3D[] = [];
  for (const sx of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(sx * 0.95, 0.1, 0);
    part(a, SPHERE, toon('#3a2a6b'), [sx * 0.12, -0.4, 0], [0.28, 0.55, 0.28], 0.04);
    part(a, SPHERE, toon('#b85cff', 0.9), [sx * 0.15, -0.95, 0.1], [0.18, 0.18, 0.18], 0.02);
    b.add(a);
    arms.push(a);
  }
  g.userData = { body: b, arms };
  return g;
}
const BOSS_MAKERS: Record<BossId, () => THREE.Group> = { golem: makeGolem, shadow: makeShadow, giant: makeGiant, dragon: makeDragon, wizard: makeWizard, king: makeKing };

/* ------------------------------ ฉาก ------------------------------ */

interface Fx {
  obj: THREE.Object3D;
  t: number;
  life: number;
  step: (k: number, dt: number) => void;
}

export class MagicScene {
  private el: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  private objs = new Map<string, THREE.Group>();
  private fx: Fx[] = [];
  private motes: THREE.Points;
  private w = 1;
  private h = 1;
  private unGfx: () => void;
  private ro: ResizeObserver;

  /** เปิดกล้องอยู่ = ความคมไม่เกิน 1.25 (GPU ต้องแบ่งให้ระบบจับท่า ลดความร้อน) */
  private dpr() {
    return this.camOn ? Math.min(1.25, gfxDpr()) : gfxDpr();
  }

  constructor(el: HTMLElement, private camOn: boolean) {
    this.el = el;
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: getGfx() !== 'lite', powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.dpr());
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
    el.appendChild(this.renderer.domElement);
    this.camera.position.set(0, 0, 20);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a6bd0, 1.7));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.5);
    sun.position.set(6, 10, 14);
    this.scene.add(sun);

    // ละอองเวทลอยขึ้นช้าๆ ทั้งฉาก
    const n = getGfx() === 'lite' ? 60 : getGfx() === 'hd' ? 260 : 140;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 26;
      pos[i * 3 + 2] = -2 - Math.random() * 14;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.motes = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xfff3a8, size: 0.16, transparent: true, opacity: camOn ? 0.6 : 0.9, depthWrite: false }));
    this.scene.add(this.motes);

    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(el);
    this.unGfx = subscribeGfx(() => {
      this.renderer.setPixelRatio(this.dpr());
      this.resize();
    });
  }

  resize() {
    this.w = this.el.clientWidth || 1;
    this.h = this.el.clientHeight || 1;
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
  }

  get unit() {
    const vis = 2 * Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z;
    return vis / this.h;
  }

  world(px: number, py: number, z = 0): THREE.Vector3 {
    const u = this.unit * ((this.camera.position.z - z) / this.camera.position.z);
    return new THREE.Vector3((px - this.w / 2) * u, (this.h / 2 - py) * u, z);
  }

  has(id: string) {
    return this.objs.has(id);
  }

  private add(id: string, g: THREE.Group) {
    this.remove(id);
    g.scale.setScalar(0.01);
    this.scene.add(g);
    this.objs.set(id, g);
  }
  mob(id: string, color: string, kind: number) {
    this.add(id, makeMob(color, kind));
  }
  crystal(id: string, color: string) {
    this.add(id, makeCrystal(color));
  }
  cage(id: string) {
    this.add(id, makeCage());
  }
  boss(id: string, kind: BossId) {
    this.add(id, (BOSS_MAKERS[kind] || makeGolem)());
  }
  /** ลูกพลังของบอสที่พุ่งเข้าหาผู้เล่น */
  orb(id: string, color: string) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(SPHERE, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })));
    const c = new THREE.Mesh(SPHERE, new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    c.scale.setScalar(0.5);
    g.add(c);
    const r = new THREE.Mesh(RING, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 }));
    r.scale.setScalar(1.4);
    g.add(r);
    g.userData = { orb: true };
    this.add(id, g);
  }

  /** วางชิ้นที่ตำแหน่งพิกเซล ขนาด rPx = รัศมีบนจอ */
  place(id: string, px: number, py: number, rPx: number, t: number) {
    const g = this.objs.get(id);
    if (!g) return;
    g.position.copy(this.world(px, py));
    const target = rPx * this.unit;
    g.scale.setScalar(g.scale.x + (target - g.scale.x) * 0.25);
    if (g.userData.pf) g.scale.multiplyScalar(1 + g.userData.pf * 0.25);
    const ud = g.userData as { body?: THREE.Object3D; wings?: THREE.Object3D[]; arms?: THREE.Object3D[]; tent?: THREE.Object3D[]; spin?: THREE.Object3D; orb?: boolean; kid?: THREE.Object3D; frozen?: number };
    if (ud.body) {
      ud.body.rotation.y = Math.sin(t * 1.3 + px * 0.01) * 0.3;
      ud.body.position.y = Math.abs(Math.sin(t * 3 + px * 0.02)) * 0.12;
      ud.body.scale.set(1 + Math.sin(t * 6 + px) * 0.03, 1 - Math.sin(t * 6 + px) * 0.03, 1);
    }
    ud.wings?.forEach((o, i) => (o.rotation.z = Math.sin(t * 14 + i * Math.PI) * 0.5));
    ud.arms?.forEach((o, i) => (o.rotation.z = Math.sin(t * 2.2 + i * Math.PI) * 0.35));
    ud.tent?.forEach((o, i) => (o.rotation.z = Math.sin(t * 3 + i) * 0.35));
    if (ud.spin) ud.spin.rotation.y = t * 2.4;
    if (ud.orb) g.rotation.z = t * 6;
    if (ud.kid) ud.kid.position.y = -0.3 + Math.abs(Math.sin(t * 2)) * 0.08;
    if (ud.frozen && ud.frozen > t) g.rotation.z = Math.sin(t * 40) * 0.02;
  }

  /** บอสโดนน้ำแข็ง: เด้งสั่นเบาๆ จนถึงเวลา until (วินาทีของฉาก) */
  freeze(id: string, until: number, color = '#bff3ff') {
    const g = this.objs.get(id);
    if (!g) return;
    g.userData.frozen = until;
    this.ringAt(g.position, color, g.scale.x * 1.3);
  }

  /** กรงเปิด: ลูกกรงลอยขึ้นหาย ชาวเมืองกระโดดดีใจ */
  openCage(id: string) {
    const g = this.objs.get(id);
    if (!g) return;
    const bars = g.userData.bars as THREE.Object3D;
    const kid = g.userData.kid as THREE.Object3D;
    this.fx.push({ obj: new THREE.Object3D(), t: 0, life: 1.4, step: (k) => {
      bars.position.y = k * 3;
      bars.scale.setScalar(Math.max(0.01, 1 - k));
      kid.position.y = -0.3 + Math.abs(Math.sin(k * Math.PI * 4)) * 0.6 * (1 - k * 0.5);
    } });
    this.sparkle(g.position, '#ffd23f', g.scale.x);
  }

  pulse(id: string, amt = 0.25) {
    const g = this.objs.get(id);
    if (!g) return;
    this.fx.push({ obj: new THREE.Object3D(), t: 0, life: 0.35, step: (k) => (g.userData.pf = Math.sin(k * Math.PI) * amt) });
  }

  remove(id: string) {
    const g = this.objs.get(id);
    if (!g) return;
    this.scene.remove(g);
    this.objs.delete(id);
  }

  /** ลอยหนีออกจอ (ข้อที่ไม่ใช่คำตอบ) */
  flyAway(id: string) {
    const g = this.objs.get(id);
    if (!g) return;
    this.objs.delete(id);
    const v = new THREE.Vector3((Math.random() - 0.5) * 30, 24, -10);
    this.fx.push({ obj: g, t: 0, life: 0.9, step: (k, dt) => {
      g.position.addScaledVector(v, dt * k * 2);
      g.rotation.z += dt * 5;
    } });
  }

  /** ตอบผิด: ส่ายหัว + วงแดง */
  wobble(id: string) {
    const g = this.objs.get(id);
    if (!g) return;
    this.fx.push({ obj: new THREE.Object3D(), t: 0, life: 0.6, step: (k) => {
      g.rotation.z = Math.sin(k * 40) * 0.35 * (1 - k);
    } });
    this.ringAt(g.position, '#ff4d6d', g.scale.x * 0.8);
  }

  /** ลูกเวทพุ่งจากปลายไม้เท้าไปเป้า: ไฟ/น้ำแข็ง/สายฟ้า มีหางประกาย */
  bolt(fx: number, fy: number, tx: number, ty: number, color: string, kind: 'fire' | 'ice' | 'thunder' | 'heal' = 'fire') {
    const a = this.world(fx, fy);
    const b = this.world(tx, ty);
    const u = this.unit;
    if (kind === 'thunder') {
      // สายฟ้า: เส้นหยักจากฟ้าลงเป้า
      const top = this.world(tx + (Math.random() - 0.5) * 80, -40);
      const pts = [top];
      for (let i = 1; i < 6; i++) pts.push(top.clone().lerp(b, i / 6).add(new THREE.Vector3((Math.random() - 0.5) * 30 * u, 0, 0)));
      pts.push(b);
      for (let i = 0; i < pts.length - 1; i++) this.seg(pts[i], pts[i + 1], color, 0.22, 0.35);
      this.sparkle(b, color, 40 * u);
      return;
    }
    const g = new THREE.Group();
    const core = new THREE.Mesh(kind === 'ice' ? OCTA : SPHERE, new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    core.scale.setScalar(0.5);
    g.add(core);
    g.add(new THREE.Mesh(SPHERE, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, depthWrite: false })));
    g.scale.setScalar(20 * u);
    g.position.copy(a);
    this.scene.add(g);
    let trail = 0;
    this.fx.push({ obj: g, t: 0, life: 0.32, step: (k, dt) => {
      g.position.copy(a).lerp(b, k);
      g.position.y += Math.sin(k * Math.PI) * 40 * u;
      g.rotation.z += dt * 12;
      trail += dt;
      if (trail > 0.03) {
        trail = 0;
        this.puff(g.position.clone(), color, 12 * u);
      }
      if (k >= 1) this.sparkle(b, color, 34 * u);
    } });
  }

  /** ลำแสงสายรุ้ง: ลำแสงหลายสีซ้อนกัน */
  beam(fx: number, fy: number, tx: number, ty: number) {
    const a = this.world(fx, fy);
    const b = this.world(tx, ty);
    ['#ff6b9a', '#ffc53a', '#7be36b', '#59c8ff', '#b85cff'].forEach((c, i) => this.seg(a, b, c, 0.55 - i * 0.08, 0.6));
    this.seg(a, b, '#ffffff', 0.12, 0.6);
    this.sparkle(b, '#ffffff', 60 * this.unit);
  }

  /** พายุหมุนกวาดกลางจอ */
  tornado(px: number, py: number) {
    const c = this.world(px, py);
    const u = this.unit;
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const r = new THREE.Mesh(RING, new THREE.MeshBasicMaterial({ color: i % 2 ? '#9ff0d0' : '#ffffff', transparent: true, opacity: 0.7, depthWrite: false }));
      r.rotation.x = Math.PI / 2;
      r.position.y = (i - 2) * 22 * u;
      r.scale.setScalar((18 + i * 9) * u);
      g.add(r);
    }
    g.position.copy(c);
    this.scene.add(g);
    this.fx.push({ obj: g, t: 0, life: 1.1, step: (k, dt) => {
      g.rotation.y += dt * 14;
      g.scale.setScalar(0.4 + k * 1.4);
      g.children.forEach((m) => (((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k)));
    } });
  }

  private seg(a: THREE.Vector3, b: THREE.Vector3, color: string, r: number, life: number) {
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(CYL, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
    m.position.copy(a).lerp(b, 0.5);
    m.scale.set(r, len, r);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    this.scene.add(m);
    this.fx.push({ obj: m, t: 0, life, step: (k) => {
      (m.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
      m.scale.x = m.scale.z = r * (1 - k * 0.6);
    } });
  }

  private puff(p: THREE.Vector3, color: string, size: number) {
    const m = new THREE.Mesh(SPHERE, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false }));
    m.position.copy(p);
    m.scale.setScalar(size);
    this.scene.add(m);
    this.fx.push({ obj: m, t: 0, life: 0.35, step: (k) => {
      m.scale.setScalar(size * (1 - k));
      (m.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - k);
    } });
  }

  private ringAt(p: THREE.Vector3, color: string, size: number) {
    const m = new THREE.Mesh(RING, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
    m.position.copy(p);
    this.scene.add(m);
    this.fx.push({ obj: m, t: 0, life: 0.5, step: (k) => {
      m.scale.setScalar(size * (0.6 + k * 2.4));
      (m.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
    } });
  }

  /** ประกายดาวกระจาย */
  private sparkle(c: THREE.Vector3, color: string, size: number) {
    this.ringAt(c, color, size);
    const n = getGfx() === 'lite' ? 8 : getGfx() === 'hd' ? 24 : 14;
    const cols = [color, '#ffffff', '#ffe38a', '#ff8fc7'];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(OCTA, new THREE.MeshBasicMaterial({ color: cols[i % cols.length], transparent: true, depthWrite: false }));
      m.position.copy(c);
      const s = size * (0.12 + Math.random() * 0.12);
      m.scale.set(s, s * 1.6, s * 0.4);
      const dir = new THREE.Vector3(Math.cos((i / n) * Math.PI * 2), Math.sin((i / n) * Math.PI * 2), (Math.random() - 0.5) * 0.4).multiplyScalar(size * (1.6 + Math.random() * 2));
      this.scene.add(m);
      this.fx.push({ obj: m, t: 0, life: 0.7 + Math.random() * 0.3, step: (k, dt) => {
        m.position.addScaledVector(dir, dt * (1 - k) * 2);
        m.rotation.z += dt * 8;
        (m.material as THREE.MeshBasicMaterial).opacity = 1 - k * k;
      } });
    }
  }

  /** แตกเป็นดาววิบวับ (ไม่มีความรุนแรง) */
  burst(px: number, py: number, color: string, big = 1) {
    this.sparkle(this.world(px, py), color, 60 * this.unit * big);
  }

  /** ควันปุ๊ง: มอนสเตอร์หายไปแบบน่ารัก */
  poof(id: string, color: string) {
    const g = this.objs.get(id);
    if (!g) return;
    const p = g.position.clone();
    const s = g.scale.x;
    this.remove(id);
    for (let i = 0; i < 7; i++) this.puff(p.clone().add(new THREE.Vector3(Math.cos(i) * s * 0.6, Math.sin(i * 1.7) * s * 0.5, 0)), i % 2 ? '#ffffff' : color, s * 0.55);
    this.sparkle(p, color, s);
  }

  /** ชิ้นที่อยู่ ณ id บินเข้าหาจุดพิกเซล (คริสตัลบินเข้ากระเป๋า) */
  collect(id: string, tx: number, ty: number) {
    const g = this.objs.get(id);
    if (!g) return;
    this.objs.delete(id);
    const a = g.position.clone();
    const b = this.world(tx, ty);
    const s0 = g.scale.x;
    this.fx.push({ obj: g, t: 0, life: 0.6, step: (k) => {
      g.position.copy(a).lerp(b, k * k);
      g.scale.setScalar(s0 * (1 - k * 0.7));
    } });
    this.ringAt(a, '#ffffff', s0);
  }

  render(dt: number, t: number) {
    const p = this.motes.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) + dt * 0.6;
      if (y > 13) y = -13;
      p.setY(i, y);
    }
    p.needsUpdate = true;
    this.motes.rotation.y = Math.sin(t * 0.1) * 0.05;
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.life);
      f.step(k, dt);
      if (k >= 1) {
        this.scene.remove(f.obj);
        const m = (f.obj as THREE.Mesh).material as THREE.Material | undefined;
        if (m && !(m instanceof THREE.MeshToonMaterial)) m.dispose();
        f.obj.traverse((o) => {
          const mm = (o as THREE.Mesh).material as THREE.Material | undefined;
          if (mm && !(mm instanceof THREE.MeshToonMaterial) && mm !== INK_MAT) mm.dispose();
        });
        this.fx.splice(i, 1);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.ro.disconnect();
    this.unGfx();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
