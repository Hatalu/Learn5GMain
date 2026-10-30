/**
 * โลก 3 มิติของโหมด "ขโมยไข่บอสหลับ" (three.js ล้วน ไม่มีไฟล์โมเดล)
 * - ฐานปลอดภัยตรงกลาง + 10 ไบโอมเป็นชิ้นพายรอบฐาน ไข่ 5 จุดต่อไบโอม (ใกล้ฐาน = ง่าย ไกล = หายากแต่ใกล้บอส)
 * - ตัวละคร/บอส/ไข่สร้างจากรูปทรงสไตล์การ์ตูน (toon + เส้นหมึก inverted hull)
 * - มีไฟล์ public/models/egg/manifest.json = ใช้โมเดลจาก Blender (.glb) แทนบอสที่สร้างเอง
 */
import * as THREE from 'three';
import { BIOMES, type Biome, type BossPart, type EggStyle, type PropKind } from './biomes';
import { RARITY, EGG_SLOTS_RARITY } from '@/lib/game-creator/eggValues';
import { rng } from '../worldKit';

export const SAFE_R = 12;
export const R_IN = 15;
export const R_OUT = 80;
export const WEDGE = (Math.PI * 2) / BIOMES.length;
export const SLOTS = 5;
const SLOT_R = [27, 36, 46, 56, 65];
const SLOT_OFF = [-0.22, 0.2, -0.16, 0.22, -0.02];
export const BOSS_R = 72;
const INK = 0x2a2350;

export const biomeAt = (x: number, z: number) => {
  if (Math.hypot(x, z) < R_IN) return -1;
  const a = (Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2);
  return Math.min(BIOMES.length - 1, Math.floor(a / WEDGE));
};
const polar = (a: number, r: number) => ({ x: Math.cos(a) * r, z: Math.sin(a) * r });
export const slotPos = (b: number, k: number) => polar(b * WEDGE + WEDGE * (0.5 + SLOT_OFF[k]), SLOT_R[k]);
export const bossHome = (b: number) => polar(b * WEDGE + WEDGE * 0.5, BOSS_R);
/** ช่องไข่ไกลฐาน = โอกาสได้ไข่หายากมากขึ้น (ใช้ปรับเลขสุ่มก่อนส่งให้ pickEggType) */
export const slotBias = (k: number, r: number) => 1 - Math.pow(1 - r, 1 + k * 0.55);

export interface Obstacle {
  x: number;
  z: number;
  r: number;
}

/* ------------------------------------------------------------------ วัสดุ */

const grad = new THREE.DataTexture(new Uint8Array([120, 195, 255]), 3, 1, THREE.RedFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter;
grad.needsUpdate = true;
const matCache = new Map<string, THREE.MeshToonMaterial>();
const toon = (color: string | number, emissive?: string) => {
  const key = `${color}|${emissive || ''}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: grad });
    if (emissive) {
      m.emissive = new THREE.Color(emissive);
      m.emissiveIntensity = 0.45;
    }
    matCache.set(key, m);
  }
  return m;
};
const INK_MAT = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const SHADOW_MAT = new THREE.MeshBasicMaterial({ color: 0x2a2350, transparent: true, opacity: 0.22, depthWrite: false });

const geoCache = new Map<string, THREE.BufferGeometry>();
const G = (key: string, make: () => THREE.BufferGeometry) => {
  let g = geoCache.get(key);
  if (!g) geoCache.set(key, (g = make()));
  return g;
};
const SPHERE = () => G('sphere', () => new THREE.SphereGeometry(1, 20, 14));
const CONE = () => G('cone', () => new THREE.ConeGeometry(1, 1, 12));
const CYL = () => G('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 16));
const BOX = () => G('box', () => new THREE.BoxGeometry(1, 1, 1));
const OCTA = () => G('octa', () => new THREE.OctahedronGeometry(1, 0));

/** ชิ้นส่วน + เส้นขอบหมึก */
function part(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], s: [number, number, number], opt: { r?: [number, number, number]; ink?: number } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.scale.set(...s);
  if (opt.r) m.rotation.set(...opt.r);
  parent.add(m);
  const t = opt.ink ?? 0.06;
  if (t > 0) {
    const o = new THREE.Mesh(geo, INK_MAT);
    const k = 1 + t / Math.max(0.2, Math.min(...s));
    o.scale.setScalar(k);
    m.add(o);
  }
  return m;
}

function blob(parent: THREE.Object3D, r: number) {
  const m = new THREE.Mesh(G('disc', () => new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2)), SHADOW_MAT);
  m.scale.setScalar(r);
  m.position.y = 0.03;
  parent.add(m);
  return m;
}

/* ------------------------------------------------------------------ ป้ายชื่อ */

export function labelSprite(text: string, bg: string, fg = '#2a2350') {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  ctx.font = '800 40px "Noto Sans Thai", "Mitr", sans-serif';
  const w = Math.min(460, Math.ceil(ctx.measureText(text).width) + 40);
  c.width = w;
  c.height = 64;
  ctx.font = '800 40px "Noto Sans Thai", "Mitr", sans-serif';
  ctx.fillStyle = bg;
  ctx.strokeStyle = '#2a2350';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(3, 3, w - 6, 58, 29);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set((w / 64) * 0.55, 0.55, 1);
  sp.renderOrder = 10;
  return sp;
}

/* ------------------------------------------------------------------ ไข่ */

const eggTex = new Map<string, THREE.CanvasTexture>();
function eggTexture(st: EggStyle) {
  const key = `${st.base}${st.spot}${st.pattern}`;
  const hit = eggTex.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = st.base;
  x.fillRect(0, 0, 256, 128);
  x.fillStyle = st.spot;
  x.strokeStyle = st.spot;
  const r = rng(key.length * 977 + st.base.charCodeAt(1));
  if (st.pattern === 'spots') {
    for (let i = 0; i < 22; i++) {
      x.beginPath();
      x.arc(r() * 256, 18 + r() * 92, 6 + r() * 9, 0, Math.PI * 2);
      x.fill();
    }
  } else if (st.pattern === 'stripe') {
    for (let y = 22; y < 128; y += 30) x.fillRect(0, y, 256, 11);
  } else if (st.pattern === 'zig') {
    x.lineWidth = 10;
    for (const y0 of [44, 84]) {
      x.beginPath();
      for (let i = 0; i <= 16; i++) x.lineTo(i * 16, y0 + (i % 2 ? -10 : 10));
      x.stroke();
    }
  } else if (st.pattern === 'glow') {
    for (let y = 0; y < 128; y += 4) {
      x.globalAlpha = 0.25 + 0.25 * Math.sin(y / 9);
      x.fillRect(0, y, 256, 2);
    }
    x.globalAlpha = 1;
    for (let i = 0; i < 10; i++) {
      x.beginPath();
      x.arc(r() * 256, 20 + r() * 88, 3 + r() * 3, 0, Math.PI * 2);
      x.fill();
    }
  } else {
    for (let i = 0; i < 12; i++) {
      const cx = r() * 256;
      const cy = 18 + r() * 92;
      const rr = 7 + r() * 7;
      x.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k * Math.PI) / 5 - Math.PI / 2;
        const q = k % 2 ? rr * 0.45 : rr;
        x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q);
      }
      x.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  eggTex.set(key, tex);
  return tex;
}

/** ไข่ 1 ฟอง (สูง ~1.3 หน่วย) ไข่ตำนาน/ความลับเรืองแสง มีประกายหมุนรอบ */
export function makeEgg(b: number, type: number, size = 1) {
  const st = BIOMES[b].eggs[type];
  const rar = EGG_SLOTS_RARITY[type];
  const g = new THREE.Group();
  const shiny = rar === 'legend' || rar === 'secret';
  const mat = new THREE.MeshToonMaterial({ color: 0xffffff, map: eggTexture(st), gradientMap: grad });
  if (shiny || st.pattern === 'glow') {
    mat.emissive = new THREE.Color(st.spot);
    mat.emissiveIntensity = shiny ? 0.35 : 0.2;
  }
  part(g, SPHERE(), mat, [0, 0.62 * size, 0], [0.5 * size, 0.66 * size, 0.5 * size], { ink: 0.05 });
  if (shiny) {
    const ring = new THREE.Group();
    ring.name = 'sparkle';
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(OCTA(), toon(RARITY[rar].color, RARITY[rar].color));
      const a = (i / 4) * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.85 * size, 0.7 * size, Math.sin(a) * 0.85 * size);
      s.scale.setScalar(0.12 * size);
      ring.add(s);
    }
    g.add(ring);
  }
  return g;
}

/* ------------------------------------------------------------------ ตัวละครผู้เล่น */

export interface CharRig {
  root: THREE.Group;
  body: THREE.Object3D;
  feet: THREE.Object3D[];
  hand: THREE.Group;
  label: THREE.Sprite | null;
  carry: THREE.Group | null;
  carryKey: string;
  quiz: THREE.Object3D;
}

export function makeChar(color: string, name: string, mine: boolean): CharRig {
  const root = new THREE.Group();
  blob(root, 0.75);
  const body = new THREE.Group();
  root.add(body);
  part(body, SPHERE(), toon(color), [0, 0.85, 0], [0.55, 0.62, 0.5]);
  part(body, SPHERE(), toon('#fff4e6'), [0, 1.62, 0], [0.5, 0.46, 0.46]);
  // ผมสีเดียวกับตัว
  part(body, SPHERE(), toon(color), [0, 1.86, -0.06], [0.52, 0.28, 0.48], { ink: 0.04 });
  for (const sx of [-1, 1]) {
    part(body, SPHERE(), toon(INK), [sx * 0.17, 1.62, 0.41], [0.07, 0.1, 0.05], { ink: 0 });
    part(body, SPHERE(), toon('#ff9db5'), [sx * 0.3, 1.5, 0.37], [0.08, 0.05, 0.03], { ink: 0 });
    part(body, SPHERE(), toon(color), [sx * 0.56, 0.9, 0.05], [0.16, 0.16, 0.16], { ink: 0.04 });
  }
  const feet = [-1, 1].map((sx) => part(root, SPHERE(), toon('#5a4a7a'), [sx * 0.22, 0.14, 0.05], [0.17, 0.12, 0.24], { ink: 0.04 }));
  const hand = new THREE.Group();
  hand.position.set(0, 2.2, 0);
  body.add(hand);
  const quiz = labelSprite('?', '#9b6cf0', '#fff');
  quiz.scale.set(0.55, 0.55, 1);
  quiz.position.set(0.55, 2.55, 0);
  quiz.visible = false;
  root.add(quiz);
  const label = labelSprite(mine ? 'ฉัน' : name, mine ? '#ffcf3f' : '#ffffff');
  label.position.y = 2.95;
  root.add(label);
  return { root, body, feet, hand, label, carry: null, carryKey: '', quiz };
}

export function setCarry(rig: CharRig, b: number, type: number) {
  const key = b < 0 ? '' : `${b}:${type}`;
  if (rig.carryKey === key) return;
  rig.carryKey = key;
  if (rig.carry) rig.hand.remove(rig.carry);
  rig.carry = null;
  if (b >= 0) {
    rig.carry = makeEgg(b, type, 0.8);
    rig.hand.add(rig.carry);
  }
}

/** ท่าเดิน: ตัวเด้ง เท้าสลับ */
export function poseChar(rig: CharRig, moving: boolean, t: number, stunned: boolean) {
  const s = moving ? Math.sin(t * 14) : 0;
  rig.body.position.y = moving ? Math.abs(s) * 0.12 : Math.sin(t * 3) * 0.02;
  rig.body.rotation.z = stunned ? Math.sin(t * 12) * 0.25 : s * 0.05;
  rig.feet[0].position.z = 0.05 + s * 0.22;
  rig.feet[1].position.z = 0.05 - s * 0.22;
  if (rig.carry) rig.carry.rotation.y = t * 1.5;
}

/* ------------------------------------------------------------------ บอส */

export interface BossRig {
  root: THREE.Group;
  body: THREE.Group;
  eyesOpen: THREE.Object3D[];
  eyesShut: THREE.Object3D[];
  zzz: THREE.Sprite[];
  home: { x: number; z: number };
  awake: boolean;
  glb?: boolean;
}

function bossParts(body: THREE.Group, parts: BossPart[], c: string, belly: string) {
  const M = toon(c);
  for (const p of parts) {
    if (p === 'ears')
      for (const sx of [-1, 1]) {
        const e = part(body, SPHERE(), M, [sx * 0.6, 3.9, -0.1], [0.32, 1.0, 0.24], { r: [0, 0, sx * -0.2] });
        part(e, SPHERE(), toon('#ffc2dc'), [0, 0.05, 0.6], [0.55, 0.75, 0.3], { ink: 0 });
      }
    if (p === 'cap') {
      const cap = part(body, G('dome', () => new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), toon('#ff5d5d'), [0, 3.1, 0], [2.3, 1.4, 2.3]);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        part(cap, SPHERE(), toon('#ffffff'), [Math.cos(a) * 0.62, 0.62, Math.sin(a) * 0.62], [0.17, 0.12, 0.17], { ink: 0 });
      }
    }
    if (p === 'claws')
      for (const sx of [-1, 1]) {
        part(body, SPHERE(), M, [sx * 2.0, 1.6, 0.9], [0.55, 0.42, 0.5]);
        part(body, CONE(), M, [sx * 2.15, 1.75, 1.45], [0.25, 0.7, 0.25], { r: [Math.PI / 2.4, 0, 0] });
        part(body, CONE(), M, [sx * 1.85, 1.45, 1.4], [0.2, 0.6, 0.2], { r: [Math.PI / 2, 0, 0] });
      }
    if (p === 'horns')
      for (const sx of [-1, 1]) part(body, CONE(), toon('#fff2cf'), [sx * 0.85, 3.65, 0.1], [0.24, 0.8, 0.24], { r: [0, 0, sx * -0.5] });
    if (p === 'crown') {
      part(body, CYL(), toon('#ffd23f', '#ffb31a'), [0, 3.45, 0], [0.75, 0.35, 0.75]);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        part(body, CONE(), toon('#ffd23f', '#ffb31a'), [Math.cos(a) * 0.6, 3.85, Math.sin(a) * 0.6], [0.16, 0.45, 0.16], { ink: 0.04 });
      }
    }
    if (p === 'spikes')
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * 0.85 + (i / 6) * Math.PI * 0.7;
        part(body, OCTA(), toon('#d8ccff', '#b48cff'), [Math.cos(a) * 1.3, 2.4 + Math.sin(i) * 0.6, Math.sin(a) * 1.3], [0.32, 0.75, 0.32], { r: [0.3 * Math.cos(a), 0, 0.3 * Math.sin(a)] });
      }
    if (p === 'wings')
      for (const sx of [-1, 1]) part(body, SPHERE(), toon(belly), [sx * 2.0, 2.4, -0.4], [0.9, 0.55, 0.18], { r: [0, sx * 0.5, sx * 0.4] });
    if (p === 'tail') part(body, CONE(), M, [0, 1.0, -2.0], [0.5, 1.6, 0.5], { r: [-Math.PI / 2.6, 0, 0] });
    if (p === 'shell') part(body, G('dome', () => new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), toon('#c2261a'), [0, 1.9, -0.2], [1.9, 1.3, 1.7], { r: [-0.25, 0, 0] });
    if (p === 'fur')
      for (let i = 0; i < 5; i++) part(body, SPHERE(), M, [(i - 2) * 0.4, 3.55 + (i % 2) * 0.12, 0.2], [0.35, 0.35, 0.35], { ink: 0.05 });
  }
}

export function makeBoss(b: number): BossRig {
  const bi: Biome = BIOMES[b];
  const root = new THREE.Group();
  blob(root, 2.2 * bi.boss.scale);
  const body = new THREE.Group();
  body.scale.setScalar(bi.boss.scale);
  root.add(body);
  part(body, SPHERE(), toon(bi.boss.body), [0, 1.95, 0], [1.75, 1.6, 1.55], { ink: 0.08 });
  part(body, SPHERE(), toon(bi.boss.belly), [0, 1.65, 0.85], [1.15, 1.05, 0.75], { ink: 0 });
  for (const sx of [-1, 1]) part(body, SPHERE(), toon(bi.boss.body), [sx * 0.95, 0.35, 0.35], [0.55, 0.35, 0.7]);
  const eyesOpen: THREE.Object3D[] = [];
  const eyesShut: THREE.Object3D[] = [];
  for (const sx of [-1, 1]) {
    const e = part(body, SPHERE(), toon('#ffffff'), [sx * 0.55, 2.75, 1.32], [0.36, 0.42, 0.2]);
    part(e, SPHERE(), toon('#c2261a', '#ff2a2a'), [0, -0.05, 0.75], [0.55, 0.6, 0.4], { ink: 0 });
    eyesOpen.push(e);
    const shut = part(body, CYL(), toon(INK), [sx * 0.55, 2.7, 1.42], [0.3, 0.06, 0.06], { r: [0, 0, Math.PI / 2], ink: 0 });
    eyesShut.push(shut);
    // ขนคิ้วโกรธ (ซ่อนตอนหลับ)
    const brow = part(body, BOX(), toon(INK), [sx * 0.55, 3.2, 1.38], [0.5, 0.1, 0.1], { r: [0, 0, sx * 0.35], ink: 0 });
    eyesOpen.push(brow);
  }
  part(body, SPHERE(), toon('#5a1838'), [0, 2.15, 1.45], [0.3, 0.14, 0.1], { ink: 0 });
  bossParts(body, bi.boss.parts, bi.boss.body, bi.boss.belly);
  const zzz = [0, 1, 2].map((i) => {
    const s = labelSprite('Z', '#ffffff');
    s.scale.set(0.5 + i * 0.12, 0.5 + i * 0.12, 1);
    root.add(s);
    return s;
  });
  const label = labelSprite(bi.boss.name, '#2a2350', '#ffffff');
  label.position.y = 5.2 * bi.boss.scale;
  root.add(label);
  const home = bossHome(b);
  root.position.set(home.x, 0, home.z);
  root.rotation.y = Math.atan2(-home.x, -home.z);
  const rig = { root, body, eyesOpen, eyesShut, zzz, home, awake: true };
  setBossAwake(rig, false);
  return rig;
}

export function setBossAwake(rig: BossRig, awake: boolean) {
  if (rig.awake === awake) return;
  rig.awake = awake;
  rig.eyesOpen.forEach((o) => (o.visible = awake));
  rig.eyesShut.forEach((o) => (o.visible = !awake));
  rig.zzz.forEach((o) => (o.visible = !awake));
}

export function poseBoss(rig: BossRig, t: number, running: boolean) {
  if (rig.awake) {
    const s = Math.sin(t * (running ? 11 : 4));
    rig.body.position.y = running ? Math.abs(s) * 0.35 : 0;
    rig.body.rotation.z = s * 0.06;
  } else {
    rig.body.position.y = 0;
    rig.body.rotation.z = 0;
    // หายใจเข้าออกตอนหลับ
    const br = 1 + Math.sin(t * 1.6) * 0.03;
    if (!rig.glb) rig.body.children[0]?.scale.set(1.75 * br, 1.6 / br, 1.55 * br);
    rig.zzz.forEach((z, i) => {
      const k = (t * 0.35 + i / 3) % 1;
      z.position.set(0.8 + k * 1.2, 4.2 + k * 2.4, 0.6);
      (z.material as THREE.SpriteMaterial).opacity = 1 - k;
    });
  }
}

/* ------------------------------------------------------------------ ของตกแต่ง */

function makeProp(kind: PropKind, color: string, r: () => number) {
  const g = new THREE.Group();
  const s = 0.8 + r() * 0.6;
  g.scale.setScalar(s);
  let rad = 0;
  if (kind === 'tree') {
    part(g, CYL(), toon('#b87a3d'), [0, 0.8, 0], [0.25, 1.6, 0.25]);
    part(g, SPHERE(), toon('#4fb04a'), [0, 2.2, 0], [1.1, 1.0, 1.1]);
    part(g, SPHERE(), toon('#5fc45a'), [0.3, 2.9, 0.1], [0.7, 0.6, 0.7]);
    rad = 0.9;
  } else if (kind === 'flower') {
    part(g, CYL(), toon('#4fb04a'), [0, 0.3, 0], [0.05, 0.6, 0.05], { ink: 0 });
    part(g, SPHERE(), toon(color), [0, 0.65, 0], [0.26, 0.12, 0.26], { ink: 0.03 });
    part(g, SPHERE(), toon('#ffd23f'), [0, 0.72, 0], [0.1, 0.06, 0.1], { ink: 0 });
  } else if (kind === 'mushroom') {
    part(g, CYL(), toon('#fff1dc'), [0, 0.6, 0], [0.3, 1.2, 0.3]);
    part(g, G('dome', () => new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), toon(color), [0, 1.15, 0], [1.0, 0.7, 1.0]);
    rad = 0.7;
  } else if (kind === 'cactus') {
    part(g, CYL(), toon(color), [0, 1.1, 0], [0.38, 2.2, 0.38]);
    part(g, CYL(), toon(color), [0.55, 1.3, 0], [0.2, 0.8, 0.2]);
    part(g, CYL(), toon(color), [-0.5, 1.0, 0], [0.18, 0.6, 0.18]);
    rad = 0.6;
  } else if (kind === 'rock') {
    part(g, G('dodeca', () => new THREE.DodecahedronGeometry(1, 0)), toon('#b8b2cf'), [0, 0.5, 0], [0.9, 0.65, 0.8], { r: [0, r() * 3, 0] });
    rad = 0.9;
  } else if (kind === 'ice') {
    for (let i = 0; i < 3; i++) part(g, CONE(), toon('#bff0ff', '#9fdcff'), [(i - 1) * 0.45, 0.8 + (i % 2) * 0.3, (i % 2) * 0.3], [0.3, 1.6 + (i % 2) * 0.6, 0.3]);
    rad = 0.8;
  } else if (kind === 'lava') {
    const pool = new THREE.Mesh(G('disc', () => new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2)), toon('#ff6a1a', '#ff8a1a'));
    pool.scale.set(1.4, 1, 1);
    pool.position.y = 0.04;
    g.add(pool);
  } else if (kind === 'reed') {
    for (let i = 0; i < 4; i++) part(g, CYL(), toon(color), [(i - 1.5) * 0.18, 0.6, (i % 2) * 0.15], [0.05, 1.2 + (i % 2) * 0.4, 0.05], { ink: 0 });
  } else if (kind === 'candy') {
    part(g, CYL(), toon('#ffffff'), [0, 0.8, 0], [0.1, 1.6, 0.1], { ink: 0.03 });
    part(g, SPHERE(), toon(color), [0, 1.8, 0], [0.6, 0.6, 0.2]);
    rad = 0.5;
  } else if (kind === 'coral') {
    for (let i = 0; i < 3; i++) part(g, CYL(), toon(color), [(i - 1) * 0.35, 0.6 + i * 0.1, 0], [0.13, 1.2 + i * 0.3, 0.13], { r: [0, 0, (i - 1) * 0.35] });
    rad = 0.5;
  } else if (kind === 'crystal') {
    for (let i = 0; i < 3; i++) part(g, OCTA(), toon(color, color), [(i - 1) * 0.5, 0.9, (i % 2) * 0.3], [0.35, 1.0 + i * 0.25, 0.35], { r: [0, 0, (i - 1) * 0.3] });
    rad = 0.8;
  } else if (kind === 'cloud') {
    for (let i = 0; i < 3; i++) part(g, SPHERE(), toon('#ffffff'), [(i - 1) * 0.6, 0.45 + (i % 2) * 0.25, 0], [0.6, 0.5, 0.55], { ink: 0.04 });
  }
  return { g, rad: rad * s };
}

/* ------------------------------------------------------------------ โลก */

export class EggWorld {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(48, 1, 0.5, 400);
  obstacles: Obstacle[] = [];
  bosses: BossRig[] = [];
  eggs = new Map<number, THREE.Group>();
  nest = new THREE.Group();
  private nestCount = 0;
  private el: HTMLElement;

  constructor(el: HTMLElement, seed: number) {
    this.el = el;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    el.appendChild(this.renderer.domElement);
    const sc = this.scene;
    sc.background = new THREE.Color('#8fd8ff');
    sc.fog = new THREE.Fog('#8fd8ff', 60, 140);
    sc.add(new THREE.HemisphereLight(0xffffff, 0x88aacc, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(20, 40, 25);
    sc.add(sun);
    this.buildGround(seed);
    BIOMES.forEach((_, b) => {
      const boss = makeBoss(b);
      this.bosses.push(boss);
      sc.add(boss.root);
    });
    sc.add(this.nest);
    this.loadModels();
  }

  private buildGround(seed: number) {
    const sc = this.scene;
    const sea = new THREE.Mesh(new THREE.CircleGeometry(220, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#4cc3ef' }));
    sea.position.y = -0.4;
    sc.add(sea);
    const sand = new THREE.Mesh(new THREE.CircleGeometry(R_OUT + 3, 80).rotateX(-Math.PI / 2), toon('#ffe3a8'));
    sand.position.y = -0.05;
    sc.add(sand);
    // ลานกลาง (ฐานปลอดภัย)
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(R_IN, 64).rotateX(-Math.PI / 2), toon('#ffe9c2'));
    plaza.position.y = 0.01;
    sc.add(plaza);
    const safe = new THREE.Mesh(new THREE.CircleGeometry(SAFE_R, 64).rotateX(-Math.PI / 2), toon('#9ff0c8'));
    safe.position.y = 0.02;
    sc.add(safe);
    const ring = new THREE.Mesh(new THREE.RingGeometry(SAFE_R - 0.6, SAFE_R, 64).rotateX(-Math.PI / 2), toon('#25c48a'));
    ring.position.y = 0.03;
    sc.add(ring);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(SAFE_R, SAFE_R, 2.4, 64, 1, true), new THREE.MeshBasicMaterial({ color: '#3fffb0', transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
    wall.position.y = 1.2;
    sc.add(wall);
    // รังกลางฐาน: ไข่ที่ทุกคนพากลับมากองโชว์
    part(sc, G('torus', () => new THREE.TorusGeometry(1, 0.35, 10, 24).rotateX(Math.PI / 2)), toon('#c98a4b'), [0, 0.35, 0], [2.4, 2.4, 1.6]);
    part(sc, CYL(), toon('#e8b878'), [0, 0.12, 0], [2.4, 0.2, 2.4], { ink: 0.04 });
    // ป้าย "ฐานปลอดภัย"
    const sign = labelSprite('ฐานปลอดภัย', '#25c48a', '#ffffff');
    sign.position.set(0, 4.2, 0);
    sign.scale.multiplyScalar(1.6);
    sc.add(sign);

    BIOMES.forEach((bi, b) => {
      const a0 = b * WEDGE;
      const geo = new THREE.RingGeometry(R_IN, R_OUT, 18, 1, a0, WEDGE).rotateX(Math.PI / 2);
      const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: bi.ground, gradientMap: grad, side: THREE.DoubleSide }));
      sc.add(m);
      // ทางเดินจากฐานถึงบอส
      const mid = a0 + WEDGE / 2;
      const path = new THREE.Mesh(G('path', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), toon(bi.ground2));
      const pl = BOSS_R - R_IN;
      path.scale.set(pl, 1, 3.2);
      path.position.set(Math.cos(mid) * (R_IN + pl / 2), 0.02, Math.sin(mid) * (R_IN + pl / 2));
      path.rotation.y = -mid;
      sc.add(path);
      // ป้ายชื่อไบโอมที่ทางเข้า
      const tag = labelSprite(bi.name, bi.ground, '#2a2350');
      const tp = polar(mid, R_IN + 2.5);
      tag.position.set(tp.x, 2.2, tp.z);
      tag.scale.multiplyScalar(1.4);
      sc.add(tag);
      // รั้วเตี้ยแบ่งไบโอม
      for (let r = R_IN + 1; r < R_OUT; r += 3.2) {
        const p = polar(a0, r);
        part(sc, CYL(), toon('#fff6e6'), [p.x, 0.5, p.z], [0.18, 1, 0.18], { ink: 0.04 });
      }
      // ของตกแต่ง (ไม่ทับจุดไข่ ทางเดิน ที่นอนบอส)
      const rr = rng(seed + b * 7919);
      const keep = [...Array.from({ length: SLOTS }, (_, k) => slotPos(b, k)), bossHome(b)];
      let placed = 0;
      for (let k = 0; k < 120 && placed < 16; k++) {
        const a = a0 + 0.06 + rr() * (WEDGE - 0.12);
        const r = R_IN + 4 + rr() * (R_OUT - R_IN - 7);
        const p = polar(a, r);
        if (keep.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 5.5)) continue;
        // ทางเดินกลางไบโอม
        const off = Math.abs(Math.sin(a - mid) * r);
        if (off < 3.2 && r < BOSS_R + 3) continue;
        if (this.obstacles.some((o) => Math.hypot(o.x - p.x, o.z - p.z) < o.r + 2)) continue;
        const { g, rad } = makeProp(bi.props[placed % bi.props.length], bi.propColor, rr);
        g.position.set(p.x, 0, p.z);
        g.rotation.y = rr() * 6.28;
        sc.add(g);
        if (rad > 0) this.obstacles.push({ x: p.x, z: p.z, r: rad });
        placed++;
      }
    });
  }

  /** โมเดลจาก Blender: public/models/egg/manifest.json = { "bosses": { "<biome id>": "<ไฟล์>.glb" } } */
  private async loadModels() {
    try {
      const r = await fetch('/models/egg/manifest.json', { cache: 'no-store' });
      if (!r.ok) return;
      const man = (await r.json()) as { bosses?: Record<string, string> };
      const list = Object.entries(man.bosses || {});
      if (!list.length) return;
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      for (const [id, file] of list) {
        const b = BIOMES.findIndex((x) => x.id === id);
        if (b < 0 || !/^[\w.-]+\.glb$/.test(file)) continue;
        loader.load(`/models/egg/${file}`, (gltf) => {
          const rig = this.bosses[b];
          const model = gltf.scene;
          // ย่อ/ขยายให้สูงประมาณ 4 หน่วย วางเท้าแตะพื้น
          const box = new THREE.Box3().setFromObject(model);
          const h = box.max.y - box.min.y || 1;
          model.scale.setScalar(4 / h);
          model.position.y = (-box.min.y * 4) / h;
          rig.body.clear();
          rig.body.add(model);
          rig.eyesOpen = [];
          rig.eyesShut = [];
          rig.glb = true;
        });
      }
    } catch {
      /* ไม่มีโมเดล = ใช้บอสที่สร้างเอง */
    }
  }

  setEgg(key: number, b: number, type: number | null) {
    const old = this.eggs.get(key);
    if (old) {
      this.scene.remove(old);
      this.eggs.delete(key);
    }
    if (type === null) return;
    const g = makeEgg(b, type, 1);
    const p = slotPos(b, key % SLOTS);
    g.position.set(p.x, 0, p.z);
    // แท่นไข่ + ลำแสงบอกความหายาก
    part(g, CYL(), toon('#fff6e6'), [0, 0.08, 0], [0.8, 0.16, 0.8], { ink: 0.04 });
    const rar = EGG_SLOTS_RARITY[type];
    if (rar !== 'common') {
      const beam = new THREE.Mesh(G('beam', () => new THREE.CylinderGeometry(0.3, 0.5, 6, 12, 1, true)), new THREE.MeshBasicMaterial({ color: RARITY[rar].color, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = 3;
      g.add(beam);
    }
    this.scene.add(g);
    this.eggs.set(key, g);
  }

  /** ไข่ที่พากลับมาถึงฐาน: กองโชว์ในรัง (สูงสุด 14 ฟอง) */
  addToNest(b: number, type: number) {
    const egg = makeEgg(b, type, 0.7);
    const i = this.nestCount++ % 14;
    const a = i * 2.4;
    const r = i < 6 ? 1.2 : 0.6;
    egg.position.set(Math.cos(a) * r, 0.25 + (i >= 6 ? 0.45 : 0), Math.sin(a) * r);
    if (this.nest.children.length >= 14) this.nest.remove(this.nest.children[0]);
    this.nest.add(egg);
  }

  animateEggs(t: number) {
    this.eggs.forEach((g, k) => {
      const e = g.children[0];
      if (e) e.position.y = 0.62 + Math.sin(t * 2 + k) * 0.08 + 0.15;
      const sp = g.getObjectByName('sparkle');
      if (sp) sp.rotation.y = t * 1.6;
    });
  }

  /** ang = ทิศ "ขึ้นจอ" ในโลก (มุมของไบโอมที่อยู่) กล้องอยู่ด้านฐาน มองออกไปทางบอส */
  render(cx: number, cz: number, ang = -Math.PI / 2) {
    const w = this.el.clientWidth || 1;
    const h = this.el.clientHeight || 1;
    const c = this.renderer.domElement;
    if (c.width !== Math.round(w * this.renderer.getPixelRatio()) || c.height !== Math.round(h * this.renderer.getPixelRatio())) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    // จอแนวตั้งมองไกลขึ้น จะได้เห็นรอบตัว
    const far = w < h ? 1.35 : 1;
    const fx = Math.cos(ang);
    const fz = Math.sin(ang);
    this.camera.position.set(cx - fx * 15 * far, 19 * far, cz - fz * 15 * far);
    this.camera.lookAt(cx + fx * 1.5, 0.8, cz + fz * 1.5);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry && !Array.from(geoCache.values()).includes(m.geometry)) m.geometry.dispose();
      const sp = o as THREE.Sprite;
      if (sp.isSprite) {
        sp.material.map?.dispose();
        sp.material.dispose();
      }
    });
  }
}
