/**
 * ฉากอวกาศ 3 มิติของเกม AR (three.js) วาดโปร่งใสทับภาพกล้อง
 * ตำแหน่งทุกชิ้นสั่งเป็นพิกเซลบนจอ (ตรงกับจุดเล็งจากกล้อง) แล้วแปลงเป็นพิกัดโลกบนระนาบ z = 0
 * ยานเอเลียนน่ารัก ไม่มีความรุนแรง: โดนเลเซอร์ = แตกเป็นดาววิบวับ
 */
import * as THREE from 'three';
import { getGfx, gfxDpr, subscribeGfx } from '@/lib/gfx';

const INK = 0x1d1640;
export const ALIEN_COLORS = ['#ff6b9a', '#ffc53a', '#3fd6a8', '#9b7bff', '#4fb3ff', '#ff9a3d'];
export const TEAM_COLORS = ['#2fb8ff', '#ff8a2f'];

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
const GLASS = new THREE.MeshToonMaterial({ color: '#bff3ff', gradientMap: grad, transparent: true, opacity: 0.45 });
const SPHERE = new THREE.SphereGeometry(1, 22, 16);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 18);
const ROCK = new THREE.IcosahedronGeometry(1, 0);
const OCTA = new THREE.OctahedronGeometry(1, 0);
const RING = new THREE.TorusGeometry(1, 0.08, 8, 40);

function part(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], s: [number, number, number], ink = 0.06) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.scale.set(...s);
  parent.add(m);
  if (ink > 0) {
    const o = new THREE.Mesh(geo, INK_MAT);
    o.position.copy(m.position);
    o.scale.set(s[0] + ink, s[1] + ink, s[2] + ink);
    parent.add(o);
  }
  return m;
}

/** ยานจานบินเอเลียน (ขนาดรัศมีราว 1 หน่วย) */
function makeAlien(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  part(body, SPHERE, toon(color), [0, 0, 0], [1.05, 0.34, 1.05]);
  part(body, CYL, toon('#ffffff'), [0, -0.1, 0], [1.25, 0.08, 1.25], 0.04);
  // คนขับเอเลียน: หัวกลมสีเขียว ตาโต
  part(body, SPHERE, toon('#7be36b'), [0, 0.42, 0], [0.36, 0.34, 0.36], 0.03);
  for (const x of [-0.13, 0.13]) {
    part(body, SPHERE, toon('#ffffff'), [x, 0.5, 0.28], [0.1, 0.12, 0.06], 0);
    part(body, SPHERE, toon('#1d1640'), [x, 0.5, 0.33], [0.05, 0.06, 0.03], 0);
  }
  part(body, SPHERE, toon('#7be36b'), [-0.22, 0.78, 0], [0.05, 0.05, 0.05], 0);
  part(body, SPHERE, toon('#7be36b'), [0.22, 0.78, 0], [0.05, 0.05, 0.05], 0);
  const dome = new THREE.Mesh(SPHERE, GLASS);
  dome.position.set(0, 0.32, 0);
  dome.scale.set(0.58, 0.55, 0.58);
  body.add(dome);
  // ไฟรอบขอบจาน กระพริบไล่กัน
  const lights = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const l = new THREE.Mesh(SPHERE, toon(i % 2 ? '#fff38a' : '#ffffff', 0.8));
    l.position.set(Math.cos(a) * 1.0, -0.06, Math.sin(a) * 1.0);
    l.scale.setScalar(0.09);
    lights.add(l);
  }
  body.add(lights);
  g.userData = { body, lights };
  body.rotation.x = 0.42;
  return g;
}

/** ยานของผู้เล่น (ยิงเลเซอร์ขึ้นไป) */
function makeShip(color: string): THREE.Group {
  const g = new THREE.Group();
  part(g, SPHERE, toon(color), [0, 0, 0], [0.42, 1.0, 0.42]);
  part(g, SPHERE, toon('#ffffff'), [0, 0.35, 0.2], [0.24, 0.26, 0.2], 0.03);
  part(g, SPHERE, toon('#7fe0ff', 0.3), [0, 0.38, 0.32], [0.16, 0.17, 0.08], 0);
  for (const x of [-1, 1]) part(g, SPHERE, toon('#ffffff'), [x * 0.48, -0.42, 0], [0.34, 0.12, 0.2], 0.04);
  const flame = new THREE.Mesh(SPHERE, new THREE.MeshBasicMaterial({ color: '#ffb02e', transparent: true, opacity: 0.85 }));
  flame.position.set(0, -1.05, 0);
  flame.scale.set(0.2, 0.35, 0.2);
  g.add(flame);
  g.userData = { flame };
  return g;
}

const ROCK_MATS = ['#a0785a', '#8f7bb8', '#c08a5c'].map((color) => new THREE.MeshLambertMaterial({ color, flatShading: true }));
const TAIL_MAT = new THREE.MeshBasicMaterial({ color: '#ffcf6b', transparent: true, opacity: 0.5 });

/** อุกกาบาตการ์ตูน */
function makeMeteor(seed: number): THREE.Group {
  const g = new THREE.Group();
  // หางไฟชี้ขึ้น (มาจากด้านบน) ไม่หมุนตามก้อนหิน
  const tail = new THREE.Mesh(SPHERE, TAIL_MAT);
  tail.position.set(0, 1.1, -0.6);
  tail.scale.set(0.55, 1.3, 0.4);
  g.add(tail);
  const rock = new THREE.Group();
  g.add(rock);
  rock.add(new THREE.Mesh(ROCK, ROCK_MATS[seed % 3]));
  const o = new THREE.Mesh(ROCK, INK_MAT);
  o.scale.setScalar(1.07);
  rock.add(o);
  for (let i = 0; i < 3; i++) part(rock, SPHERE, toon('#6b5040'), [Math.cos(i * 2.1) * 0.55, Math.sin(i * 2.1) * 0.55, 0.6], [0.2, 0.2, 0.08], 0);
  g.userData = { rock };
  return g;
}

interface Fx {
  obj: THREE.Object3D;
  t: number;
  life: number;
  step: (k: number, dt: number) => void;
}

export class SpaceScene {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  private objs = new Map<string, THREE.Group>();
  private fx: Fx[] = [];
  private stars: THREE.Points;
  private el: HTMLElement;
  private w = 1;
  private h = 1;
  private unGfx: () => void;
  private ro: ResizeObserver;

  constructor(el: HTMLElement, camOn: boolean) {
    this.el = el;
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: getGfx() !== 'lite', powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(gfxDpr());
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
    el.appendChild(this.renderer.domElement);
    this.camera.position.set(0, 0, 20);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6677cc, 1.7));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(6, 10, 14);
    this.scene.add(sun);

    // ดาวพื้นหลัง: ไม่มีกล้อง = อวกาศเต็มจอ, มีกล้อง = ดาวบางๆ ลอยทับภาพ
    const n = getGfx() === 'lite' ? 140 : getGfx() === 'hd' ? 700 : 380;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 90;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 2] = -10 - Math.random() * 60;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: camOn ? 0.55 : 0.95, depthWrite: false }));
    this.scene.add(this.stars);
    if (!camOn) this.decorPlanets();

    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(el);
    this.unGfx = subscribeGfx(() => {
      this.renderer.setPixelRatio(gfxDpr());
      this.resize();
    });
  }

  private decorPlanets() {
    const p1 = new THREE.Group();
    part(p1, SPHERE, toon('#ff8fc7'), [0, 0, 0], [4, 4, 4], 0.12);
    const ring = new THREE.Mesh(RING, toon('#ffe08a'));
    ring.scale.set(6.2, 6.2, 3);
    ring.rotation.x = 1.2;
    p1.add(ring);
    p1.position.set(-26, 12, -30);
    this.scene.add(p1);
    const p2 = new THREE.Group();
    part(p2, SPHERE, toon('#6be3c6'), [0, 0, 0], [2.6, 2.6, 2.6], 0.1);
    p2.position.set(25, -10, -26);
    this.scene.add(p2);
  }

  resize() {
    this.w = this.el.clientWidth || 1;
    this.h = this.el.clientHeight || 1;
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
  }

  /** หน่วยโลกต่อ 1 พิกเซลบนระนาบ z = 0 */
  get unit() {
    const vis = 2 * Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z;
    return vis / this.h;
  }

  /** พิกเซลบนจอ -> พิกัดโลก (ระนาบ z = 0) */
  world(px: number, py: number, z = 0): THREE.Vector3 {
    const u = this.unit * ((this.camera.position.z - z) / this.camera.position.z);
    return new THREE.Vector3((px - this.w / 2) * u, (this.h / 2 - py) * u, z);
  }

  has(id: string) {
    return this.objs.has(id);
  }

  alien(id: string, color: string) {
    const g = makeAlien(color);
    g.scale.setScalar(0.01);
    this.scene.add(g);
    this.objs.set(id, g);
  }

  ship(id: string, color: string) {
    const g = makeShip(color);
    this.scene.add(g);
    this.objs.set(id, g);
  }

  meteor(id: string, seed: number) {
    const g = makeMeteor(seed);
    this.scene.add(g);
    this.objs.set(id, g);
  }

  /** วางชิ้นที่ตำแหน่งพิกเซล ขนาด rPx = รัศมีบนจอ */
  place(id: string, px: number, py: number, rPx: number, t: number) {
    const g = this.objs.get(id);
    if (!g) return;
    g.position.copy(this.world(px, py));
    const target = rPx * this.unit;
    // โผล่มาแบบเด้ง
    g.scale.setScalar(g.scale.x + (target - g.scale.x) * 0.25);
    const ud = g.userData as { body?: THREE.Object3D; lights?: THREE.Object3D; flame?: THREE.Object3D; rock?: THREE.Object3D };
    if (ud.body) ud.body.rotation.y = Math.sin(t * 1.3 + px) * 0.35;
    if (ud.lights) ud.lights.rotation.y = t * 2.2;
    if (ud.flame) ud.flame.scale.y = 0.3 + Math.sin(t * 30) * 0.08;
    if (ud.rock) {
      ud.rock.rotation.x = t * 1.7 + px * 0.01;
      ud.rock.rotation.y = t * 1.1;
    }
  }

  /** ยานผู้เล่นเอียงหาเป้า */
  aimShip(id: string, tx: number, ty: number) {
    const g = this.objs.get(id);
    if (!g) return;
    const s = this.world(tx, ty);
    const a = Math.atan2(s.x - g.position.x, s.y - g.position.y);
    g.rotation.z += (-a - g.rotation.z) * 0.2;
  }

  remove(id: string) {
    const g = this.objs.get(id);
    if (!g) return;
    this.scene.remove(g);
    this.objs.delete(id);
  }

  /** ยานบินหนีออกจอ (ข้อที่ไม่ใช่คำตอบ) */
  flyAway(id: string) {
    const g = this.objs.get(id);
    if (!g) return;
    this.objs.delete(id);
    const v = new THREE.Vector3((Math.random() - 0.5) * 30, 26, -10);
    this.fx.push({ obj: g, t: 0, life: 0.9, step: (k, dt) => {
      g.position.addScaledVector(v, dt * k * 2);
      g.rotation.z += dt * 6;
    } });
  }

  /** ยานกระพริบ + ส่ายเมื่อเลือกผิด */
  wobble(id: string) {
    const g = this.objs.get(id);
    if (!g) return;
    const x0 = g.rotation.z;
    this.fx.push({ obj: new THREE.Object3D(), t: 0, life: 0.6, step: (k) => {
      g.rotation.z = x0 + Math.sin(k * 40) * 0.35 * (1 - k);
    } });
    this.ringAt(g.position, '#ff4d6d', 0.5);
  }

  laser(fromId: string, tx: number, ty: number, color: string) {
    const g = this.objs.get(fromId);
    if (!g) return;
    const a = g.position.clone().add(new THREE.Vector3(0, g.scale.y * 0.9, 0));
    const b = this.world(tx, ty);
    const len = a.distanceTo(b);
    const mk = (r: number, c: string, op: number) => {
      const m = new THREE.Mesh(CYL, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false }));
      m.position.copy(a).lerp(b, 0.5);
      m.scale.set(r, len, r);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      this.scene.add(m);
      this.fx.push({ obj: m, t: 0, life: 0.35, step: (k) => {
        (m.material as THREE.MeshBasicMaterial).opacity = op * (1 - k);
        m.scale.x = m.scale.z = r * (1 - k * 0.6);
      } });
    };
    mk(0.42, color, 0.45);
    mk(0.14, '#ffffff', 0.95);
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

  /** แตกเป็นดาววิบวับ (ไม่มีความรุนแรง) */
  burst(px: number, py: number, color: string, big = 1) {
    const c = this.world(px, py);
    const u = this.unit;
    this.ringAt(c, color, 70 * u * big);
    const n = getGfx() === 'lite' ? 8 : getGfx() === 'hd' ? 26 : 16;
    const cols = [color, '#ffffff', '#ffe38a', '#8af5ff'];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(OCTA, new THREE.MeshBasicMaterial({ color: cols[i % cols.length], transparent: true, depthWrite: false }));
      m.position.copy(c);
      const s = (8 + Math.random() * 10) * u * big;
      m.scale.set(s, s * 1.6, s * 0.4);
      const dir = new THREE.Vector3(Math.cos((i / n) * Math.PI * 2), Math.sin((i / n) * Math.PI * 2), (Math.random() - 0.5) * 0.4).multiplyScalar((120 + Math.random() * 160) * u * big);
      this.scene.add(m);
      this.fx.push({ obj: m, t: 0, life: 0.7 + Math.random() * 0.3, step: (k, dt) => {
        m.position.addScaledVector(dir, dt * (1 - k) * 2);
        m.rotation.z += dt * 8;
        (m.material as THREE.MeshBasicMaterial).opacity = 1 - k * k;
      } });
    }
  }

  render(dt: number, t: number) {
    this.stars.rotation.z = t * 0.01;
    this.stars.position.y = Math.sin(t * 0.2) * 0.5;
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.life);
      f.step(k, dt);
      if (k >= 1) {
        this.scene.remove(f.obj);
        // วัสดุของเอฟเฟกต์สร้างใหม่ทุกครั้ง (กลุ่มยานไม่มี material ตรงๆ จึงไม่โดนทิ้ง)
        const m = (f.obj as THREE.Mesh).material as THREE.Material | undefined;
        if (m && !(m instanceof THREE.MeshToonMaterial)) m.dispose();
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
