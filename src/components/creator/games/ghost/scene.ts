/**
 * โมเดล 3 มิติของ Ghost Hunter AR (ใช้ฉาก toon ร่วมกับ Magic Kingdom ผ่าน SceneKit)
 * ผีผ้าห่ม/ผีฟักทอง/ผีขนม/ราชาผี น่ารักตลก ไม่น่ากลัว + เบาะแส หีบ ประตูปริศนา โถผีใจดี สิ่งกีดขวาง บอส 5 ตัว
 */
import * as THREE from 'three';
import { BOX, CONE, CYL, OCTA, RING, SPHERE, MagicScene, blush, eyes, part, toon, type SceneKit } from '../magic/scene';
import type { GhostBossId, GhostId } from '@/lib/game-creator/ghost/data';

const glass = new THREE.MeshToonMaterial({ color: '#e8fff6', transparent: true, opacity: 0.3, depthWrite: false });

/** ตัวผีผ้าห่ม (หัวกลม ชายผ้าเป็นคลื่น) */
function sheet(g: THREE.Object3D, color: string, s = 1) {
  part(g, SPHERE, toon(color, 0.25), [0, 0.15 * s, 0], [0.8 * s, 0.85 * s, 0.72 * s], 0.06);
  part(g, CYL, toon(color, 0.25), [0, -0.45 * s, 0], [0.8 * s, 0.7 * s, 0.72 * s], 0.05);
  for (let i = 0; i < 4; i++) part(g, SPHERE, toon(color, 0.25), [(-0.6 + i * 0.4) * s, -0.82 * s, 0], [0.22 * s, 0.2 * s, 0.22 * s], 0.03);
  eyes(g, 0.24 * s, 0.25 * s, 0.62 * s, 0.15 * s);
  part(g, SPHERE, toon('#2a1d50'), [0, -0.05 * s, 0.68 * s], [0.12 * s, 0.1 * s, 0.05 * s], 0);
  blush(g, 0.45 * s, 0, 0.6 * s, 0.11 * s);
}

/** kind 0 = ผีผ้าห่ม, 1 = ผีฟักทอง, 2 = ผีขนม, 3 = ราชาผี (มงกุฎ) */
function makeGhostMob(color: string, kind: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  if (kind === 1) {
    part(body, SPHERE, toon('#ff9a3d'), [0, 0, 0], [0.9, 0.75, 0.8], 0.06);
    for (const x of [-0.45, 0.45]) part(body, SPHERE, toon('#ff8a2d'), [x, 0, 0], [0.4, 0.72, 0.7], 0.03);
    part(body, CYL, toon('#3fae6a'), [0, 0.78, 0], [0.1, 0.25, 0.1], 0.02);
    for (const sx of [-1, 1]) part(body, CONE, toon('#ffe94d', 0.9), [sx * 0.28, 0.12, 0.72], [0.12, 0.14, 0.05], 0, [0, 0, Math.PI]);
    part(body, SPHERE, toon('#ffe94d', 0.9), [0, -0.25, 0.74], [0.28, 0.08, 0.04], 0);
    part(body, CONE, toon('#f4f4ff', 0.2), [0, -0.85, 0], [0.6, 0.6, 0.55], 0, [Math.PI, 0, 0]);
  } else if (kind === 2) {
    sheet(body, color, 0.95);
    part(body, SPHERE, toon('#ffffff'), [0, 0.95, 0], [0.28, 0.2, 0.28], 0.03);
    part(body, SPHERE, toon('#ff4d6d', 0.3), [0, 1.12, 0], [0.1, 0.1, 0.1], 0.02);
    for (const sx of [-1, 1]) part(body, CONE, toon('#ffd23f'), [sx * 0.95, -0.1, 0], [0.12, 0.22, 0.12], 0.02, [0, 0, sx * 1.4]);
  } else {
    sheet(body, color);
    if (kind === 3) {
      part(body, CYL, toon('#ffc53a', 0.4), [0, 1.0, 0], [0.4, 0.2, 0.4], 0.03);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        part(body, CONE, toon('#ffc53a', 0.4), [Math.cos(a) * 0.35, 1.2, Math.sin(a) * 0.35], [0.08, 0.22, 0.08], 0.02);
      }
    }
  }
  const arms: THREE.Object3D[] = [];
  if (kind !== 1)
    for (const sx of [-1, 1]) {
      const a = new THREE.Group();
      a.position.set(sx * 0.72, 0, 0.1);
      part(a, SPHERE, toon(color, 0.25), [sx * 0.15, 0, 0], [0.22, 0.14, 0.14], 0.03);
      body.add(a);
      arms.push(a);
    }
  g.userData = { body, arms };
  return g;
}
export const ghostKind = (id: GhostId) => (id === 'pumpkin' ? 1 : id === 'candy' ? 2 : id === 'king' ? 3 : 0);

/* ------------------------------ เบาะแส + หีบ ------------------------------ */

export type ClueKind = 'key' | 'book' | 'picture' | 'code';
export const CLUE_KINDS: ClueKind[] = ['key', 'book', 'picture', 'code'];
export function makeClue(kind: ClueKind): THREE.Group {
  const g = new THREE.Group();
  const s = new THREE.Group();
  g.add(s);
  if (kind === 'key') {
    part(s, RING, toon('#ffc53a', 0.4), [0, 0.45, 0], [0.4, 0.4, 2], 0.03);
    part(s, CYL, toon('#ffc53a', 0.4), [0, -0.2, 0], [0.09, 1, 0.09], 0.02);
    for (const y of [-0.55, -0.35]) part(s, BOX, toon('#ffc53a', 0.4), [0.15, y, 0], [0.22, 0.1, 0.08], 0.02);
  } else if (kind === 'book') {
    part(s, BOX, toon('#b85cff'), [0, 0, 0], [0.9, 1.15, 0.3], 0.05);
    part(s, BOX, toon('#fffaf2'), [0.06, 0, 0], [0.8, 1.05, 0.26], 0);
    part(s, OCTA, toon('#ffe38a', 0.7), [0, 0.1, 0.17], [0.16, 0.2, 0.05], 0);
  } else if (kind === 'picture') {
    part(s, BOX, toon('#c08a3e'), [0, 0, 0], [1.1, 0.9, 0.12], 0.05);
    part(s, BOX, toon('#9ff0d0'), [0, 0, 0.05], [0.85, 0.65, 0.05], 0);
    part(s, SPHERE, toon('#ffffff'), [0, 0.02, 0.1], [0.18, 0.2, 0.05], 0);
  } else {
    part(s, CYL, toon('#fff3c4'), [0, 0, 0], [0.32, 1.1, 0.32], 0.04, [0, 0, Math.PI / 2]);
    part(s, CYL, toon('#c08a3e'), [0.6, 0, 0], [0.12, 0.2, 0.12], 0.02, [0, 0, Math.PI / 2]);
    part(s, CYL, toon('#c08a3e'), [-0.6, 0, 0], [0.12, 0.2, 0.12], 0.02, [0, 0, Math.PI / 2]);
    part(s, BOX, toon('#ff4d6d'), [0, 0, 0.3], [0.2, 0.2, 0.05], 0);
  }
  g.userData.spin = s;
  return g;
}
export function makeChest(): THREE.Group {
  const g = new THREE.Group();
  const s = new THREE.Group();
  g.add(s);
  part(s, BOX, toon('#6b4a9a'), [0, -0.2, 0], [1.3, 0.75, 0.8], 0.06);
  part(s, CYL, toon('#8a5cc8'), [0, 0.2, 0], [0.4, 1.3, 0.4], 0.05, [0, 0, Math.PI / 2]);
  part(s, BOX, toon('#3fe0a0', 0.6), [0, -0.05, 0.42], [0.25, 0.3, 0.06], 0.02);
  for (const x of [-0.5, 0.5]) part(s, BOX, toon('#ffc53a'), [x, -0.05, 0], [0.1, 1.15, 0.84], 0);
  g.userData.spin = s;
  return g;
}

/* ------------------------------ ประตูปริศนา / โถผีใจดี (bars + kid ใช้ openCage ร่วม) ------------------------------ */

export function makeDoor(): THREE.Group {
  const g = new THREE.Group();
  part(g, BOX, toon('#3a2a5a'), [0, 0, -0.1], [1.7, 2.3, 0.15], 0.05);
  const kid = new THREE.Group();
  part(kid, OCTA, toon('#ffe38a', 0.9), [0, 0, 0], [0.35, 0.5, 0.35], 0.03);
  g.add(kid);
  const bars = new THREE.Group();
  part(bars, BOX, toon('#8a5a3a'), [0, 0, 0.1], [1.4, 2, 0.12], 0.05);
  for (const y of [-0.5, 0.5]) part(bars, BOX, toon('#6b4a2a'), [0, y, 0.18], [1.3, 0.12, 0.05], 0);
  part(bars, SPHERE, toon('#ffc53a', 0.4), [0.45, 0, 0.22], [0.1, 0.1, 0.06], 0.02);
  part(bars, BOX, toon('#ffc53a'), [0, 0.1, 0.26], [0.32, 0.4, 0.08], 0.03);
  part(bars, CYL, toon('#2a1d50'), [0, 0.05, 0.31], [0.05, 0.14, 0.02], 0);
  g.add(bars);
  g.userData = { bars, kid };
  return g;
}
export function makeJar(color: string): THREE.Group {
  const g = new THREE.Group();
  const kid = new THREE.Group();
  sheet(kid, color, 0.5);
  g.add(kid);
  const glassJar = new THREE.Mesh(CYL, glass);
  glassJar.scale.set(0.85, 1.7, 0.85);
  g.add(glassJar);
  part(g, CYL, toon('#6d5bff'), [0, -0.88, 0], [0.9, 0.12, 0.9], 0.04);
  const bars = new THREE.Group();
  part(bars, CYL, toon('#ffc53a'), [0, 0.95, 0], [0.92, 0.2, 0.92], 0.04);
  bars.add(glassJar);
  g.add(bars);
  g.userData = { bars, kid };
  return g;
}

/* ------------------------------ สิ่งกีดขวางรอบหนีผี ------------------------------ */

export type ObstacleKind = 'bat' | 'book' | 'pumpkin' | 'chaser';
export const OBSTACLE_KINDS: ObstacleKind[] = ['bat', 'book', 'pumpkin', 'chaser'];
export function makeObstacle(kind: ObstacleKind): THREE.Group {
  if (kind === 'pumpkin') return makeGhostMob('#ff9a3d', 1);
  if (kind === 'chaser') return makeGhostMob('#c8b8ff', 0);
  if (kind === 'book') {
    const g = makeClue('book');
    return g;
  }
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  part(body, SPHERE, toon('#5b4a9a'), [0, 0, 0], [0.55, 0.5, 0.5], 0.05);
  eyes(body, 0.18, 0.08, 0.42, 0.12);
  for (const sx of [-1, 1]) part(body, CONE, toon('#5b4a9a'), [sx * 0.3, 0.5, 0], [0.12, 0.25, 0.1], 0.02);
  const wings: THREE.Object3D[] = [];
  for (const sx of [-1, 1]) {
    const w = new THREE.Group();
    w.position.set(sx * 0.5, 0.1, 0);
    part(w, CONE, toon('#7a6ac8'), [sx * 0.45, 0, 0], [0.3, 0.9, 0.06], 0.03, [0, 0, -sx * Math.PI / 2]);
    body.add(w);
    wings.push(w);
  }
  g.userData = { body, wings };
  return g;
}

/* ------------------------------ บอส ------------------------------ */

function bossSheet(color: string, extra: (b: THREE.Group) => void, tentacles = false): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Group();
  g.add(b);
  sheet(b, color, 1.25);
  extra(b);
  const arms: THREE.Object3D[] = [];
  const tent: THREE.Object3D[] = [];
  for (const sx of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(sx * 1.0, 0.05, 0.1);
    part(a, SPHERE, toon(color, 0.25), [sx * 0.2, -0.1, 0], [0.3, 0.2, 0.2], 0.04);
    b.add(a);
    arms.push(a);
  }
  if (tentacles)
    for (let i = 0; i < 4; i++) {
      const t = new THREE.Group();
      t.position.set(-0.75 + i * 0.5, -1.1, 0);
      part(t, CONE, toon(color, 0.2), [0, -0.3, 0], [0.16, 0.6, 0.16], 0.03, [Math.PI, 0, 0]);
      b.add(t);
      tent.push(t);
    }
  g.userData = { body: b, arms, tent };
  return g;
}
const BOSS: Record<GhostBossId, () => THREE.Group> = {
  giant: () => bossSheet('#bfe6ff', (b) => part(b, SPHERE, toon('#ffffff'), [0, 0.6, 0.85], [0.25, 0.08, 0.05], 0)),
  shadow: () =>
    bossSheet('#5b4a9a', (b) => {
      for (const sx of [-1, 1]) part(b, SPHERE, toon('#ffe94d', 1), [sx * 0.3, 0.35, 0.92], [0.16, 0.1, 0.05], 0);
    }, true),
  wizard: () =>
    bossSheet('#c8a3ff', (b) => {
      part(b, CONE, toon('#5b2fc0'), [0, 1.55, 0], [0.75, 1.1, 0.7], 0.06, [0.1, 0, 0.12]);
      part(b, OCTA, toon('#3fe0a0', 0.8), [0.12, 2.15, 0.1], [0.14, 0.2, 0.14], 0.02);
    }),
  king: () =>
    bossSheet('#fff3c4', (b) => {
      part(b, CYL, toon('#ffc53a', 0.4), [0, 1.3, 0], [0.5, 0.26, 0.5], 0.04);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        part(b, CONE, toon('#ffc53a', 0.4), [Math.cos(a) * 0.45, 1.55, Math.sin(a) * 0.45], [0.11, 0.32, 0.11], 0.02);
      }
      part(b, BOX, toon('#ff4d6d'), [0, -0.3, 0.9], [1.4, 0.18, 0.05], 0);
    }),
  lord: () =>
    bossSheet('#3fe0a0', (b) => {
      part(b, CONE, toon('#1f6f5a'), [0, -0.4, -0.5], [1.6, 2.2, 0.4], 0.05);
      for (const sx of [-1, 1]) part(b, CONE, toon('#2a1d50'), [sx * 0.5, 1.35, 0], [0.14, 0.45, 0.14], 0.03, [0, 0, -sx * 0.4]);
      part(b, OCTA, toon('#ffe94d', 0.9), [0, 0.95, 0.85], [0.12, 0.16, 0.05], 0);
    }, true),
};

export const GHOST_KIT: SceneKit = { mob: makeGhostMob, boss: (k) => (BOSS[k as GhostBossId] || BOSS.giant)(), mote: 0xb8ffe0, ground: 0x3a2a6b };
export const makeGhostScene = (el: HTMLElement, camOn: boolean) => new MagicScene(el, camOn, GHOST_KIT);
export type GhostScene = MagicScene;
