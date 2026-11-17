'use client';

/** ต่อตึกบล็อกเรียงลำดับ (เรียงลำดับ, 3D จริงด้วย three.js): แตะบล็อกตามลำดับ เครนยกไปต่อเป็นตึก */
import React, { useEffect, useRef } from 'react';
import type * as THREE from 'three';
import { gsfx } from '@/lib/game-creator/gsound';
import { COLORS, Empty, Hud, Stamp, useNumKeys, useOrder, type DemoProps } from '../demoKit';
import { TrainDemo } from '../demosAct';
import { Tweens, ease, type Stage3D } from './stage3d';
import { use3D } from './use3d';

const BASE: [number, number, number] = [0, 0.25, -1.8];
const H = 0.86;

interface Block {
  m: THREE.Mesh;
  el: HTMLElement;
  home: THREE.Vector3;
  done: boolean;
}

function buildStack(st: Stage3D, onTap: (ci: number) => void) {
  const T = st.T;
  const tw = new Tweens();
  let camY = 6.4;
  st.camera.position.set(0, camY, 10.4);

  const floor = st.part(new T.CircleGeometry(50, 40), '#ffd7a8', [0, -0.5, 0]);
  floor.rotation.x = -Math.PI / 2;
  const mat = st.part(new T.BoxGeometry(14, 0.4, 9.5), '#9fd8ff', [0, -0.2, 0]);
  mat.receiveShadow = true;
  const plate = st.part(new T.CylinderGeometry(1.5, 1.6, 0.3, 32), '#ffffff', [BASE[0], 0.1, BASE[2]]);
  st.outline(plate, 0.03);
  // เมืองของเล่นไกลๆ + ต้นไม้
  const town = ['#c9b8ff', '#ffb3cf', '#9fe3c4', '#ffe08a', '#a9d4ff'];
  for (let i = 0; i < 9; i++) {
    const h = 1.6 + ((i * 37) % 5) * 0.7;
    st.part(new T.BoxGeometry(1.6, h, 1.4), town[i % town.length], [-9 + i * 2.25, h / 2 - 0.5, -9 - (i % 2)]);
  }
  for (const [x, z] of [
    [-6, -3.4],
    [6.2, -3],
    [-6.3, 3.6],
  ]) {
    st.part(new T.CylinderGeometry(0.12, 0.16, 0.9, 8), '#a8743f', [x, 0.45, z]);
    st.outline(st.part(new T.ConeGeometry(0.75, 1.6, 12), '#5fcf7a', [x, 1.6, z]), 0.05);
  }
  // เครน
  const crane = st.group([-3.6, 0, -3.4]);
  st.outline(st.part(new T.BoxGeometry(0.4, 5.6, 0.4), '#ffcf3f', [0, 2.8, 0], crane), 0.06);
  const arm = st.group([0, 5.6, 0], crane);
  st.outline(st.part(new T.BoxGeometry(4.6, 0.3, 0.3), '#ff9a3d', [2, 0, 0], arm), 0.06);
  const hookLine = st.part(new T.CylinderGeometry(0.03, 0.03, 1.4, 6), '#2a2350', [3.6, -0.7, 0], arm);
  const hook = st.part(new T.TorusGeometry(0.18, 0.06, 8, 16, Math.PI * 1.4), '#6b6b8a', [3.6, -1.5, 0], arm);
  void hookLine;
  void hook;

  let blocks: Block[] = [];
  let tower = 0;
  let deco: THREE.Object3D[] = [];
  const blockG = new T.BoxGeometry(1.55, 0.84, 1.35);

  const spawn = (steps: string[], layout: number[]) => {
    blocks.forEach((b) => {
      st.unlabel(b.el);
      st.scene.remove(b.m);
    });
    deco.forEach((d) => st.scene.remove(d));
    deco = [];
    tower = 0;
    const k = steps.length;
    blocks = steps.map((s, ci) => {
      const j = layout.indexOf(ci);
      // แถวเดียวหน้าฐาน โค้งเล็กน้อย ไม่บังตึก
      const off = j - (k - 1) / 2;
      const home = new T.Vector3(off * 2.25, 0.43, 2.5 - Math.abs(off) * 0.35);
      const m = st.part(blockG, COLORS[ci % COLORS.length], [home.x, 4.5 + j * 0.4, home.z]);
      st.outline(m, 0.035);
      m.userData.ci = ci;
      const el = st.label(m, '', 'is-small', 0.65);
      const num = document.createElement('i');
      num.className = 'ag-num';
      num.textContent = String(j + 1);
      el.append(num, document.createTextNode(s));
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        onTap(ci);
      });
      // ตกลงมาบนพื้นแบบเด้ง
      const y0 = m.position.y;
      tw.add(0.55 + j * 0.08, (q) => (m.position.y = home.y + (y0 - home.y) * (1 - ease.outBack(q))));
      return { m, el, home, done: false };
    });
  };

  const place = (ci: number) => {
    const b = blocks[ci];
    if (!b || b.done) return;
    b.done = true;
    b.el.dataset.off = '1';
    const from = b.m.position.clone();
    const to = new T.Vector3(BASE[0], BASE[1] + 0.42 + tower * H, BASE[2]);
    tower++;
    const a0 = arm.rotation.y;
    const aim = Math.atan2(-(from.z - crane.position.z), from.x - crane.position.x);
    const aimTo = Math.atan2(-(to.z - crane.position.z), to.x - crane.position.x);
    tw.add(0.25, (q) => (arm.rotation.y = a0 + (aim - a0) * ease.outCubic(q)));
    tw.add(0.8, (q) => {
      const e = ease.inOut(q);
      b.m.position.lerpVectors(from, to, e);
      b.m.position.y += Math.sin(e * Math.PI) * 2.4;
      b.m.rotation.y = (1 - e) * 0.6;
      arm.rotation.y = aim + (aimTo - aim) * e;
    }, () => {
      gsfx.tick();
      b.m.rotation.y = 0;
      tw.add(0.3, (q) => b.m.scale.set(1 + 0.18 * Math.sin(q * Math.PI), 1 - 0.22 * Math.sin(q * Math.PI), 1 + 0.18 * Math.sin(q * Math.PI)));
    });
  };

  const wiggle = (ci: number) => {
    const b = blocks[ci];
    if (!b || b.done) return;
    tw.add(0.5, (q) => {
      b.m.position.y = b.home.y + Math.sin(q * Math.PI) * 0.6;
      b.m.rotation.z = Math.sin(q * Math.PI * 4) * 0.25 * (1 - q);
    });
  };

  const celebrate = () => {
    // ไฟทุกชั้น + ธงบนยอด แล้วตึกเลื่อนออก
    const top = BASE[1] + tower * H + 0.1;
    blocks.forEach((b) => {
      for (const x of [-0.45, 0.45]) {
        const w = st.part(new T.BoxGeometry(0.34, 0.34, 0.06), '#fff3b0', [x, 0.05, 0.69], b.m);
        w.castShadow = false;
      }
    });
    const pole = st.part(new T.CylinderGeometry(0.05, 0.05, 1.3, 8), '#ffffff', [BASE[0], top + 0.65, BASE[2]]);
    const flag = st.part(new T.BoxGeometry(0.7, 0.42, 0.05), '#ff6b7a', [BASE[0] + 0.37, top + 1.05, BASE[2]]);
    deco.push(pole, flag);
    flag.scale.setScalar(0.01);
    tw.add(0.45, (q) => flag.scale.setScalar(Math.max(0.01, ease.outBack(q))));
    st.burst(new T.Vector3(BASE[0], top, BASE[2]), 36);
    tw.add(0.9, () => {}, () => {
      const items = [...blocks.map((b) => b.m), ...deco];
      const x0 = items.map((o) => o.position.x);
      blocks.forEach((b) => (b.el.style.visibility = 'hidden'));
      tw.add(0.6, (q) => items.forEach((o, i) => (o.position.x = x0[i] + ease.inOut(q) * 12)));
    });
  };

  st.onFrame((dt, t) => {
    tw.step(dt);
    const portrait = st.size.w / st.size.h < 1.15;
    const fov = portrait ? 62 : 46;
    if (st.camera.fov !== fov) {
      st.camera.fov = fov;
      st.camera.updateProjectionMatrix();
    }
    // กล้องโยกช้าๆ และยกขึ้นตามความสูงตึก
    camY += (7.6 + tower * 0.4 - camY) * Math.min(1, dt * 3);
    st.camera.position.set(Math.sin(t * 0.35) * 0.9, camY, 11.6);
    st.camera.lookAt(0, 0.9 + tower * 0.32, -0.3);
    blocks.forEach((b, i) => {
      if (!b.done && !tw.busy) b.m.position.y = b.home.y + Math.abs(Math.sin(t * 2 + i)) * 0.06;
    });
  });

  return {
    spawn,
    place,
    wiggle,
    celebrate,
    glow(ci: number) {
      blocks.forEach((b, i) => (i === ci ? (b.el.dataset.glow = '1') : delete b.el.dataset.glow));
    },
    pick(x: number, y: number) {
      const o = st.pick(x, y, blocks.filter((b) => !b.done).map((b) => b.m));
      return o ? (o.userData.ci as number) : -1;
    },
  };
}

export function StackDemo3D({ items }: DemoProps) {
  const { item, n, score, combo, fb, placed, done, layout, glow, shake, pick } = useOrder(items, 2300);
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const { host, labels, scene, ready, failed } = use3D('#ffe7c7', (st) => buildStack(st, (ci) => pickRef.current(ci)));
  const shown = useRef(0);
  useEffect(() => {
    if (!ready || !item) return;
    scene.current?.spawn(item.choices, layout);
    shown.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, n, item]);
  useEffect(() => {
    // วางบล็อกที่เพิ่งถูกต้อง (placed โตขึ้นทีละตัว)
    for (; shown.current < placed.length; shown.current++) scene.current?.place(placed[shown.current]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed]);
  useEffect(() => {
    if (done) scene.current?.celebrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
  useEffect(() => {
    if (shake) scene.current?.wiggle(shake.i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shake?.k]);
  useEffect(() => {
    scene.current?.glow(glow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glow, ready]);
  useNumKeys((k) => layout[k] !== undefined && pick(layout[k]));
  if (failed) return <TrainDemo items={items} />;
  if (!item) return <Empty />;
  return (
    <div
      ref={host}
      className="ag-stage ag-3d"
      onPointerDown={(e) => {
        const ci = scene.current?.pick(e.clientX, e.clientY) ?? -1;
        if (ci >= 0) pickRef.current(ci);
      }}
    >
      <div ref={labels} className="ag-3dlabels" />
      <Hud q={item.q} score={score} combo={combo} />
      <span className="ag-3dhint">แตะบล็อกตามลำดับ ({placed.length}/{item.choices.length})</span>
      <Stamp fb={fb} />
    </div>
  );
}
