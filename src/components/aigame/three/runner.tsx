'use client';

/** วิ่งผ่านประตูคำตอบ (3D จริงด้วย three.js): วิ่งอัตโนมัติ เปลี่ยนเลนไปชนประตูที่ถูก */
import React, { useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';
import { gsfx } from '@/lib/game-creator/gsound';
import { COLORS, Empty, Hud, Stamp, typing, useLoop, type DemoProps } from '../demoKit';
import { RunnerDemo } from '../demos3d';
import { Tweens, buddy, ease, type Stage3D } from './stage3d';
import { use3D } from './use3d';

const LANE_X = [-2.1, 0, 2.1];
const PZ = 2.4;
const FAR = -62;
const TRAVEL = 6.5; // วินาทีที่แถวประตูวิ่งมาถึงตัว
const SPEED = (PZ - FAR) / TRAVEL;

function buildRunner(st: Stage3D) {
  const T = st.T;
  const tw = new Tweens();
  st.camera.position.set(0, 3.7, 8.2);
  st.camera.lookAt(0, 1, -8);
  st.scene.fog = new T.Fog('#ffe1f0', 26, 70);

  const grass = st.part(new T.PlaneGeometry(80, 160), '#9be08a', [0, -0.02, -60]);
  grass.rotation.x = -Math.PI / 2;
  st.part(new T.BoxGeometry(6.8, 0.2, 160), '#8a7be0', [0, 0, -60]).castShadow = false;
  for (const x of [-3.5, 3.5]) st.part(new T.BoxGeometry(0.3, 0.32, 160), '#ffffff', [x, 0.08, -60]);
  // เส้นแบ่งเลน + ต้นไม้ข้างทาง (เลื่อนเข้าหากล้องแล้ววนกลับ)
  const movers: THREE.Object3D[] = [];
  const dashG = new T.BoxGeometry(0.14, 0.04, 1.6);
  for (let z = 6; z > -100; z -= 4) for (const x of [-1.05, 1.05]) movers.push(st.part(dashG, '#ffffff', [x, 0.12, z]));
  const trunk = new T.CylinderGeometry(0.16, 0.2, 1.2, 8);
  const crown = new T.SphereGeometry(0.9, 14, 10);
  const bush = new T.SphereGeometry(0.55, 12, 9);
  for (let z = 4, i = 0; z > -100; z -= 7, i++) {
    for (const s of [-1, 1]) {
      const g = st.group([s * (5.2 + (i % 3) * 0.9), 0, z - (s > 0 ? 3 : 0)]);
      if ((i + (s > 0 ? 1 : 0)) % 3 === 0) {
        st.part(bush, ['#ff9ad5', '#ffcf3f', '#7fd0ff'][i % 3], [0, 0.4, 0], g);
      } else {
        st.part(trunk, '#a8743f', [0, 0.6, 0], g);
        st.outline(st.part(crown, i % 2 ? '#5fcf7a' : '#3fbf6a', [0, 1.6, 0], g), 0.05);
      }
      movers.push(g);
    }
  }
  for (const [x, y, z] of [
    [-10, 9, -40],
    [9, 11, -50],
    [0, 13, -70],
  ]) {
    const g = st.group([x, y, z]);
    [0, 1, 2].forEach((k) => st.part(new T.SphereGeometry(k === 1 ? 2 : 1.5, 12, 9), '#ffffff', [k * 2 - 2, k === 1 ? 0.5 : 0, 0], g));
  }

  const me = buddy(st, '#ff6b7a', [0, 0, PZ]);
  me.g.rotation.y = Math.PI;
  me.g.scale.setScalar(0.72);
  let lane = 1;
  let lean = 0;

  /* ---- แถวประตู ---- */
  let row: { g: THREE.Group; els: (HTMLElement | null)[]; slots: (number | null)[] } | null = null;
  let onArrive: ((lane: number, slots: (number | null)[]) => void) | null = null;
  const postG = new T.CylinderGeometry(0.13, 0.13, 2.6, 10);
  const spawnRow = (choices: string[], wrong: Set<number>, arrive: typeof onArrive) => {
    clearRow();
    onArrive = arrive;
    const slots: (number | null)[] = choices.length === 2 ? [0, null, 1] : [0, 1, 2];
    const g = st.group([0, 0, FAR]);
    const els = slots.map((ci, k) => {
      const x = LANE_X[k];
      if (ci === null) {
        st.outline(st.part(new T.BoxGeometry(1.9, 1.1, 0.8), '#3fae5a', [x, 0.55, 0], g), 0.04);
        return null;
      }
      const c = COLORS[ci % COLORS.length];
      for (const s of [-1, 1]) st.part(postG, c, [x + s * 0.9, 1.3, 0], g);
      const top = st.part(new T.BoxGeometry(2.2, 0.36, 0.36), c, [x, 2.65, 0], g);
      st.outline(top, 0.05);
      const anchor = st.group([x, 2.85, 0], g);
      const el = st.label(anchor, choices[ci], '', 0);
      if (wrong.has(ci)) el.dataset.off = '1';
      el.style.opacity = '0';
      return el;
    });
    row = { g, els, slots };
  };
  const clearRow = () => {
    if (!row) return;
    row.els.forEach((el) => el && st.unlabel(el));
    st.scene.remove(row.g);
    row = null;
  };

  const cheer = () => {
    const r0 = me.g.rotation.y;
    tw.add(0.5, (q) => (me.g.rotation.y = r0 + Math.PI * 2 * ease.outCubic(q)));
    st.burst(new T.Vector3(LANE_X[lane], 2.4, PZ - 1), 30);
  };
  const bonk = () => {
    tw.add(0.6, (q) => {
      me.g.position.z = PZ + Math.sin(q * Math.PI) * 1.2;
      me.g.rotation.z = Math.sin(q * Math.PI * 5) * 0.25 * (1 - q);
    });
  };

  st.onFrame((dt, t) => {
    tw.step(dt);
    const portrait = st.size.w / st.size.h < 1.15;
    const fov = portrait ? 64 : 50;
    if (st.camera.fov !== fov) {
      st.camera.fov = fov;
      st.camera.updateProjectionMatrix();
    }
    for (const m of movers) {
      m.position.z += (SPEED / st.pace) * dt;
      if (m.position.z > 9) m.position.z -= 106;
    }
    // ตัวละคร: เลื่อนเลนนุ่มๆ เอียงตัว วิ่งเด้ง
    const tx = LANE_X[lane];
    const dx = tx - me.g.position.x;
    me.g.position.x += dx * Math.min(1, dt * 12);
    lean += (-dx * 0.35 - lean) * Math.min(1, dt * 10);
    if (!tw.busy) me.g.rotation.z = lean;
    me.g.position.y = Math.abs(Math.sin(t * 11)) * 0.22;
    me.torso.scale.set(1, 0.9 - Math.abs(Math.sin(t * 11)) * 0.06, 0.95);
    if (row) {
      row.g.position.z += (SPEED / st.pace) * dt;
      const z = row.g.position.z;
      // ป้ายโผล่เมื่อใกล้พออ่าน (ไม่ทับกันตอนไกล)
      const a = Math.max(0, Math.min(1, (z + 34) / 10));
      row.els.forEach((el) => el && (el.style.opacity = String(a)));
      if (z >= PZ - 0.2 && onArrive) {
        const f = onArrive;
        const r = row;
        onArrive = null;
        f(lane, r.slots);
      }
      if (z > PZ + 6) clearRow();
    }
  });

  return {
    spawnRow,
    clearRow,
    cheer,
    bonk,
    move(d: number) {
      lane = Math.max(0, Math.min(2, lane + d));
    },
    get lane() {
      return lane;
    },
    flyRow() {
      const r = row;
      if (!r) return;
      r.els.forEach((el) => el && (el.style.visibility = 'hidden'));
      tw.add(0.5, (q) => {
        r.g.position.y = q * 6;
        r.g.scale.setScalar(Math.max(0.01, 1 - q));
      });
    },
  };
}

export function RunnerDemo3D({ items }: DemoProps) {
  const { item, n, score, combo, fb, wrong, answer } = useLoop(items, 3, 300);
  const ans = useRef(answer);
  ans.current = answer;
  const wrongRef = useRef(wrong);
  wrongRef.current = wrong;
  const [lane, setLane] = useState(1);
  const [wave, setWave] = useState(0);
  const { host, labels, scene, ready, failed } = use3D('#ffe1f0', buildRunner);
  const move = (d: number) => {
    scene.current?.move(d);
    setLane(scene.current?.lane ?? 1);
    gsfx.tap();
  };
  useEffect(() => {
    if (!ready || !item) return;
    const S = scene.current!;
    const t = window.setTimeout(
      () =>
        S.spawnRow(item.choices, wrongRef.current, (ln, slots) => {
          const ci = slots[ln];
          if (ci === null || ci === undefined || wrongRef.current.has(ci)) {
            S.bonk();
            gsfx.wrong();
          } else if (ans.current(ci)) {
            S.cheer();
            S.flyRow();
            return;
          } else S.bonk();
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
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') move(-1);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') move(1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const sx = useRef<number | null>(null);
  if (failed) return <RunnerDemo items={items} />;
  if (!item) return <Empty />;
  const slots: (number | null)[] = item.choices.length === 2 ? [0, null, 1] : [0, 1, 2];
  return (
    <div
      ref={host}
      className="ag-stage ag-3d"
      onPointerDown={(e) => (sx.current = e.clientX)}
      onPointerUp={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const dx = sx.current === null ? 0 : e.clientX - sx.current;
        sx.current = null;
        if ((e.target as HTMLElement).closest('.ag-3dpad, .ag-hud')) return;
        if (Math.abs(dx) > 30) move(dx > 0 ? 1 : -1);
        else move(e.clientX - r.left < r.width / 2 ? -1 : 1);
      }}
    >
      <div ref={labels} className="ag-3dlabels" />
      <Hud q={item.q} score={score} combo={combo} />
      <div className="ag-lanebar">
        {slots.map((ci, k) => (
          <span key={k} data-on={lane === k || undefined} data-off={ci !== null && wrong.has(ci) ? true : undefined} style={{ ['--c' as string]: ci === null ? '#3fae5a' : COLORS[ci % COLORS.length] }}>
            {ci === null ? 'รั้ว' : item.choices[ci]}
          </span>
        ))}
      </div>
      <div className="ag-3dpad">
        <button type="button" onClick={() => move(-1)} aria-label="เลนซ้าย">
          <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" onClick={() => move(1)} aria-label="เลนขวา">
          <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <Stamp fb={fb} />
    </div>
  );
}
