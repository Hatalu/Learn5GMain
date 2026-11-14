'use client';

/**
 * เกมตัวอย่างแบบ 3D: ใช้ CSS perspective (เบา ไม่ต้องโหลด WebGL ในหน้าเว็บ)
 * เกมจริงที่ Gemini สร้างให้ใช้ three.js ตามที่ prompt สั่ง
 */
import React, { useEffect, useRef, useState } from 'react';
import { gsfx } from '@/lib/game-creator/gsound';
import { COLORS, Empty, Hud, Spark, Stamp, useLoop, type DemoProps } from './demoKit';

/* ---------------------------------------------------------------- วิ่งผ่านประตู */

const LANES = [16.7, 50, 83.3];

export function RunnerDemo({ items }: DemoProps) {
  const { item, n, score, combo, fb, wrong, answer } = useLoop(items, 3, 300);
  const [lane, setLane] = useState(1);
  const [wave, setWave] = useState(0);
  const [boom, setBoom] = useState<number | null>(null);
  const laneRef = useRef(lane);
  laneRef.current = lane;
  const move = (d: number) => {
    setLane((l) => Math.max(0, Math.min(2, l + d)));
    gsfx.tap();
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') move(-1);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') move(1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  // ปัดซ้าย-ขวา
  const sx = useRef<number | null>(null);
  if (!item) return <Empty />;
  // 2 ตัวเลือก: เลนกลางเป็นรั้วต้นไม้
  const slots: (number | null)[] = item.choices.length === 2 ? [0, null, 1] : [0, 1, 2];
  const arrive = () => {
    const ci = slots[laneRef.current];
    if (ci === null || ci === undefined || wrong.has(ci)) {
      setWave((w) => w + 1);
      return;
    }
    const ok = answer(ci);
    setBoom(ok ? laneRef.current : null);
    setWave((w) => w + 1);
  };
  return (
    <div
      className="ag-stage ag-run"
      onPointerDown={(e) => (sx.current = e.clientX)}
      onPointerUp={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const dx = sx.current === null ? 0 : e.clientX - sx.current;
        sx.current = null;
        if (Math.abs(dx) > 30) move(dx > 0 ? 1 : -1);
        else if (!(e.target as HTMLElement).closest('.ag-hud')) move(e.clientX - r.left < r.width / 2 ? -1 : 1);
      }}
    >
      <div className="ag-run-sky" />
      <div className="ag-run-world">
        <div className="ag-road3d">
          <i />
          <i />
        </div>
      </div>
      <Hud q={item.q} score={score} combo={combo} />
      <div key={`${n}-${wave}`} className="ag-gates" onAnimationEnd={arrive}>
        {slots.map((ci, k) =>
          ci === null ? (
            <span key={k} className="ag-gate ag-hedge" />
          ) : (
            <span key={k} className="ag-gate" data-off={wrong.has(ci) || undefined} style={{ ['--c' as string]: COLORS[ci % COLORS.length] }}>
              {item.choices[ci]}
            </span>
          ),
        )}
      </div>
      {boom !== null && <Spark key={`${n}-b`} className="ag-gold" c="#ffd166" />}
      <span className="ag-runner" style={{ left: `${LANES[lane]}%` }} aria-hidden="true">
        <svg viewBox="0 0 50 60">
          <ellipse cx="25" cy="56" rx="14" ry="3.5" fill="rgba(42,35,80,.25)" />
          <rect x="11" y="14" width="28" height="34" rx="14" fill="#ff6b7a" stroke="#2a2350" strokeWidth="3" />
          <circle cx="25" cy="14" r="11" fill="#ffd9b8" stroke="#2a2350" strokeWidth="3" />
          <path d="M14 10q11-10 22 0" fill="#2a2350" />
          <path className="ag-leg" d="M18 46v8M32 46v8" stroke="#2a2350" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </span>
      <div className="ag-lanebtns">
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

/* ---------------------------------------------------------------- ยานอวกาศลอดวงแหวน */

const SPOTS = [
  [-26, -14],
  [26, -14],
  [-26, 22],
  [26, 22],
];

export function SpaceDemo({ items }: DemoProps) {
  const { item, n, score, combo, fb, wrong, answer } = useLoop(items, 4, 300);
  const [ship, setShip] = useState({ x: 50, y: 62 });
  const [wave, setWave] = useState(0);
  const shipRef = useRef(ship);
  shipRef.current = ship;
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const d = { ArrowLeft: [-6, 0], KeyA: [-6, 0], ArrowRight: [6, 0], KeyD: [6, 0], ArrowUp: [0, -6], KeyW: [0, -6], ArrowDown: [0, 6], KeyS: [0, 6] }[e.code];
      if (!d) return;
      e.preventDefault();
      setShip((s) => ({ x: Math.max(12, Math.min(88, s.x + d[0])), y: Math.max(26, Math.min(86, s.y + d[1])) }));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  if (!item) return <Empty />;
  const steer = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.buttons === 0 && e.type !== 'pointermove') return;
    const r = stage.current!.getBoundingClientRect();
    setShip({ x: Math.max(12, Math.min(88, ((e.clientX - r.left) / r.width) * 100)), y: Math.max(26, Math.min(86, ((e.clientY - r.top) / r.height) * 100)) });
  };
  const arrive = () => {
    const s = shipRef.current;
    let best = -1;
    let bd = 1e9;
    item.choices.forEach((_, i) => {
      const d = Math.hypot(50 + SPOTS[i][0] - s.x, 50 + SPOTS[i][1] - s.y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    if (bd < 17 && !wrong.has(best)) answer(best);
    else gsfx.tick();
    setWave((w) => w + 1);
  };
  return (
    <div ref={stage} className="ag-stage ag-space" onPointerMove={steer} onPointerDown={steer}>
      <div className="ag-stars" />
      <div className="ag-stars ag-stars2" />
      <span className="ag-planet" style={{ left: '8%', top: '30%', ['--c' as string]: '#ffb3cf' }} />
      <span className="ag-planet" style={{ right: '10%', top: '58%', ['--c' as string]: '#8fd8ff', ['--s' as string]: 0.6 }} />
      <Hud q={item.q} score={score} combo={combo} tone="#1f1a56" />
      <div key={`${n}-${wave}`} className="ag-rings" onAnimationEnd={(e) => e.target === e.currentTarget.firstElementChild && arrive()}>
        {item.choices.map((c, i) => (
          <span key={i} className="ag-ring" data-off={wrong.has(i) || undefined} style={{ ['--dx' as string]: `${SPOTS[i][0]}cqw`, ['--dy' as string]: `${SPOTS[i][1]}cqh`, ['--c' as string]: COLORS[i % COLORS.length] }}>
            <b>{c}</b>
          </span>
        ))}
      </div>
      <span className="ag-ship" style={{ left: `${ship.x}%`, top: `${ship.y}%` }} aria-hidden="true">
        <svg viewBox="0 0 60 50">
          <path d="M6 36q24-30 48 0q-24 10-48 0Z" fill="#c9b8ff" stroke="#2a2350" strokeWidth="3" />
          <circle cx="30" cy="24" r="10" fill="#8fd8ff" stroke="#2a2350" strokeWidth="3" />
          <path className="ag-flame" d="M24 42l6 8 6-8Z" fill="#ffcf3f" />
        </svg>
      </span>
      <Stamp fb={fb} />
    </div>
  );
}
