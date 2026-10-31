/**
 * โมเดล 3 มิติของ Ocean Guardian AR (ใช้ฉาก toon ร่วมกับ Magic Kingdom ผ่าน SceneKit)
 * ปลาในฟองคำตอบ ขยะ หีบสมบัติ อวนขังสัตว์ทะเล สิ่งกีดขวาง และบอส 5 ตัว น่ารักแบบการ์ตูน ไม่มีความรุนแรง
 */
import * as THREE from 'three';
import { CONE, CYL, OCTA, RING, SPHERE, BOX, MagicScene, blush, eyes, part, toon, type SceneKit } from '../magic/scene';
import type { AnimalId, OceanBossId, TrashKind } from '@/lib/game-creator/ocean/data';

const glass = new THREE.MeshToonMaterial({ color: '#dff8ff', transparent: true, opacity: 0.32, depthWrite: false });

/** ปลาตัวกลม (หางสามเหลี่ยม ครีบ) ใช้ทั้งในฟองคำตอบและเป็นปลาการ์ตูน */
function fish(g: THREE.Object3D, color: string, s = 1, stripes = false) {
  part(g, SPHERE, toon(color), [0, 0, 0], [0.75 * s, 0.6 * s, 0.5 * s], 0.06);
  part(g, CONE, toon(color), [-0.85 * s, 0, 0], [0.38 * s, 0.5 * s, 0.12 * s], 0.04, [0, 0, Math.PI / 2]);
  part(g, CONE, toon(color), [0, 0.6 * s, 0], [0.2 * s, 0.3 * s, 0.08 * s], 0.03);
  if (stripes) for (const x of [-0.25, 0.25]) part(g, CYL, toon('#ffffff'), [x * s, 0, 0], [0.08 * s, 1.05 * s, 0.52 * s], 0.02, [0, 0, 0]);
  eyes(g, 0.2 * s, 0.12 * s, 0.4 * s, 0.13 * s);
  blush(g, 0.42 * s, -0.12 * s, 0.38 * s, 0.09 * s);
}

/** kind 0 = ปลา, 1 = ปลาปักเป้า, 2 = ปู ในฟองอากาศใส (ถือคำตอบ) */
function makeBubbleMob(color: string, kind: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const b = new THREE.Mesh(SPHERE, glass);
  b.scale.setScalar(1.1);
  g.add(b);
  part(g, SPHERE, toon('#ffffff', 0.8), [-0.45, 0.5, 0.75], [0.16, 0.1, 0.05], 0);
  if (kind === 0) fish(body, color, 0.95);
  else if (kind === 1) {
    part(body, SPHERE, toon(color), [0, 0, 0], [0.72, 0.7, 0.68], 0.06);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      part(body, CONE, toon('#fff3c4'), [Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0], [0.08, 0.2, 0.08], 0.02, [0, 0, a - Math.PI / 2]);
    }
    eyes(body, 0.22, 0.12, 0.6, 0.14);
    blush(body, 0.42, -0.15, 0.58, 0.1);
  } else {
    part(body, SPHERE, toon(color), [0, -0.1, 0], [0.75, 0.48, 0.5], 0.06);
    for (const sx of [-1, 1]) {
      part(body, SPHERE, toon(color), [sx * 0.75, 0.25, 0.1], [0.24, 0.2, 0.15], 0.04);
      part(body, CYL, toon(color), [sx * 0.3, 0.42, 0.2], [0.05, 0.3, 0.05], 0.02);
    }
    eyes(body, 0.3, 0.62, 0.22, 0.12);
    blush(body, 0.45, -0.15, 0.42, 0.1);
  }
  g.userData.body = body;
  return g;
}

/* ------------------------------ ขยะ + สมบัติ ------------------------------ */

export function makeTrash(kind: TrashKind): THREE.Group {
  const g = new THREE.Group();
  const s = new THREE.Group();
  g.add(s);
  if (kind === 'bag') {
    part(s, SPHERE, toon('#f4f4f4'), [0, -0.1, 0], [0.7, 0.8, 0.35], 0.05);
    for (const sx of [-1, 1]) part(s, RING, toon('#f4f4f4'), [sx * 0.3, 0.75, 0], [0.22, 0.3, 0.5], 0.02);
    part(s, BOX, toon('#59c8ff'), [0, -0.1, 0.34], [0.5, 0.18, 0.02], 0);
  } else if (kind === 'bottle') {
    part(s, CYL, toon('#9ff0d0'), [0, -0.15, 0], [0.38, 1.1, 0.38], 0.05);
    part(s, CONE, toon('#9ff0d0'), [0, 0.55, 0], [0.38, 0.35, 0.38], 0.04);
    part(s, CYL, toon('#2f8ae8'), [0, 0.82, 0], [0.16, 0.2, 0.16], 0.03);
    part(s, CYL, toon('#ff6b9a'), [0, -0.1, 0], [0.4, 0.35, 0.4], 0);
  } else {
    part(s, CYL, toon('#c8d0dc'), [0, 0, 0], [0.42, 0.95, 0.42], 0.05);
    part(s, CYL, toon('#ff5a5a'), [0, 0, 0], [0.43, 0.5, 0.43], 0);
    part(s, CYL, toon('#8a96a8'), [0, 0.5, 0], [0.36, 0.05, 0.36], 0);
  }
  g.userData.spin = s;
  return g;
}

export function makeChest(): THREE.Group {
  const g = new THREE.Group();
  const s = new THREE.Group();
  g.add(s);
  part(s, BOX, toon('#c0763a'), [0, -0.2, 0], [1.3, 0.75, 0.8], 0.06);
  part(s, CYL, toon('#d98a4a'), [0, 0.2, 0], [0.4, 1.3, 0.4], 0.05, [0, 0, Math.PI / 2]);
  part(s, BOX, toon('#ffc53a', 0.4), [0, -0.05, 0.42], [0.25, 0.3, 0.06], 0.02);
  for (const x of [-0.5, 0.5]) part(s, BOX, toon('#ffc53a'), [x, -0.05, 0], [0.1, 1.15, 0.84], 0);
  part(s, OCTA, toon('#7fe8ff', 0.8), [0, 0.75, 0], [0.18, 0.28, 0.18], 0.02);
  g.userData.spin = s;
  return g;
}

/* ------------------------------ สัตว์ทะเลในอวน ------------------------------ */

function animal(kind: AnimalId): THREE.Group {
  const a = new THREE.Group();
  if (kind === 'turtle') {
    part(a, SPHERE, toon('#3fcf7a'), [0, 0, 0], [0.62, 0.4, 0.55], 0.05);
    part(a, SPHERE, toon('#9be36b'), [0.62, 0.05, 0.1], [0.24, 0.22, 0.22], 0.03);
    eyes(a, 0.08, 0.1, 0.3, 0.06);
    for (const sx of [-1, 1]) part(a, SPHERE, toon('#9be36b'), [sx * 0.35, -0.3, 0.3], [0.2, 0.08, 0.14], 0.02);
  } else if (kind === 'dolphin' || kind === 'whale' || kind === 'shark') {
    const c = kind === 'dolphin' ? '#59a8ff' : kind === 'whale' ? '#4a7bd0' : '#8aa0b8';
    part(a, SPHERE, toon(c), [0, 0, 0], [0.8, kind === 'whale' ? 0.5 : 0.36, 0.38], 0.05);
    part(a, SPHERE, toon('#eef6ff'), [0.1, -0.15, 0.15], [0.55, 0.2, 0.28], 0);
    part(a, CONE, toon(c), [0, 0.38, 0], [0.16, 0.3, 0.1], 0.03, [0, 0, -0.3]);
    part(a, CONE, toon(c), [-0.85, 0, 0], [0.3, 0.32, 0.1], 0.03, [0, 0, Math.PI / 2]);
    eyes(a, 0.1, 0.08, 0.32, 0.07);
  } else if (kind === 'clownfish') {
    fish(a, '#ff8f3d', 0.6, true);
  } else if (kind === 'seahorse') {
    part(a, SPHERE, toon('#ffc53a'), [0, 0.25, 0], [0.28, 0.3, 0.25], 0.04);
    part(a, CONE, toon('#ffc53a'), [0.25, 0.3, 0], [0.1, 0.3, 0.1], 0.02, [0, 0, -Math.PI / 2]);
    part(a, SPHERE, toon('#ffc53a'), [-0.05, -0.2, 0], [0.24, 0.38, 0.22], 0.04);
    part(a, RING, toon('#ffc53a'), [0.05, -0.62, 0], [0.18, 0.18, 0.8], 0.02);
    eyes(a, 0.08, 0.3, 0.22, 0.06);
  } else if (kind === 'octopus') {
    part(a, SPHERE, toon('#ff6b9a'), [0, 0.15, 0], [0.5, 0.5, 0.45], 0.05);
    for (let i = 0; i < 6; i++) part(a, CYL, toon('#ff6b9a'), [-0.4 + i * 0.16, -0.38, 0.1], [0.06, 0.4, 0.06], 0.02);
    eyes(a, 0.15, 0.2, 0.38, 0.09);
  } else {
    part(a, SPHERE, toon('#3a4a6b'), [0, 0, 0], [0.4, 0.62, 0.36], 0.05);
    part(a, SPHERE, toon('#ffffff'), [0, -0.05, 0.18], [0.3, 0.48, 0.22], 0);
    part(a, CONE, toon('#ffb347'), [0, 0.3, 0.38], [0.08, 0.16, 0.08], 0.02, [Math.PI / 2, 0, 0]);
    eyes(a, 0.1, 0.38, 0.26, 0.06);
  }
  return a;
}

/** อวนขังสัตว์ทะเล (bars = อวน, kid = สัตว์) ใช้ openCage ของฉากร่วมได้ */
export function makeNet(kind: AnimalId): THREE.Group {
  const g = new THREE.Group();
  const bars = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    part(bars, CYL, toon('#c8b48a'), [-0.9 + i * 0.36, 0, 0.5], [0.035, 2, 0.035], 0.01);
    part(bars, CYL, toon('#c8b48a'), [0, -0.9 + i * 0.36, 0.5], [0.035, 2, 0.035], 0.01, [0, 0, Math.PI / 2]);
  }
  for (const x of [-1, 1]) part(bars, SPHERE, toon('#ff6b3d'), [x, 1, 0.5], [0.14, 0.14, 0.14], 0.02);
  g.add(bars);
  const kid = animal(kind);
  kid.position.y = -0.3;
  g.add(kid);
  g.userData = { bars, kid };
  return g;
}

/* ------------------------------ สิ่งกีดขวางรอบว่ายหลบ ------------------------------ */

export type ObstacleKind = 'shark' | 'jelly' | 'rock' | 'whirl';
export const OBSTACLE_KINDS: ObstacleKind[] = ['shark', 'jelly', 'rock', 'whirl'];
export function makeObstacle(kind: ObstacleKind): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  if (kind === 'shark') {
    part(body, SPHERE, toon('#8aa0b8'), [0, 0, 0], [0.95, 0.5, 0.5], 0.06);
    part(body, SPHERE, toon('#eef6ff'), [0.1, -0.2, 0.2], [0.65, 0.25, 0.32], 0);
    part(body, CONE, toon('#8aa0b8'), [0, 0.6, 0], [0.22, 0.45, 0.12], 0.03);
    eyes(body, 0.25, 0.12, 0.45, 0.1);
  } else if (kind === 'jelly') {
    part(body, SPHERE, toon('#ff9ad5', 0.3), [0, 0.2, 0], [0.75, 0.55, 0.7], 0.05);
    for (let i = 0; i < 5; i++) part(body, CYL, toon('#ffc4e6'), [-0.5 + i * 0.25, -0.5, 0], [0.05, 0.8, 0.05], 0.01);
    eyes(body, 0.2, 0.25, 0.62, 0.11);
    blush(body, 0.42, 0.05, 0.6, 0.09);
  } else if (kind === 'rock') {
    part(body, OCTA, toon('#8a7a6b'), [0, 0, 0], [0.9, 0.75, 0.7], 0.06);
    part(body, OCTA, toon('#a8988a'), [0.45, 0.4, 0.2], [0.4, 0.35, 0.35], 0.04);
  } else {
    for (let i = 0; i < 4; i++) part(body, RING, toon(i % 2 ? '#bff3ff' : '#59c8ff'), [0, 0, 0], [0.3 + i * 0.22, 0.3 + i * 0.22, 1], 0, [0, 0, i]);
    g.userData.spin = body;
    return g;
  }
  g.userData.body = body;
  return g;
}

/* ------------------------------ บอส ------------------------------ */

function bossShark(): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Group();
  g.add(b);
  part(b, SPHERE, toon('#5b8bd0'), [0, 0, 0], [1.3, 0.8, 0.75], 0.08);
  part(b, SPHERE, toon('#e8f2ff'), [0.15, -0.32, 0.35], [0.95, 0.4, 0.45], 0);
  part(b, CONE, toon('#5b8bd0'), [0, 0.95, 0], [0.32, 0.65, 0.16], 0.05);
  eyes(b, 0.35, 0.2, 0.68, 0.14);
  for (let i = 0; i < 5; i++) part(b, CONE, toon('#ffffff'), [-0.32 + i * 0.16, -0.12, 0.74], [0.06, 0.12, 0.04], 0, [Math.PI, 0, 0]);
  const arms: THREE.Object3D[] = [];
  for (const sx of [-1, 1]) {
    const f = new THREE.Group();
    f.position.set(sx * 0.8, -0.35, 0.1);
    part(f, CONE, toon('#4a7bc0'), [sx * 0.2, -0.15, 0], [0.22, 0.5, 0.1], 0.03, [0, 0, sx * 0.9]);
    b.add(f);
    arms.push(f);
  }
  g.userData = { body: b, arms };
  return g;
}
function bossJelly(): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Group();
  g.add(b);
  part(b, SPHERE, toon('#c06bff', 0.35), [0, 0.3, 0], [1.2, 0.9, 1.1], 0.08);
  for (let i = 0; i < 5; i++) part(b, SPHERE, toon('#e8a8ff', 0.5), [-0.6 + i * 0.3, 0.75, 0.6], [0.1, 0.1, 0.06], 0);
  eyes(b, 0.32, 0.35, 0.95, 0.16, '#5a1f8a');
  blush(b, 0.65, 0.05, 0.9, 0.12);
  const tent: THREE.Object3D[] = [];
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Group();
    t.position.set(-0.85 + i * 0.34, -0.45, 0.1);
    part(t, CYL, toon('#d9a3ff'), [0, -0.55, 0], [0.08, 1.1, 0.08], 0.02);
    b.add(t);
    tent.push(t);
  }
  g.userData = { body: b, tent };
  return g;
}
function bossKraken(): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Group();
  g.add(b);
  part(b, SPHERE, toon('#e0566b'), [0, 0.35, 0], [0.95, 1.05, 0.85], 0.08);
  part(b, SPHERE, toon('#ff8f9a'), [0, 0.95, 0.4], [0.35, 0.2, 0.2], 0);
  eyes(b, 0.3, 0.3, 0.75, 0.17, '#3a1020');
  const tent: THREE.Object3D[] = [];
  for (let i = 0; i < 8; i++) {
    const t = new THREE.Group();
    const a = (i / 8) * Math.PI - Math.PI;
    t.position.set(Math.cos(a) * 0.8, -0.45, Math.sin(a) * -0.3);
    part(t, CONE, toon('#e0566b'), [0, -0.5, 0], [0.18, 1.1, 0.18], 0.03, [Math.PI, 0, 0]);
    for (let k = 0; k < 2; k++) part(t, SPHERE, toon('#ffd0d6'), [0, -0.3 - k * 0.3, 0.12], [0.06, 0.06, 0.03], 0);
    b.add(t);
    tent.push(t);
  }
  g.userData = { body: b, tent };
  return g;
}
function bossOctopus(): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Group();
  g.add(b);
  part(b, SPHERE, toon('#4a3a8a'), [0, 0.3, 0], [1.05, 1, 0.9], 0.08);
  for (const sx of [-1, 1]) part(b, SPHERE, toon('#ffe94d', 0.9), [sx * 0.34, 0.35, 0.85], [0.2, 0.13, 0.06], 0);
  part(b, CYL, toon('#2a1d50'), [0, 1.2, 0], [0.55, 0.28, 0.55], 0.04);
  part(b, CYL, toon('#2a1d50'), [0, 1.05, 0], [0.85, 0.06, 0.85], 0.03);
  const arms: THREE.Object3D[] = [];
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Group();
    t.position.set(-0.9 + i * 0.36, -0.5, 0.15);
    part(t, CYL, toon('#5b4a9a'), [0, -0.45, 0], [0.12, 0.9, 0.12], 0.03);
    b.add(t);
    arms.push(t);
  }
  g.userData = { body: b, arms };
  return g;
}
function bossKing(): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Group();
  g.add(b);
  // ก้อนขยะรวมร่าง: ถุง ขวด กระป๋อง โผล่จากตัว + มงกุฎ
  part(b, SPHERE, toon('#6b7a3a'), [0, -0.1, 0], [1.2, 1.05, 1], 0.08);
  part(b, SPHERE, toon('#8a9a4a'), [0.4, 0.4, 0.6], [0.4, 0.3, 0.25], 0.03);
  for (const sx of [-1, 1]) part(b, SPHERE, toon('#ff4d4d', 0.9), [sx * 0.33, 0.25, 0.92], [0.15, 0.1, 0.05], 0);
  const add = (gg: THREE.Group, pos: [number, number, number], rot: number) => {
    gg.position.set(...pos);
    gg.rotation.z = rot;
    gg.scale.setScalar(0.45);
    b.add(gg);
  };
  add(makeTrash('bottle'), [-0.95, 0.4, 0.3], 0.6);
  add(makeTrash('can'), [0.95, -0.3, 0.4], -0.5);
  add(makeTrash('bag'), [-0.6, -0.75, 0.6], 0.2);
  part(b, CYL, toon('#ffc53a', 0.3), [0, 1.05, 0], [0.5, 0.24, 0.5], 0.04);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    part(b, CONE, toon('#ffc53a', 0.3), [Math.cos(a) * 0.45, 1.3, Math.sin(a) * 0.45], [0.1, 0.3, 0.1], 0.02);
  }
  const arms: THREE.Object3D[] = [];
  for (const sx of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(sx * 1.15, 0.1, 0);
    part(a, SPHERE, toon('#5b6a2a'), [sx * 0.12, -0.4, 0], [0.3, 0.55, 0.3], 0.04);
    b.add(a);
    arms.push(a);
  }
  g.userData = { body: b, arms };
  return g;
}
const BOSS: Record<OceanBossId, () => THREE.Group> = { shark: bossShark, jelly: bossJelly, kraken: bossKraken, octopus: bossOctopus, king: bossKing };

export const OCEAN_KIT: SceneKit = { mob: makeBubbleMob, boss: (k) => (BOSS[k as OceanBossId] || bossShark)(), mote: 0xdff8ff, ground: 0x2f6fd0 };
export const makeOceanScene = (el: HTMLElement, camOn: boolean) => new MagicScene(el, camOn, OCEAN_KIT);
export type OceanScene = MagicScene;
