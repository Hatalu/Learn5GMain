'use client';

/** บอลกลิ้งกลับบ้าน (จัดกลุ่ม, 3D จริงด้วย three.js): แตะบ้านหมวดที่ถูก บอลกลิ้งเข้าไป */
import React, { useEffect, useRef } from 'react';
import type * as THREE from 'three';
import { gsfx } from '@/lib/game-creator/gsound';
import { Empty, Hud, Stamp, useLoop, useNumKeys, type DemoProps } from '../demoKit';
import { BeltDemo } from '../demosAct';
import { Tweens, ease, type Stage3D } from './stage3d';
import { use3D } from './use3d';

const HOUSE = ['#4fb3ff', '#ff8a5c', '#9b6cf0'];
const ROOF = ['#2f7fd6', '#e8553a', '#6a43c9'];
const BALLS = ['#ff6b7a', '#ffcf3f', '#3fd6a8', '#ff9ad5', '#7fd0ff'];
const PAD: [number, number, number] = [0, 0.66, 2.4];

interface House {
  g: THREE.Group;
  door: THREE.Group;
  flag: THREE.Mesh;
  wins: THREE.Mesh[];
  count: number;
  el: HTMLElement;
}

function buildRoll(st: Stage3D, onHouse: (i: number) => void) {
  const T = st.T;
  const tw = new Tweens();
  // มุมสูงเห็นทั้งโต๊ะ: บ้าน+ป้ายอยู่ใต้แถบคำถาม บอลอยู่เหนือป้ายบอกวิธีเล่น
  st.camera.position.set(0, 10.4, 9.6);
  st.camera.lookAt(0, 0.6, -1.9);

  const grass = st.part(new T.CircleGeometry(48, 40), '#9be08a', [0, -0.62, 0]);
  grass.rotation.x = -Math.PI / 2;
  st.part(new T.BoxGeometry(13, 0.6, 10.6), '#f3c58e', [0, -0.3, 0]);
  for (const [x, z, w, d] of [
    [0, 5.3, 13.4, 0.5],
    [0, -5.3, 13.4, 0.5],
    [6.7, 0, 0.5, 10.6],
    [-6.7, 0, 0.5, 10.6],
  ])
    st.part(new T.BoxGeometry(w, 0.55, d), '#d9955c', [x, 0.05, z]);
  // ต้นไม้ ดอกไม้ ก้อนเมฆ
  const trees: THREE.Group[] = [];
  for (const [x, z, s] of [
    [-5.6, -4.4, 1],
    [5.6, -4.3, 0.9],
    [-5.7, 3.9, 0.75],
    [5.8, 4, 0.8],
  ]) {
    const g = st.group([x, 0, z]);
    st.part(new T.CylinderGeometry(0.14 * s, 0.18 * s, 1.1 * s, 10), '#a8743f', [0, 0.55 * s, 0], g);
    const crown = st.part(new T.SphereGeometry(0.75 * s, 18, 14), '#5fcf7a', [0, 1.45 * s, 0], g);
    st.outline(crown, 0.06);
    trees.push(g);
  }
  const flowerG = new T.SphereGeometry(0.16, 10, 8);
  [
    [-4.6, 2.2, '#ff6b7a'],
    [-4.2, 2.6, '#ffcf3f'],
    [4.5, 1.9, '#ff9ad5'],
    [4.9, 2.4, '#7fd0ff'],
    [-2.2, 4.6, '#ffcf3f'],
    [2.6, 4.6, '#ff6b7a'],
  ].forEach(([x, z, c]) => st.part(flowerG, String(c), [Number(x), 0.15, Number(z)]));
  for (const [x, y, z] of [
    [-9, 6, -12],
    [8, 7.5, -14],
  ]) {
    const g = st.group([x, y, z]);
    [0, 1.1, 2].forEach((k, i) => st.part(new T.SphereGeometry(i === 1 ? 1.2 : 0.9, 14, 10), '#ffffff', [k * 1.2, i === 1 ? 0.3 : 0, 0], g));
  }
  const pad = st.part(new T.CylinderGeometry(0.95, 1.05, 0.2, 28), '#ffffff', [0, 0.1, PAD[2]]);
  st.outline(pad, 0.04);

  /* ---- บ้าน = หมวด ---- */
  let houses: House[] = [];
  const setHouses = (cats: string[]) => {
    houses.forEach((h) => {
      st.unlabel(h.el);
      st.scene.remove(h.g);
    });
    const xs = cats.length === 2 ? [-2.9, 2.9] : [-4.1, 0, 4.1];
    houses = cats.map((c, i) => {
      const g = st.group([xs[i] ?? 0, 0, -3.1]);
      const body = st.part(new T.BoxGeometry(2.1, 1.7, 1.8), HOUSE[i % 3], [0, 0.85, 0], g);
      st.outline(body, 0.035);
      const roof = st.part(new T.ConeGeometry(1.7, 1.25, 4), ROOF[i % 3], [0, 2.32, 0], g);
      roof.rotation.y = Math.PI / 4;
      st.outline(roof, 0.04);
      const door = st.group([-0.36, 0, 0.92], g);
      st.part(new T.BoxGeometry(0.72, 1.05, 0.1), '#7a4a2a', [0.36, 0.53, 0], door);
      const wins = [-0.68, 0.68].map((x) => st.part(new T.BoxGeometry(0.42, 0.42, 0.08), '#fff3b0', [x, 1.15, 0.92], g));
      st.part(new T.CylinderGeometry(0.04, 0.04, 1.6, 8), '#ffffff', [0.78, 2.9, 0], g);
      const flag = st.part(new T.BoxGeometry(0.5, 0.32, 0.05), '#ffcf3f', [1.05, 2.3, 0], g);
      const el = st.label(g, '', 'is-sign', 3.35);
      el.style.setProperty('--c', '#fff');
      const num = document.createElement('i');
      num.className = 'ag-num';
      num.textContent = String(i + 1);
      el.append(num, document.createTextNode(c));
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        onHouse(i);
      });
      return { g, door, flag, wins, count: 0, el };
    });
  };

  /* ---- บอล = ของหนึ่งชิ้น ---- */
  let ball: THREE.Group | null = null;
  let ballEl: HTMLElement | null = null;
  let busy = false;
  let k = 0;
  const spawn = (text: string) => {
    if (ball) st.scene.remove(ball);
    if (ballEl) st.unlabel(ballEl);
    busy = false;
    const g = st.group(PAD);
    const s = st.part(new T.SphereGeometry(0.66, 28, 20), BALLS[k++ % BALLS.length], [0, 0, 0], g);
    st.outline(s, 0.06);
    for (const x of [-0.22, 0.22]) {
      st.part(new T.SphereGeometry(0.09, 10, 8), '#2a2350', [x, 0.12, 0.6], g);
      st.part(new T.SphereGeometry(0.03, 8, 6), '#ffffff', [x + 0.03, 0.16, 0.68], g);
    }
    const mouth = st.part(new T.TorusGeometry(0.1, 0.03, 6, 12, Math.PI), '#2a2350', [0, -0.08, 0.63], g);
    mouth.rotation.z = Math.PI;
    g.scale.setScalar(0.01);
    tw.add(0.45, (q) => g.scale.setScalar(Math.max(0.01, ease.outBack(q))));
    ball = g;
    ballEl = st.label(g, text, 'is-item', 1.25);
  };

  const roll = (i: number, arrive: () => void) => {
    const h = houses[i];
    if (!ball || busy || !h) return;
    busy = true;
    gsfx.tap();
    const b = ball;
    const from = b.position.clone();
    const to = new T.Vector3(h.g.position.x, 0.66, h.g.position.z + 1.55);
    const mid = new T.Vector3((from.x + to.x) / 2 + (to.x === 0 ? 1.2 : -to.x * 0.25), 0.66, (from.z + to.z) / 2);
    // ย่อตัวก่อนกลิ้ง แล้วกลิ้งตามเส้นโค้ง มีกระโดดข้ามเนินเล็กๆ
    tw.add(0.14, (q) => b.scale.set(1 + 0.18 * q, 1 - 0.2 * q, 1 + 0.18 * q), () => {
      b.scale.setScalar(1);
      let prev = from.clone();
      tw.add(
        1.0,
        (q) => {
          const e = ease.inOut(q);
          const a = (1 - e) * (1 - e);
          const c = 2 * (1 - e) * e;
          const d = e * e;
          const p = new T.Vector3(a * from.x + c * mid.x + d * to.x, 0.66 + Math.sin(e * Math.PI) * 0.9, a * from.z + c * mid.z + d * to.z);
          const step = p.distanceTo(prev);
          b.rotation.x -= step / 0.66;
          b.lookAt(p.x + (p.x - prev.x) * 10, b.position.y, p.z + (p.z - prev.z) * 10);
          b.position.copy(p);
          prev = p;
        },
        arrive,
      );
    });
  };

  const react = (i: number, ok: boolean) => {
    const h = houses[i];
    const b = ball;
    if (!h || !b) return;
    if (ok) {
      gsfx.pick();
      tw.add(0.25, (q) => (h.door.rotation.y = -1.7 * ease.outCubic(q)));
      const z0 = b.position.z;
      tw.add(0.4, (q) => {
        b.position.z = z0 - 1.2 * q;
        b.scale.setScalar(Math.max(0.01, 1 - q));
      });
      h.count++;
      h.wins.forEach((w) => (w.material = st.mat('#ffe066')));
      // ธงขึ้นทีละขั้นตามจำนวนของในบ้าน
      const y0 = h.flag.position.y;
      const y1 = 2.3 + Math.min(h.count, 5) * 0.11;
      tw.add(0.45, (q) => (h.flag.position.y = y0 + (y1 - y0) * ease.outBack(q)));
      tw.add(0.35, (q) => h.g.scale.set(1 + 0.12 * Math.sin(q * Math.PI), 1 - 0.1 * Math.sin(q * Math.PI), 1), () => {
        h.g.scale.setScalar(1);
        tw.add(0.3, (q) => (h.door.rotation.y = -1.7 * (1 - q)));
      });
      st.burst(h.g.position.clone().setY(2.6));
      if (ballEl) {
        st.unlabel(ballEl);
        ballEl = null;
      }
    } else {
      // ชนประตูแล้วกลิ้งกลับมาที่แท่น งงๆ
      const from = b.position.clone();
      const to = new T.Vector3(...PAD);
      tw.add(
        0.8,
        (q) => {
          const e = ease.outCubic(q);
          b.position.lerpVectors(from, to, e);
          b.position.y = 0.66 + Math.abs(Math.sin(q * Math.PI * 2)) * 0.5 * (1 - q);
          b.rotation.z = Math.sin(q * 18) * 0.25 * (1 - q);
          b.rotation.x += 0.12;
        },
        () => {
          b.rotation.set(0, 0, 0);
          busy = false;
        },
      );
    }
  };

  st.onFrame((dt, t) => {
    tw.step(dt);
    const portrait = st.size.w / st.size.h < 1.15;
    const fov = portrait ? 60 : 46;
    if (st.camera.fov !== fov) {
      st.camera.fov = fov;
      st.camera.updateProjectionMatrix();
    }
    if (ball && !busy) {
      ball.position.y = 0.66 + Math.abs(Math.sin(t * 2.6)) * 0.12;
      ball.rotation.y = Math.sin(t * 0.9) * 0.4;
    }
    trees.forEach((g, i) => (g.rotation.z = Math.sin(t * 1.3 + i) * 0.03));
    houses.forEach((h, i) => (h.g.rotation.y = Math.sin(t * 0.8 + i * 2) * 0.05));
  });

  return {
    setHouses,
    spawn,
    roll,
    react,
    pick: (x: number, y: number) => {
      const o = st.pick(x, y, houses.map((h) => h.g));
      return houses.findIndex((h) => h.g === o);
    },
    get busy() {
      return busy;
    },
  };
}

export function RollDemo3D({ items }: DemoProps) {
  const { item, n, score, combo, fb, answer } = useLoop(items, 3, 650);
  const ans = useRef(answer);
  ans.current = answer;
  const goRef = useRef<(i: number) => void>(() => {});
  const { host, labels, scene, ready, failed } = use3D('#ffe9d6', (st) => buildRoll(st, (i) => goRef.current(i)));
  goRef.current = (i: number) => {
    const S = scene.current;
    if (!S || S.busy) return;
    S.roll(i, () => {
      const ok = ans.current(i);
      S.react(i, ok === true);
    });
  };
  const cats = item?.choices.join('|') ?? '';
  useEffect(() => {
    if (ready && item) scene.current?.setHouses(item.choices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, cats]);
  useEffect(() => {
    if (ready && item) scene.current?.spawn(item.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, n, item?.q]);
  useNumKeys((i) => item && i < item.choices.length && goRef.current(i));
  if (failed) return <BeltDemo items={items} />;
  if (!item) return <Empty />;
  return (
    <div
      ref={host}
      className="ag-stage ag-3d"
      onPointerDown={(e) => {
        const i = scene.current?.pick(e.clientX, e.clientY) ?? -1;
        if (i >= 0) goRef.current(i);
      }}
    >
      <div ref={labels} className="ag-3dlabels" />
      <Hud q={item.q} score={score} combo={combo} />
      <span className="ag-3dhint">แตะบ้านหมวดที่ถูก</span>
      <Stamp fb={fb} />
    </div>
  );
}
