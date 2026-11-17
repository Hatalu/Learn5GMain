'use client';

/**
 * เกมตัวอย่าง 2D แบบ "จัดกลุ่ม" และ "เรียงลำดับ" (DOM + SVG + CSS)
 * ใช้เนื้อหาตัวอย่างของวิชาที่เลือก (SORT_SAMPLES / ORDER_SAMPLES)
 */
import React, { useEffect, useRef, useState } from 'react';
import { gsfx } from '@/lib/game-creator/gsound';
import { COLORS, Empty, Hud, Spark, Stamp, useLoop, useNumKeys, useOrder, type DemoProps } from './demoKit';

const INK = '#2a2350';

/* ---------------------------------------------------------------- โรงงานสายพานแยกของ (จัดกลุ่ม) */

const BIN_COLORS = ['#4fb3ff', '#ff8a5c', '#9b6cf0'];

export function BeltDemo({ items }: DemoProps) {
  const { item, n, score, combo, fb, answer } = useLoop(items, 3, 520);
  const stage = useRef<HTMLDivElement>(null);
  const crate = useRef<HTMLSpanElement>(null);
  const [fly, setFly] = useState<{ bin: number; x0: number; y0: number; x1: number; y1: number; k: number } | null>(null);
  const [counts, setCounts] = useState<number[]>([0, 0, 0]);
  const [ride, setRide] = useState(0);
  const [bonk, setBonk] = useState<{ bin: number; k: number } | null>(null);
  const [inBin, setInBin] = useState<{ bin: number; k: number } | null>(null);
  useEffect(() => setInBin(null), [n]);

  const throwTo = (bin: number) => {
    if (fly || inBin || !stage.current || !crate.current) return;
    const box = stage.current.getBoundingClientRect();
    const c = crate.current.getBoundingClientRect();
    const b = stage.current.querySelector(`[data-bin="${bin}"]`)?.getBoundingClientRect();
    if (!b) return;
    const px = (x: number) => ((x - box.left) / box.width) * 100;
    const py = (y: number) => ((y - box.top) / box.height) * 100;
    gsfx.tap();
    setFly({ bin, x0: px(c.left + c.width / 2), y0: py(c.top + c.height / 2), x1: px(b.left + b.width / 2), y1: py(b.top + b.height * 0.3), k: Date.now() });
  };
  const land = () => {
    if (!fly) return;
    const ok = answer(fly.bin);
    if (ok) {
      setCounts((cs) => cs.map((v, i) => (i === fly.bin ? v + 1 : v)));
      setInBin({ bin: fly.bin, k: Date.now() });
    } else {
      setBonk({ bin: fly.bin, k: Date.now() });
      setRide((r) => r + 1);
    }
    setFly(null);
  };
  useNumKeys((i) => item && i < item.choices.length && throwTo(i));
  if (!item) return <Empty />;
  const cats = item.choices;
  return (
    <div ref={stage} className="ag-stage ag-factory">
      <div className="ag-fwall" aria-hidden="true">
        <i className="ag-fwin" style={{ left: '8%' }} />
        <i className="ag-fwin" style={{ left: '74%' }} />
        <svg className="ag-gear" style={{ left: '38%', top: '20%' }} viewBox="0 0 40 40">
          <path d="M20 2l3 6 6-2 1 7 7 1-2 6 6 3-6 3 2 6-7 1-1 7-6-2-3 6-3-6-6 2-1-7-7-1 2-6-6-3 6-3-2-6 7-1 1-7 6 2Z" fill="#c9b8ff" stroke={INK} strokeWidth="2.5" />
          <circle cx="20" cy="20" r="6" fill="#fff" stroke={INK} strokeWidth="2.5" />
        </svg>
        <svg className="ag-gear ag-gear2" style={{ left: '50%', top: '27%' }} viewBox="0 0 40 40">
          <path d="M20 2l3 6 6-2 1 7 7 1-2 6 6 3-6 3 2 6-7 1-1 7-6-2-3 6-3-6-6 2-1-7-7-1 2-6-6-3 6-3-2-6 7-1 1-7 6 2Z" fill="#ffcf3f" stroke={INK} strokeWidth="2.5" />
          <circle cx="20" cy="20" r="6" fill="#fff" stroke={INK} strokeWidth="2.5" />
        </svg>
      </div>
      <Hud q={item.q} score={score} combo={combo} />
      <div className="ag-belt" aria-hidden="true">
        <i className="ag-belt-top" />
        {[8, 24, 40, 56, 72, 88].map((x) => (
          <i key={x} className="ag-belt-wheel" style={{ left: `${x}%` }} />
        ))}
      </div>
      <span className="ag-arm" data-swing={fly ? 1 : undefined} aria-hidden="true">
        <svg viewBox="0 0 60 80">
          <rect x="20" y="58" width="22" height="18" rx="5" fill="#9b6cf0" stroke={INK} strokeWidth="3" />
          <g className="ag-arm-up">
            <rect x="26" y="14" width="10" height="48" rx="5" fill="#c9b8ff" stroke={INK} strokeWidth="3" />
            <circle cx="31" cy="14" r="9" fill="#ffcf3f" stroke={INK} strokeWidth="3" />
            <path d="M24 6l-6-4M38 6l6-4" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          </g>
        </svg>
      </span>
      {!fly && !inBin && (
        <span key={`${n}-${ride}`} ref={crate} className="ag-crate" onClick={() => gsfx.tick()}>
          <b>{item.q}</b>
        </span>
      )}
      {fly && (
        <span
          key={fly.k}
          className="ag-crate ag-crate-fly"
          style={{ ['--x0' as string]: `${fly.x0}%`, ['--y0' as string]: `${fly.y0}%`, ['--x1' as string]: `${fly.x1}%`, ['--y1' as string]: `${fly.y1}%` }}
          onAnimationEnd={land}
        >
          <b>{item.q}</b>
        </span>
      )}
      <div className="ag-bins" style={{ gridTemplateColumns: `repeat(${cats.length}, minmax(0, 1fr))` }}>
        {cats.map((c, i) => (
          <button
            key={i}
            type="button"
            className="ag-bin"
            data-bin={i}
            data-bonk={bonk?.bin === i ? bonk.k : undefined}
            data-got={inBin?.bin === i ? inBin.k : undefined}
            style={{ ['--c' as string]: BIN_COLORS[i % BIN_COLORS.length] }}
            onClick={() => throwTo(i)}
            aria-label={`กลุ่ม ${c}`}
          >
            <span className="ag-bin-sign">{c}</span>
            <svg viewBox="0 0 100 70" aria-hidden="true">
              <path d="M8 14h84l-8 52H16Z" fill="var(--c)" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
              <rect x="4" y="6" width="92" height="12" rx="6" fill="#fff" stroke={INK} strokeWidth="4" />
              <path d="M26 30v26M50 30v26M74 30v26" stroke={INK} strokeWidth="3" strokeLinecap="round" opacity=".25" />
            </svg>
            <i className="ag-bin-n">{counts[i] ?? 0}</i>
            <i className="ag-num">{i + 1}</i>
            {inBin?.bin === i && <Spark key={inBin.k} className="ag-burst" c="#ffd166" />}
          </button>
        ))}
      </div>
      <Stamp fb={fb} />
    </div>
  );
}

/* ---------------------------------------------------------------- รถไฟเรียงลำดับ */

/** ตำแหน่งตู้ที่รอในลานจอด (%): 2 แถว แถวละไม่เกิน 3 */
function yardSpot(j: number, total: number) {
  const top = total > 3 && j >= 3;
  const inRow = top ? total - 3 : Math.min(total, 3);
  const k = top ? j - 3 : j;
  return { x: 50 + (k - (inRow - 1) / 2) * 30, y: top ? 84 : 64 };
}

export function TrainDemo({ items }: DemoProps) {
  const { item, n, score, combo, fb, placed, done, layout, glow, shake, pick } = useOrder(items);
  useNumKeys((k) => layout[k] !== undefined && pick(layout[k]));
  if (!item) return <Empty />;
  return (
    <div className="ag-stage ag-station" data-go={done || undefined}>
      <svg className="ag-hills" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 34 Q90 4 190 30 T400 22 V60 H0Z" fill="#9fe3a0" />
      </svg>
      <span className="ag-cloud" style={{ top: '24%', animationDelay: '-8s' }} />
      <span className="ag-mill" aria-hidden="true">
        <i />
      </span>
      <Hud q={item.q} score={score} combo={combo} />
      <i className="ag-rail" style={{ top: '47%' }} aria-hidden="true" />
      <span key={`loco-${n}`} className="ag-loco ag-mover" aria-hidden="true">
        <svg viewBox="0 0 90 64">
          <rect x="6" y="20" width="56" height="30" rx="8" fill="#ff6b7a" stroke={INK} strokeWidth="3" />
          <rect x="44" y="6" width="30" height="44" rx="7" fill="#ff8fa0" stroke={INK} strokeWidth="3" />
          <rect x="50" y="12" width="18" height="14" rx="4" fill="#bfe9ff" stroke={INK} strokeWidth="2.5" />
          <rect x="14" y="6" width="12" height="16" rx="3" fill="#2a2350" />
          <circle cx="29" cy="34" r="3" fill={INK} />
          <path d="M26 41q4 3 8 0" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <ellipse cx="20" cy="38" rx="3.5" ry="2" fill="#ffb3c4" />
          <g className="ag-wheels">
            <circle cx="20" cy="54" r="8" fill="#ffcf3f" stroke={INK} strokeWidth="3" />
            <circle cx="56" cy="54" r="8" fill="#ffcf3f" stroke={INK} strokeWidth="3" />
          </g>
        </svg>
        <i className="ag-smoke" />
        <i className="ag-smoke" style={{ animationDelay: '-0.7s' }} />
      </span>
      {item.choices.map((c, ci) => {
        const at = placed.indexOf(ci);
        const j = layout.indexOf(ci);
        const pos = at >= 0 ? { x: 23.5 + at * 15.3, y: 47 } : yardSpot(j, item.choices.length);
        return (
          <button
            key={`${n}-${ci}`}
            type="button"
            className="ag-car ag-mover"
            data-on={at >= 0 || undefined}
            data-glow={glow === ci || undefined}
            data-shake={shake?.i === ci ? shake.k : undefined}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, ['--c' as string]: COLORS[ci % COLORS.length] }}
            onClick={() => pick(ci)}
            aria-label={`ตู้: ${c}`}
          >
            <svg viewBox="0 0 80 50" aria-hidden="true">
              <rect x="3" y="4" width="74" height="34" rx="7" fill="var(--c)" stroke={INK} strokeWidth="3" />
              <rect x="9" y="9" width="62" height="24" rx="5" fill="#fff" opacity=".85" />
              <g className="ag-wheels">
                <circle cx="18" cy="42" r="6.5" fill="#fff" stroke={INK} strokeWidth="3" />
                <circle cx="62" cy="42" r="6.5" fill="#fff" stroke={INK} strokeWidth="3" />
              </g>
            </svg>
            <span className="ag-car-t">{c}</span>
            {at >= 0 ? <i className="ag-car-n">{at + 1}</i> : <i className="ag-num">{j + 1}</i>}
          </button>
        );
      })}
      {done && <Spark key={`s-${n}`} className="ag-gold" c="#ffd166" />}
      <Stamp fb={fb} />
    </div>
  );
}
