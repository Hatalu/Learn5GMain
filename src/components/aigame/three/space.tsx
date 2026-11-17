'use client';

/** ยานอวกาศบินลอดวงแหวน (3D จริงด้วย three.js): บังคับยานไปลอดวงแหวนคำตอบที่ถูก */
import React, { useEffect, useRef } from 'react';
import type * as THREE from 'three';
import { gsfx } from '@/lib/game-creator/gsound';
import { COLORS, Empty, Hud, Stamp, typing, useLoop, type DemoProps } from '../demoKit';
import { SpaceDemo } from '../demos3d';
import { Tweens, ease, type Stage3D } from './stage3d';
import { use3D } from './use3d';

const SZ = 3;
const FAR = -58;
const TRAVEL = 7;
const SPEED = (SZ - FAR) / TRAVEL;
const SPOTS: [number, number][] = [
  [-2.3, 3.3],
  [2.3, 3.3],
  [-2.3, 0.9],
  [2.3, 0.9],
];
const BOX = { x: 3.3, y0: 0.4, y1: 3.9 };

function buildSpace(st: Stage3D) {
  const T = st.T;
  const tw = new Tweens();
  st.scene.fog = new T.Fog('#1f1a56', 24, 75);
  st.camera.position.set(0, 2.3, 9.4);
  st.camera.lookAt(0, 2.1, -6);

  // ดาว: จุดเดียวทั้งก้อน เลื่อนเข้าหากล้อง
  const N = 700;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 60;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 36 + 2;
    pos[i * 3 + 2] = -Math.random() * 90 + 10;
  }
  const sg = new T.BufferGeometry();
  sg.setAttribute('position', new T.BufferAttribute(pos, 3));
  const stars = new T.Points(sg, new T.PointsMaterial({ color: '#ffffff', size: 0.14, sizeAttenuation: true, fog: false }));
  st.scene.add(stars);
  const p1 = st.part(new T.SphereGeometry(6, 32, 24), '#ffb3cf', [-13, 7.5, -34]);
  p1.castShadow = false;
  const p2 = st.part(new T.SphereGeometry(4, 28, 20), '#8fd8ff', [14, -1.5, -30]);
  p2.castShadow = false;
  const ringP = st.part(new T.TorusGeometry(6.2, 0.35, 8, 48), '#ffe08a', [14, -1.5, -30]);
  ringP.rotation.x = 1.2;

  // ยาน
  const ship = st.group([0, 2, SZ]);
  ship.scale.setScalar(0.72);
  const body = st.part(new T.SphereGeometry(0.75, 24, 18), '#c9b8ff', [0, 0, 0], ship);
  body.scale.set(1, 0.55, 1.6);
  st.outline(body, 0.07);
  st.outline(st.part(new T.SphereGeometry(0.42, 18, 14), '#8fd8ff', [0, 0.35, -0.3], ship), 0.08);
  const wing = st.part(new T.BoxGeometry(2.6, 0.12, 0.7), '#ff6b7a', [0, -0.05, 0.25], ship);
  st.outline(wing, 0.06);
  const flame = st.part(new T.ConeGeometry(0.28, 0.9, 12), '#ffcf3f', [0, 0, 1.45], ship);
  flame.rotation.x = Math.PI / 2;
  flame.castShadow = false;
  const target = new T.Vector2(0, 2);

  /* ---- ชุดวงแหวน ---- */
  let set: { g: THREE.Group; els: HTMLElement[]; spots: [number, number][] } | null = null;
  let onArrive: ((x: number, y: number, spots: [number, number][]) => void) | null = null;
  const ringG = new T.TorusGeometry(1.05, 0.16, 12, 40);
  const spawnRings = (choices: string[], wrong: Set<number>, arrive: typeof onArrive) => {
    clear();
    onArrive = arrive;
    const g = st.group([0, 0, FAR]);
    const spots = choices.map((_, i) => SPOTS[i] ?? SPOTS[0]);
    const els = choices.map((c, i) => {
      const r = st.part(ringG, COLORS[i % COLORS.length], [spots[i][0], spots[i][1], 0], g);
      st.outline(r, 0.04);
      r.userData.spin = (i % 2 ? 1 : -1) * 0.8;
      const el = st.label(r, c, '', 0.25);
      if (wrong.has(i)) el.dataset.off = '1';
      el.style.opacity = '0';
      return el;
    });
    set = { g, els, spots };
  };
  const clear = () => {
    if (!set) return;
    set.els.forEach((el) => st.unlabel(el));
    st.scene.remove(set.g);
    set = null;
  };

  st.onFrame((dt, t) => {
    tw.step(dt);
    const portrait = st.size.w / st.size.h < 1.15;
    const fov = portrait ? 66 : 50;
    if (st.camera.fov !== fov) {
      st.camera.fov = fov;
      st.camera.updateProjectionMatrix();
    }
    const a = sg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      let z = a.getZ(i) + SPEED * 1.6 * dt;
      if (z > 12) z -= 100;
      a.setZ(i, z);
    }
    a.needsUpdate = true;
    p1.rotation.y += dt * 0.05;
    // ยานไหลตามเป้า เอียงตามทิศ
    const vx = target.x - ship.position.x;
    const vy = target.y - ship.position.y;
    ship.position.x += vx * Math.min(1, dt * 6);
    ship.position.y += vy * Math.min(1, dt * 6);
    if (!tw.busy) {
      ship.rotation.z = -vx * 0.25;
      ship.rotation.x = vy * 0.12;
    }
    flame.scale.set(1, 1 + Math.sin(t * 40) * 0.25, 1);
    if (set) {
      set.g.position.z += SPEED * dt;
      const z = set.g.position.z;
      set.g.children.forEach((c) => (c.rotation.z += dt * ((c.userData.spin as number) || 0)));
      const op = Math.max(0, Math.min(1, (z + 34) / 10));
      set.els.forEach((el) => (el.style.opacity = String(op)));
      if (z >= SZ - 0.1 && onArrive) {
        const f = onArrive;
        onArrive = null;
        f(ship.position.x, ship.position.y, set.spots);
      }
      if (z > SZ + 6) clear();
    }
  });

  return {
    spawnRings,
    clear,
    steer(nx: number, ny: number) {
      target.set(Math.max(-BOX.x, Math.min(BOX.x, nx * BOX.x)), Math.max(BOX.y0, Math.min(BOX.y1, BOX.y0 + ((ny + 1) / 2) * (BOX.y1 - BOX.y0))));
    },
    nudge(dx: number, dy: number) {
      target.set(Math.max(-BOX.x, Math.min(BOX.x, target.x + dx)), Math.max(BOX.y0, Math.min(BOX.y1, target.y + dy)));
    },
    win(i: number) {
      const s = set;
      if (!s) return;
      const r = s.g.children[i];
      st.burst(new T.Vector3(r.position.x, r.position.y, SZ - 1), 30);
      s.els.forEach((el) => (el.style.visibility = 'hidden'));
      tw.add(0.45, (q) => s.g.children.forEach((c) => c.scale.setScalar(Math.max(0.01, 1 + q * 0.8 - (c === r ? 0 : q)))));
    },
    roll() {
      const r0 = ship.rotation.z;
      tw.add(0.6, (q) => (ship.rotation.z = r0 + Math.PI * 2 * ease.outCubic(q)), () => (ship.rotation.z = 0));
    },
  };
}

export function SpaceDemo3D({ items }: DemoProps) {
  const { item, n, score, combo, fb, wrong, answer } = useLoop(items, 4, 300);
  const ans = useRef(answer);
  ans.current = answer;
  const wrongRef = useRef(wrong);
  wrongRef.current = wrong;
  const { host, labels, scene, ready, failed } = use3D('#1f1a56', buildSpace);
  const [wave, setWave] = React.useState(0);
  useEffect(() => {
    if (!ready || !item) return;
    const S = scene.current!;
    const t = window.setTimeout(
      () =>
        S.spawnRings(item.choices, wrongRef.current, (x, y, spots) => {
          let best = -1;
          let bd = 1e9;
          spots.forEach(([sx, sy], i) => {
            const d = Math.hypot(sx - x, sy - y);
            if (d < bd) {
              bd = d;
              best = i;
            }
          });
          if (bd < 1.35 && !wrongRef.current.has(best)) {
            if (ans.current(best)) {
              S.win(best);
              return;
            }
            S.roll();
          } else gsfx.tick();
          window.setTimeout(() => setWave((w) => w + 1), 900);
        }),
      wave === 0 ? 300 : 500,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, n, wave]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (typing(e)) return;
      const d = { ArrowLeft: [-0.9, 0], KeyA: [-0.9, 0], ArrowRight: [0.9, 0], KeyD: [0.9, 0], ArrowUp: [0, 0.8], KeyW: [0, 0.8], ArrowDown: [0, -0.8], KeyS: [0, -0.8] }[e.code];
      if (!d) return;
      e.preventDefault();
      scene.current?.nudge(d[0], d[1]);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (failed) return <SpaceDemo items={items} />;
  if (!item) return <Empty />;
  const steer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.buttons === 0 && e.type !== 'pointermove') return;
    const r = e.currentTarget.getBoundingClientRect();
    scene.current?.steer(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1) * 1.15 + 0.15);
  };
  return (
    <div ref={host} className="ag-stage ag-3d" onPointerMove={steer} onPointerDown={steer}>
      <div ref={labels} className="ag-3dlabels" />
      <Hud q={item.q} score={score} combo={combo} tone="#1f1a56" />
      <span className="ag-3dhint">เลื่อนนิ้ว/เมาส์ บังคับยานลอดวงแหวนที่ถูก</span>
      <Stamp fb={fb} />
    </div>
  );
}
