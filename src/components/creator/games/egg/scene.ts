/**
 * โลก 3 มิติของโหมด "ขโมยไข่บอสหลับ" (three.js ล้วน ไม่มีไฟล์โมเดล)
 * - แผนที่เส้นตรง: ฐานปลอดภัย (z > 0) -> ไบโอม 1 -> ... -> ไบโอม 5 ไปทาง -z (ขึ้นจอ)
 * - ไบโอมละ 5 ฟอง ตำแหน่ง/ชนิดสุ่มใหม่ทุกรอบไข่ บอสนอนท้ายไบโอม
 * - ตัวละครผู้เล่น = รูปตัวละคร+ชุดที่เลือกในห้องรอ (ป้ายภาพหันหากล้อง) / บอส ไข่ สัตว์ = รูปทรงการ์ตูน toon
 * - มีไฟล์ public/models/egg/manifest.json = ใช้โมเดลจาก Blender (.glb) แทนบอสที่สร้างเอง
 */
import * as THREE from 'three';
import { BIOMES, type BossPart, type EggStyle, type PropKind } from './biomes';
import { RARITY, EGG_BIOMES, EGG_SLOTS_RARITY } from '@/lib/game-creator/eggValues';
import { rng } from '../worldKit';
import { petLook, petScale } from './pets';

export const HALF_W = 18;
export const SAFE_Z = 18;
export const BIOME_L = 34;
export const SLOTS = 5;
export const END_Z = -EGG_BIOMES * BIOME_L;
const INK = 0x2a2350;

/** ไบโอมลำดับที่ (0-4) ของตำแหน่งนี้ -1 = อยู่ในฐาน */
export const tierAt = (z: number) => (z >= 0 ? -1 : Math.min(EGG_BIOMES - 1, Math.floor(-z / BIOME_L)));
export const inSafe = (z: number) => z > 0.5;
export const bossHome = (tier: number) => ({ x: tier % 2 ? 7 : -7, z: -(tier + 1) * BIOME_L + 5 });

/** 5 ไบโอมของห้องนี้ (สุ่มธีมจาก 10 แบบตาม seed ของห้อง) */
export function pickThemes(seed: number) {
  const r = rng(seed ^ 0x5bd1e995);
  const ids = BIOMES.map((_, i) => i);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, EGG_BIOMES);
}

export interface Obstacle {
  x: number;
  z: number;
  r: number;
}

/** ตำแหน่งไข่ 25 ฟองของรอบไข่ ep (ทุกเครื่องได้ตรงกัน) */
export function slotLayout(seed: number, ep: number, obstacles: Obstacle[]) {
  const out: { x: number; z: number }[] = [];
  for (let t = 0; t < EGG_BIOMES; t++) {
    const r = rng(seed + ep * 7349 + t * 131);
    const boss = bossHome(t);
    const mine: { x: number; z: number }[] = [];
    for (let k = 0; k < 400 && mine.length < SLOTS; k++) {
      const p = { x: (r() * 2 - 1) * (HALF_W - 3), z: -t * BIOME_L - 4 - r() * (BIOME_L - 13) };
      if (Math.hypot(p.x - boss.x, p.z - boss.z) < 6) continue;
      if (obstacles.some((o) => Math.hypot(o.x - p.x, o.z - p.z) < o.r + 1.6)) continue;
      if (mine.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 5)) continue;
      mine.push(p);
    }
    while (mine.length < SLOTS) mine.push({ x: (mine.length - 2) * 5, z: -t * BIOME_L - 10 });
    out.push(...mine);
  }
  return out;
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

/* ------------------------------------------------------------------ ตัวละครผู้เล่น (รูปจากห้องรอ) */

export interface CharRig {
  root: THREE.Group;
  body: THREE.Group;
  sprite: THREE.Sprite;
  label: THREE.Sprite | null;
  hand: THREE.Group;
  carry: THREE.Object3D | null;
  carryKey: string;
  pet: THREE.Object3D | null;
  petKey: string;
  quiz: THREE.Object3D;
  img: HTMLImageElement | null;
  face: number;
}

const CHAR_H = 2.6;

/** ตัวละคร = ป้ายภาพหันหากล้อง (รูป Avatar + ชุดที่เลือก) มีเงา ป้ายชื่อ ช่องถือของ */
export function makeChar(name: string, mine: boolean): CharRig {
  const root = new THREE.Group();
  blob(root, 0.8);
  const body = new THREE.Group();
  root.add(body);
  const mat = new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, alphaTest: 0.05 });
  const sprite = new THREE.Sprite(mat);
  sprite.center.set(0.5, 0.06);
  sprite.scale.set(CHAR_H * (128 / 132), CHAR_H, 1);
  sprite.visible = false;
  body.add(sprite);
  const hand = new THREE.Group();
  hand.position.set(0, CHAR_H + 0.25, 0);
  body.add(hand);
  const quiz = labelSprite('?', '#9b6cf0', '#fff');
  quiz.scale.set(0.55, 0.55, 1);
  quiz.position.set(0.9, CHAR_H + 0.4, 0);
  quiz.visible = false;
  root.add(quiz);
  const label = labelSprite(mine ? 'ฉัน' : name, mine ? '#ffcf3f' : '#ffffff');
  label.position.y = CHAR_H + 0.75;
  root.add(label);
  return { root, body, sprite, label, hand, carry: null, carryKey: '', pet: null, petKey: '', quiz, img: null, face: 1 };
}

/** ใส่รูปตัวละครเมื่อโหลดเสร็จ */
export function setCharImage(rig: CharRig, img: HTMLImageElement | null) {
  if (!img || rig.img === img) return;
  rig.img = img;
  const tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  rig.sprite.material.map = tex;
  rig.sprite.material.needsUpdate = true;
  rig.sprite.visible = true;
}

/** ถือไข่เหนือหัว (b = ลำดับธีม -1 = ไม่ถือ) */
export function setCarry(rig: CharRig, b: number, type: number, size: number) {
  const key = b < 0 ? '' : `${b}:${type}:${size.toFixed(2)}`;
  if (rig.carryKey === key) return;
  rig.carryKey = key;
  if (rig.carry) rig.hand.remove(rig.carry);
  rig.carry = null;
  if (b >= 0) {
    rig.carry = makeEgg(b, type, size * 0.85);
    rig.hand.add(rig.carry);
  }
}

/** สัตว์ที่ถือโชว์ (เดินข้างตัว ขนาดตามน้ำหนัก) */
export function setPet(rig: CharRig, b: number, type: number, kg: number) {
  const key = b < 0 ? '' : `${b}:${type}:${kg}`;
  if (rig.petKey === key) return;
  rig.petKey = key;
  if (rig.pet) rig.root.remove(rig.pet);
  rig.pet = null;
  if (b >= 0) {
    rig.pet = makePet(b, type, kg);
    rig.pet.position.set(1.5, 0, 0.3);
    rig.root.add(rig.pet);
  }
}

/** ท่าเดิน: ตัวเด้ง เอียงซ้ายขวา หันตามทางเดิน */
export function poseChar(rig: CharRig, moving: boolean, t: number, stunned: boolean, dirX = 0) {
  if (Math.abs(dirX) > 0.15) rig.face = dirX > 0 ? 1 : -1;
  const s = moving ? Math.sin(t * 14) : 0;
  rig.body.position.y = moving ? Math.abs(s) * 0.18 : Math.sin(t * 3) * 0.03;
  rig.sprite.scale.x = Math.abs(rig.sprite.scale.x) * rig.face;
  rig.sprite.material.rotation = stunned ? Math.sin(t * 14) * 0.3 : s * 0.06;
  if (rig.carry) rig.carry.rotation.y = t * 1.5;
  if (rig.pet) {
    rig.pet.position.x = -rig.face * (1.2 + ((rig.pet.userData.s as number) || 1) * 0.6);
    rig.pet.position.y = moving ? Math.abs(Math.sin(t * 12 + 1)) * 0.25 : 0;
    rig.pet.rotation.y = moving ? 0 : Math.sin(t * 1.5) * 0.4;
  }
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

export function makeBoss(b: number, tier: number): BossRig {
  const bi = BIOMES[b];
  const big = bi.boss.scale * (1 + tier * 0.12);
  const root = new THREE.Group();
  blob(root, 2.2 * big);
  const body = new THREE.Group();
  body.scale.setScalar(big);
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
  label.position.y = 5.2 * big;
  root.add(label);
  const home = bossHome(tier);
  root.position.set(home.x, 0, home.z);
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

/* ------------------------------------------------------------------ สัตว์ที่ฟักได้ */

export function makePet(b: number, t: number, kg: number) {
  const p = petLook(b, t);
  const k = petScale(kg);
  const g = new THREE.Group();
  g.userData.s = k;
  blob(g, 0.75 * k);
  const body = new THREE.Group();
  body.scale.setScalar(0.34 * k);
  g.add(body);
  part(body, SPHERE(), toon(p.body), [0, 1.95, 0], [1.75, 1.6, 1.55], { ink: 0.1 });
  part(body, SPHERE(), toon(p.belly), [0, 1.65, 0.85], [1.15, 1.05, 0.75], { ink: 0 });
  for (const sx of [-1, 1]) {
    part(body, SPHERE(), toon(p.body), [sx * 0.95, 0.35, 0.35], [0.55, 0.35, 0.7]);
    const e = part(body, SPHERE(), toon('#ffffff'), [sx * 0.6, 2.45, 1.3], [0.4, 0.46, 0.22], { ink: 0.08 });
    part(e, SPHERE(), toon(INK), [0, -0.05, 0.8], [0.55, 0.6, 0.4], { ink: 0 });
    part(body, SPHERE(), toon('#ff9db5'), [sx * 1.1, 2.0, 1.25], [0.3, 0.18, 0.1], { ink: 0 });
  }
  bossParts(body, p.parts, p.body, p.belly);
  if (p.rarity === 'legend' || p.rarity === 'secret') {
    const ring = new THREE.Group();
    ring.name = 'sparkle';
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(OCTA(), toon(RARITY[p.rarity].color, RARITY[p.rarity].color));
      const a = (i / 5) * Math.PI * 2;
      s.position.set(Math.cos(a) * 1.1 * k, 1.1 * k, Math.sin(a) * 1.1 * k);
      s.scale.setScalar(0.12 * k);
      ring.add(s);
    }
    g.add(ring);
  }
  return g;
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
  themes: number[];
  private nestCount = 0;
  private el: HTMLElement;

  constructor(el: HTMLElement, seed: number, themes: number[]) {
    this.el = el;
    this.themes = themes;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    el.appendChild(this.renderer.domElement);
    const sc = this.scene;
    sc.background = new THREE.Color('#8fd8ff');
    sc.fog = new THREE.Fog('#8fd8ff', 55, 120);
    sc.add(new THREE.HemisphereLight(0xffffff, 0x88aacc, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(20, 40, 25);
    sc.add(sun);
    this.buildGround(seed);
    themes.forEach((b, tier) => {
      const boss = makeBoss(b, tier);
      this.bosses.push(boss);
      sc.add(boss.root);
    });
    this.nest.position.set(0, 0, SAFE_Z * 0.55);
    sc.add(this.nest);
    this.loadModels();
  }

  private buildGround(seed: number) {
    const sc = this.scene;
    const plane = (w: number, l: number, color: string, x: number, z: number, y = 0) => {
      const m = new THREE.Mesh(G('plane', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), toon(color));
      m.scale.set(w, 1, l);
      m.position.set(x, y, z);
      sc.add(m);
      return m;
    };
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 500).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#4cc3ef' }));
    sea.position.set(0, -0.4, END_Z / 2);
    sc.add(sea);
    plane(HALF_W * 2 + 6, SAFE_Z - END_Z + 6, '#ffe3a8', 0, (SAFE_Z + END_Z) / 2, -0.05);

    // ฐานปลอดภัย (z 0..SAFE_Z)
    plane(HALF_W * 2, SAFE_Z, '#9ff0c8', 0, SAFE_Z / 2, 0.01);
    plane(HALF_W * 2, 0.8, '#25c48a', 0, 0.4, 0.02);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, 2.6), new THREE.MeshBasicMaterial({ color: '#3fffb0', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    wall.position.set(0, 1.3, 0);
    sc.add(wall);
    part(sc, G('torus', () => new THREE.TorusGeometry(1, 0.35, 10, 24).rotateX(Math.PI / 2)), toon('#c98a4b'), [0, 0.35, SAFE_Z * 0.55], [2.4, 2.4, 1.6]);
    part(sc, CYL(), toon('#e8b878'), [0, 0.12, SAFE_Z * 0.55], [2.4, 0.2, 2.4], { ink: 0.04 });
    const sign = labelSprite('ฐานปลอดภัย', '#25c48a', '#ffffff');
    sign.position.set(0, 3.2, 2.5);
    sign.scale.multiplyScalar(1.6);
    sc.add(sign);
    // ซุ้มประตูฐาน
    for (const sx of [-1, 1]) part(sc, CYL(), toon('#25c48a'), [sx * (HALF_W - 0.6), 1.6, 0.2], [0.5, 3.2, 0.5], { ink: 0.05 });

    this.themes.forEach((b, tier) => {
      const bi = BIOMES[b];
      const z0 = -tier * BIOME_L;
      const zc = z0 - BIOME_L / 2;
      plane(HALF_W * 2, BIOME_L, bi.ground, 0, zc, 0.01);
      plane(3.4, BIOME_L, bi.ground2, 0, zc, 0.02);
      // ป้ายไบโอมที่ทางเข้า
      const tag = labelSprite(`ไบโอม ${tier + 1} · ${bi.name}`, bi.ground, '#2a2350');
      tag.position.set(0, 2.6, z0 - 1.5);
      tag.scale.multiplyScalar(1.5);
      sc.add(tag);
      // รั้วสองข้าง + เส้นแบ่งไบโอม
      for (let z = z0 - 1; z > z0 - BIOME_L; z -= 3.4)
        for (const sx of [-1, 1]) part(sc, CYL(), toon('#fff6e6'), [sx * HALF_W, 0.5, z], [0.18, 1, 0.18], { ink: 0.04 });
      plane(HALF_W * 2, 0.5, '#fff6e6', 0, z0 - 0.25, 0.03);
      // ของตกแต่ง (ไม่ทับทางเดินกลาง/ที่นอนบอส)
      const rr = rng(seed + tier * 7919);
      const boss = bossHome(tier);
      let placed = 0;
      for (let k = 0; k < 160 && placed < 13; k++) {
        const p = { x: (rr() * 2 - 1) * (HALF_W - 2), z: z0 - 3 - rr() * (BIOME_L - 5) };
        if (Math.abs(p.x) < 3.6) continue;
        if (Math.hypot(p.x - boss.x, p.z - boss.z) < 6) continue;
        if (this.obstacles.some((o) => Math.hypot(o.x - p.x, o.z - p.z) < o.r + 2.5)) continue;
        const { g, rad } = makeProp(bi.props[placed % bi.props.length], bi.propColor, rr);
        g.position.set(p.x, 0, p.z);
        g.rotation.y = rr() * 6.28;
        sc.add(g);
        if (rad > 0) this.obstacles.push({ x: p.x, z: p.z, r: rad });
        placed++;
      }
    });
    // ป้ายสุดทาง
    const end = labelSprite('สุดทาง', '#2a2350', '#ffffff');
    end.position.set(0, 2.4, END_Z + 1);
    sc.add(end);
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
        const tier = this.themes.findIndex((b) => BIOMES[b].id === id);
        if (tier < 0 || !/^[\w.-]+\.glb$/.test(file)) continue;
        loader.load(`/models/egg/${file}`, (gltf) => {
          const rig = this.bosses[tier];
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

  /** วาดไข่ช่อง key (tier = ไบโอมลำดับที่, type = ชนิด, size = ขนาดสุ่ม) null = ไม่มีไข่ */
  setEgg(key: number, pos: { x: number; z: number }, tier: number, type: number | null, size = 1) {
    const old = this.eggs.get(key);
    if (old) {
      this.scene.remove(old);
      this.eggs.delete(key);
    }
    if (type === null) return;
    const rar = EGG_SLOTS_RARITY[type];
    const g = makeEgg(this.themes[tier], type, eggVisual(tier, type, size));
    g.position.set(pos.x, 0, pos.z);
    part(g, CYL(), toon('#fff6e6'), [0, 0.08, 0], [0.8, 0.16, 0.8], { ink: 0.04 });
    if (rar !== 'common') {
      const beam = new THREE.Mesh(G('beam', () => new THREE.CylinderGeometry(0.3, 0.5, 6, 12, 1, true)), new THREE.MeshBasicMaterial({ color: RARITY[rar].color, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = 3;
      g.add(beam);
    }
    this.scene.add(g);
    this.eggs.set(key, g);
  }

  /** สัตว์ที่ฟักแล้ว: มายืนเล่นในรังกลางฐาน (สูงสุด 12 ตัว) */
  addToNest(b: number, type: number, kg: number) {
    const pet = makePet(b, type, Math.min(kg, 60));
    const i = this.nestCount++ % 12;
    const a = i * 2.4;
    const r = 3 + (i % 3) * 1.6;
    pet.position.set(Math.cos(a) * r, 0, Math.sin(a) * r * 0.7);
    if (this.nest.children.length >= 12) this.nest.remove(this.nest.children[0]);
    this.nest.add(pet);
  }

  animateEggs(t: number) {
    this.eggs.forEach((g, k) => {
      const e = g.children[0];
      if (e) e.position.y = (e.userData.y0 ?? (e.userData.y0 = e.position.y)) + Math.sin(t * 2 + k) * 0.08 + 0.1;
      const sp = g.getObjectByName('sparkle');
      if (sp) sp.rotation.y = t * 1.6;
    });
    this.nest.children.forEach((p, i) => {
      p.position.y = Math.abs(Math.sin(t * 3 + i)) * 0.25;
      p.rotation.y = Math.sin(t * 0.8 + i) * 0.8;
    });
  }

  render(cx: number, cz: number) {
    const w = this.el.clientWidth || 1;
    const h = this.el.clientHeight || 1;
    const c = this.renderer.domElement;
    if (c.width !== Math.round(w * this.renderer.getPixelRatio()) || c.height !== Math.round(h * this.renderer.getPixelRatio())) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    // จอแนวตั้งมองไกลขึ้น จะได้เห็นทางข้างหน้า
    const far = w < h ? 1.35 : 1;
    this.camera.position.set(cx * 0.6, 17 * far, cz + 14 * far);
    this.camera.lookAt(cx * 0.6, 0.8, cz - 3);
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

/** ขนาดไข่ที่เห็น: ระดับความหายาก x ขนาดสุ่ม x ไบโอมไกล */
export const eggVisual = (tier: number, type: number, size: number) => RARITY[EGG_SLOTS_RARITY[type]].size * size * (1 + tier * 0.1);
