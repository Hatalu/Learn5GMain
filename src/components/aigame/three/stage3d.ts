/**
 * ฉาก 3D ของเกมตัวอย่าง (three.js) หน้าตาแบบเดียวกับชุด K3 ที่ prompt ส่งให้ Gemini:
 * ของเล่น toon 3 ระดับแสง + เส้นขอบเข้ม + เงานุ่ม + หมอก + ป้ายข้อความ HTML ที่ตามวัตถุ
 * หยุดวาดเมื่อเลื่อนพ้นจอ/สลับแท็บ · ความละเอียดตามระดับกราฟิก (gfxDpr) · dispose ครบตอนเลิกใช้
 */
import * as THREE from 'three';
import { getGfx, gfxDpr } from '@/lib/gfx';

export type V3 = [number, number, number];

export interface Stage3D {
  T: typeof THREE;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** ความกว้าง/สูงของฉาก (px) */
  size: { w: number; h: number };
  mat(color: string): THREE.MeshToonMaterial;
  part(geo: THREE.BufferGeometry, color: string, at?: V3, parent?: THREE.Object3D): THREE.Mesh;
  outline(mesh: THREE.Mesh, w?: number): THREE.Mesh;
  group(at?: V3, parent?: THREE.Object3D): THREE.Group;
  label(obj: THREE.Object3D, text: string, cls?: string, dy?: number): HTMLElement;
  unlabel(el: HTMLElement): void;
  clearLabels(): void;
  /** ตำแหน่งบนจอ (px ในฉาก) */
  toScreen(obj: THREE.Object3D, dy?: number): { x: number; y: number };
  /** วัตถุใน list ที่อยู่ใต้นิ้ว (clientX/Y ของหน้า) */
  pick(clientX: number, clientY: number, list: THREE.Object3D[]): THREE.Object3D | null;
  onFrame(cb: (dt: number, t: number) => void): void;
  /** กระดาษสีระเบิดที่จุดหนึ่งในฉาก */
  burst(at: THREE.Vector3, n?: number): void;
  dispose(): void;
}

const CONFETTI = ['#ffd166', '#ff6b7a', '#4fb3ff', '#3fd6a8', '#c9b8ff'];

const INK = '#2a2350';

export function createStage(host: HTMLElement, labels: HTMLElement, sky = '#bfe9ff'): Stage3D | null {
  let renderer: THREE.WebGLRenderer;
  try {
    const lite = getGfx() === 'lite';
    renderer = new THREE.WebGLRenderer({ antialias: !lite, powerPreference: 'low-power' });
    renderer.setPixelRatio(gfxDpr(1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = lite ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } catch {
    return null;
  }
  const cv = renderer.domElement;
  cv.className = 'ag-3dcanvas';
  // ตั้งตรงนี้ด้วย กันขนาด canvas ดันกรอบฉากให้โตวนไม่จบ ถ้า CSS ยังไม่โหลด
  Object.assign(cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
  host.prepend(cv);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(sky);
  scene.fog = new THREE.Fog(sky, 22, 60);
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight('#ffffff', '#c9b8ff', 1.25));
  const sun = new THREE.DirectionalLight('#fff4dc', 1.7);
  sun.position.set(7, 14, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
  sun.shadow.bias = -0.0006;
  sun.shadow.radius = 3;
  scene.add(sun);

  const ramp = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  const ink = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  const mats = new Map<string, THREE.MeshToonMaterial>();
  const ray = new THREE.Raycaster();
  const size = { w: 1, h: 1 };
  const tags: { obj: THREE.Object3D; el: HTMLElement; dy: number }[] = [];
  const subs: ((dt: number, t: number) => void)[] = [];

  const mat = (color: string) => {
    let m = mats.get(color);
    if (!m) mats.set(color, (m = new THREE.MeshToonMaterial({ color, gradientMap: ramp })));
    return m;
  };
  const v = new THREE.Vector3();
  const toScreen = (obj: THREE.Object3D, dy = 0) => {
    obj.getWorldPosition(v);
    v.y += dy;
    v.project(camera);
    return { x: ((v.x + 1) / 2) * size.w, y: ((1 - v.y) / 2) * size.h, z: v.z };
  };

  const resize = () => {
    const r = host.getBoundingClientRect();
    size.w = Math.max(1, r.width);
    size.h = Math.max(1, r.height);
    renderer.setSize(size.w, size.h, false);
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  // วาดเฉพาะตอนเห็นบนจอ
  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(host);

  // กระดาษสี: ใช้ geometry เดียวกันทั้งหมด
  const bit = new THREE.PlaneGeometry(0.16, 0.24);
  const bits: { m: THREE.Mesh; v: THREE.Vector3; life: number }[] = [];
  const bitMats = CONFETTI.map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));

  let raf = 0;
  let last = 0;
  let t = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (!visible || document.hidden) return;
    t += dt;
    for (const s of subs) s(dt, t);
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.life -= dt;
      b.v.y -= 9 * dt;
      b.m.position.addScaledVector(b.v, dt);
      b.m.rotation.x += dt * 9;
      b.m.rotation.y += dt * 6;
      if (b.life <= 0) {
        scene.remove(b.m);
        bits.splice(i, 1);
      }
    }
    for (const L of tags) {
      const s = toScreen(L.obj, L.dy);
      L.el.style.display = s.z > 1 || !L.obj.visible ? 'none' : '';
      L.el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) translate(-50%, -100%)`;
    }
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return {
    T: THREE,
    scene,
    camera,
    size,
    mat,
    part(geo, color, at = [0, 0, 0], parent = scene) {
      const m = new THREE.Mesh(geo, mat(color));
      m.position.set(...at);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    },
    outline(mesh, w = 0.06) {
      const o = new THREE.Mesh(mesh.geometry, ink);
      o.scale.setScalar(1 + w);
      o.raycast = () => {};
      mesh.add(o);
      return o;
    },
    group(at = [0, 0, 0], parent = scene) {
      const g = new THREE.Group();
      g.position.set(...at);
      parent.add(g);
      return g;
    },
    label(obj, text, cls = '', dy = 0) {
      const el = document.createElement('div');
      el.className = 'ag-3dlabel ' + cls;
      el.textContent = text;
      labels.appendChild(el);
      tags.push({ obj, el, dy });
      return el;
    },
    unlabel(el) {
      const i = tags.findIndex((x) => x.el === el);
      if (i >= 0) tags.splice(i, 1);
      el.remove();
    },
    clearLabels() {
      tags.splice(0).forEach((x) => x.el.remove());
    },
    toScreen,
    pick(clientX, clientY, list) {
      const r = cv.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), camera);
      for (const h of ray.intersectObjects(list, true)) {
        let o: THREE.Object3D | null = h.object;
        while (o && !list.includes(o)) o = o.parent;
        if (o) return o;
      }
      return null;
    },
    onFrame(cb) {
      subs.push(cb);
    },
    burst(at, n = 26) {
      const lite = getGfx() === 'lite';
      for (let k = 0; k < (lite ? n / 2 : n); k++) {
        const m = new THREE.Mesh(bit, bitMats[k % bitMats.length]);
        m.position.copy(at);
        const a = Math.random() * Math.PI * 2;
        const s = 2.5 + Math.random() * 3;
        bits.push({ m, v: new THREE.Vector3(Math.cos(a) * s, 4 + Math.random() * 4, Math.sin(a) * s), life: 0.9 + Math.random() * 0.5 });
        scene.add(m);
      }
    },
    dispose() {
      bit.dispose();
      bitMats.forEach((m) => m.dispose());
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      tags.splice(0).forEach((x) => x.el.remove());
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.geometry.dispose();
      });
      mats.forEach((m) => m.dispose());
      ink.dispose();
      ramp.dispose();
      renderer.dispose();
      cv.remove();
    },
  };
}

/* ---------------------------------------------------------------- ตัวช่วยแอนิเมชัน */

export const ease = {
  outBack: (k: number) => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2),
  outCubic: (k: number) => 1 - Math.pow(1 - k, 3),
  inOut: (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
};

/** ทวีนทีละตัว: เรียก step(dt) ทุกเฟรม */
export class Tweens {
  private list: { t: number; sec: number; fn: (k: number) => void; done?: () => void }[] = [];
  add(sec: number, fn: (k: number) => void, done?: () => void) {
    this.list.push({ t: 0, sec, fn, done });
  }
  clear() {
    this.list = [];
  }
  get busy() {
    return this.list.length > 0;
  }
  step(dt: number) {
    const fin: (() => void)[] = [];
    this.list = this.list.filter((w) => {
      w.t = Math.min(1, w.t + dt / w.sec);
      w.fn(w.t);
      if (w.t >= 1 && w.done) fin.push(w.done);
      return w.t < 1;
    });
    fin.forEach((f) => f());
  }
}

/** ตัวละครกลม (หัวโต ตาโต แก้มชมพู) จากรูปทรงพื้นฐาน ใช้ในเกมตัวอย่าง 3D ทุกเกม */
export function buddy(st: Stage3D, body: string, at: V3 = [0, 0, 0], parent?: THREE.Object3D) {
  const T = st.T;
  const g = st.group(at, parent);
  const torso = st.part(new T.SphereGeometry(0.62, 24, 18), body, [0, 0.62, 0], g);
  torso.scale.set(1, 0.9, 0.95);
  st.outline(torso, 0.07);
  const head = st.part(new T.SphereGeometry(0.58, 24, 18), '#ffd9b8', [0, 1.45, 0.05], g);
  st.outline(head, 0.07);
  for (const s of [-1, 1]) {
    st.part(new T.SphereGeometry(0.09, 12, 10), INK, [0.2 * s, 1.5, 0.55], g);
    st.part(new T.SphereGeometry(0.03, 8, 6), '#ffffff', [0.2 * s + 0.03, 1.54, 0.63], g);
    const cheek = st.part(new T.SphereGeometry(0.08, 10, 8), '#ff9bb3', [0.33 * s, 1.36, 0.47], g);
    cheek.scale.set(1.3, 0.7, 0.5);
    const foot = st.part(new T.SphereGeometry(0.2, 14, 10), INK, [0.25 * s, 0.1, 0.1], g);
    foot.scale.set(1, 0.6, 1.3);
  }
  return { g, head, torso };
}
