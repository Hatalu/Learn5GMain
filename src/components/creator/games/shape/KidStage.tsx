'use client';

/**
 * เวทีภาพสาธิต Human Shape Builder: เด็กการ์ตูน SVG มีหมายเลข เคลื่อนเข้าตำแหน่งและเปลี่ยนท่าแบบนุ่มนวล
 * - tween ด้วย requestAnimationFrame (ไม่พึ่ง CSS transform บน SVG ที่แต่ละเบราว์เซอร์คิดจุดหมุนต่างกัน)
 * - prefers-reduced-motion = กระโดดไปท่าสุดท้ายทันที
 */
import React, { useEffect, useRef, useState } from 'react';
import { POSES, type Fig, type Mission } from '@/lib/game-creator/shape/missions';

export type Box = [number, number, number, number];
export type StageStep = 'lineup' | 'spot' | 'pose' | 'shape' | 'check';

const norm = (r: number) => {
  let x = ((r % 360) + 360) % 360;
  if (x > 180) x -= 360;
  return x;
};

function fitBox(all: Fig[], view: 'top' | 'front'): Box {
  const pad = 52;
  const x0 = Math.min(...all.map((f) => f.x)) - pad;
  const x1 = Math.max(...all.map((f) => f.x)) + pad;
  const y0 = Math.min(...all.map((f) => f.y)) - (view === 'top' ? pad : 64);
  const y1 = Math.max(...all.map((f) => f.y)) + (view === 'top' ? pad : 50);
  // อย่างน้อย 3:2 ให้คนเดียวไม่ใหญ่คับจอ
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const w = Math.max(x1 - x0, 220, (y1 - y0) * 1.25);
  const h = Math.max(y1 - y0, 150, w / 2.2);
  return [mx - w / 2, my - h / 2, w, h];
}

/** ท่าแต่ละขั้นของภาพสาธิต + กรอบเวทีที่ครอบทุกขั้น (ภาพไม่กระโดดตอนเปลี่ยนขั้น) */
export function stageFrames(m: Mission, n: number) {
  const final = m.build(n).map((f) => ({ ...f, r: norm(f.r) }));
  const xs = final.map((f) => f.x);
  const ys = final.map((f) => f.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const bottom = m.view === 'top' ? Math.max(...ys) + 96 : 0;
  const lineup: Fig[] = final.map((f, i) => ({ ...f, x: cx + (i - (final.length - 1) / 2) * 46, y: bottom, r: 0, pose: 'stand' }));
  const spot: Fig[] = final.map((f) => ({ ...f, r: m.view === 'top' ? 0 : f.r, pose: 'stand' }));
  const box = fitBox([...final, ...lineup], m.view);
  // ภาพเล็ก/ภาพอ้างอิง: พอดีกับรูปสุดท้าย (ไม่เผื่อแถวเข้าแถว) เด็กจะตัวใหญ่ขึ้น
  const boxFinal = fitBox(final, m.view);
  return { final, lineup, spot, box, boxFinal, outline: m.outline(n) };
}

export function figsFor(fr: ReturnType<typeof stageFrames>, step: StageStep): Fig[] {
  return step === 'lineup' ? fr.lineup : step === 'spot' ? fr.spot : fr.final;
}

/* ------------------------------ tween ------------------------------ */

type St = number[]; // x y r la lf ra rf ll rl dy
const toSt = (f: Fig): St => {
  const p = POSES[f.pose] || POSES.stand;
  return [f.x, f.y, f.r, p.la[0], p.la[1], p.ra[0], p.ra[1], p.ll, p.rl, p.dy];
};
const easeOutBack = (t: number) => {
  const c = 1.45;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function useTweened(figs: Fig[], stagger: number, ms = 720): St[] {
  const target = figs.map(toSt);
  const key = JSON.stringify(target);
  const cur = useRef<St[]>(target);
  const [, force] = useState(0);
  useEffect(() => {
    const to = JSON.parse(key) as St[];
    const from = to.map((t, i) => cur.current[i] || [t[0], t[1] + 40, ...t.slice(2)]);
    if (reduced()) {
      cur.current = to;
      force((x) => x + 1);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      let done = true;
      cur.current = to.map((t, i) => {
        const k = Math.min(1, Math.max(0, (now - t0 - i * stagger) / ms));
        if (k < 1) done = false;
        const e = easeOutBack(k);
        return t.map((v, j) => from[i][j] + (v - from[i][j]) * (j < 2 ? Math.min(e, 1.04) : e));
      });
      force((x) => x + 1);
      if (!done) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, stagger, ms]);
  return cur.current.length === target.length ? cur.current : target;
}

/* ------------------------------ เด็กการ์ตูน ------------------------------ */

const SHIRTS = ['#ff6b7a', '#4a7bf0', '#ffb31a', '#25c48a', '#9b6cf0', '#ff8a2f', '#2fb8ff', '#ff6bb8', '#7cc84a', '#e05aa0'];
const PANTS = ['#3a4a8c', '#5b3a8c', '#2f6a7c', '#4a3a5c'];
const SKINS = ['#ffd9b8', '#f2c49b', '#d9a77c'];
const HAIRS = ['#3a2a20', '#5b3a1a', '#1f1a2e', '#8a4a20'];
const INK = '#2a2350';

function Limb({ x, y, a, len, w, color, end }: { x: number; y: number; a: number; len: number; w: number; color: string; end?: React.ReactNode }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <line x1="0" y1="0" x2="0" y2={len} stroke={INK} strokeWidth={w + 3} strokeLinecap="round" />
      <line x1="0" y1="0" x2="0" y2={len} stroke={color} strokeWidth={w} strokeLinecap="round" />
      {end && <g transform={`translate(0 ${len})`}>{end}</g>}
    </g>
  );
}

function Arm({ side, s, i, skin }: { side: -1 | 1; s: St; i: number; skin: string }) {
  const [a, f] = side < 0 ? [s[3], s[4]] : [s[5], s[6]];
  const shirt = SHIRTS[i % SHIRTS.length];
  return (
    <Limb
      x={side * 8}
      y={-10}
      a={a}
      len={12}
      w={6}
      color={shirt}
      end={<Limb x={0} y={0} a={f} len={11} w={5} color={skin} end={<circle r="3.4" fill={skin} stroke={INK} strokeWidth="1.6" />} />}
    />
  );
}

export function Kid({ s, i, n, hi, dim, view }: { s: St; i: number; n: number; hi?: boolean; dim?: boolean; view: 'top' | 'front' }) {
  const skin = SKINS[i % SKINS.length];
  const hair = HAIRS[(i * 3) % HAIRS.length];
  const pants = PANTS[i % PANTS.length];
  const [x, y, r, , , , , ll, rl, dy] = s;
  const girl = i % 2 === 1;
  return (
    <g transform={`translate(${x} ${y})`} opacity={dim ? 0.35 : 1}>
      {view === 'front' && <ellipse cx="0" cy="34" rx="18" ry="4" fill="#000" opacity="0.12" />}
      <g transform={`rotate(${r})`}>
        {hi && <circle cx="0" cy={dy - 2} r="40" fill="#fff36b" opacity="0.45" className="hs-glow" />}
        <g transform={`translate(0 ${dy})`}>
          <Limb x={-4.5} y={8} a={ll} len={22} w={7} color={pants} end={<ellipse cx="0" cy="2" rx="5" ry="3.4" fill={INK} />} />
          <Limb x={4.5} y={8} a={rl} len={22} w={7} color={pants} end={<ellipse cx="0" cy="2" rx="5" ry="3.4" fill={INK} />} />
          <rect x="-10" y="-15" width="20" height="26" rx="8" fill={SHIRTS[i % SHIRTS.length]} stroke={INK} strokeWidth="2.4" />
          {/* หัว */}
          <circle cx="0" cy="-26" r="11" fill={skin} stroke={INK} strokeWidth="2.4" />
          {girl ? (
            <>
              <path d="M-11 -27 q1 -13 11 -13 q10 0 11 13 q-5 -6 -11 -6 q-6 0 -11 6z" fill={hair} stroke={INK} strokeWidth="1.8" />
              <circle cx="-11" cy="-22" r="3.6" fill={hair} stroke={INK} strokeWidth="1.6" />
              <circle cx="11" cy="-22" r="3.6" fill={hair} stroke={INK} strokeWidth="1.6" />
            </>
          ) : (
            <path d="M-11 -26 q0 -12 11 -12 q11 0 11 12 q-3 -4 -6 -4 l-2 3 -3 -4 -3 4 -2 -3 q-3 0 -6 4z" fill={hair} stroke={INK} strokeWidth="1.8" />
          )}
          <circle cx="-4" cy="-25" r="1.7" fill={INK} />
          <circle cx="4" cy="-25" r="1.7" fill={INK} />
          <path d="M-3.5 -20.5 q3.5 3 7 0" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <ellipse cx="-7" cy="-21" rx="2.2" ry="1.3" fill="#ff8fb5" opacity="0.8" />
          <ellipse cx="7" cy="-21" rx="2.2" ry="1.3" fill="#ff8fb5" opacity="0.8" />
          {/* แขนวาดทับหัว: ท่ายกแขนจะไม่ถูกหัวบัง */}
          <Arm side={-1} s={s} i={i} skin={skin} />
          <Arm side={1} s={s} i={i} skin={skin} />
          {/* หมายเลข (หันตั้งตรงเสมอ) */}
          <g transform={`translate(0 -1) rotate(${-r})`}>
            <circle r="8" fill="#fff" stroke={INK} strokeWidth="2" />
            <text y="3.6" textAnchor="middle" fontSize="10.5" fontWeight="900" fill={INK}>
              {n}
            </text>
          </g>
        </g>
      </g>
    </g>
  );
}

/* ------------------------------ เวที ------------------------------ */

export function KidStage({
  figs,
  box,
  view,
  outline,
  showOutline,
  hi = -1,
  check,
  stagger = 90,
  className,
  label,
}: {
  figs: Fig[];
  box: Box;
  view: 'top' | 'front';
  outline?: [number, number][][];
  showOutline?: boolean;
  hi?: number;
  check?: boolean;
  stagger?: number;
  className?: string;
  label?: string;
}) {
  const st = useTweened(figs, stagger);
  const [bx, by, bw, bh] = box;
  const id = useRef(`hs${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <svg overflow="hidden" className={`hs-stage ${className || ''}`} viewBox={`${bx} ${by} ${bw} ${bh}`} role="img" aria-label={label}>
      <defs>
        <pattern id={`${id}g`} width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="#000" strokeOpacity="0.06" strokeWidth="2" />
        </pattern>
      </defs>
      {view === 'top' ? (
        <>
          <rect x={bx - 4000} y={by - 4000} width={bw + 8000} height={bh + 8000} fill="#ffe9b8" />
          <rect x={bx - 4000} y={by - 4000} width={bw + 8000} height={bh + 8000} fill={`url(#${id}g)`} />
        </>
      ) : (
        <>
          <rect x={bx - 4000} y={by - 4000} width={bw + 8000} height={bh + 8000} fill="#dff3ff" />
          <rect x={bx - 4000} y={34} width={bw + 8000} height={4000} fill="#9fe08a" />
          <path d={`M${bx - 4000} 34 H${bx + bw + 4000}`} stroke="#5aa84a" strokeWidth="3" />
        </>
      )}
      {outline && (
        <g className="hs-outline" data-on={showOutline ? 1 : 0}>
          {outline.map((pl, i) => (
            <polyline key={i} points={pl.map((p) => p.join(',')).join(' ')} fill="none" stroke="#ff5aa5" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 15" opacity="0.85" />
          ))}
        </g>
      )}
      {st.map((s, i) => (
        <Kid key={i} s={s} i={i} n={i + 1} hi={hi === i} dim={hi >= 0 && hi !== i} view={view} />
      ))}
      {check && (
        <g className="hs-check" transform={`translate(${bx + bw - 34} ${by + 34})`}>
          <circle r="24" fill="#25c48a" stroke={INK} strokeWidth="3" />
          <path d="M-11 0 l7 8 l15 -16" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </svg>
  );
}

/** ภาพนิ่งเล็ก (การ์ดเลือกภารกิจ/คำตอบ) */
export function MiniStage({ m, n }: { m: Mission; n: number }) {
  const fr = stageFrames(m, n);
  return <KidStage figs={fr.final} box={fr.boxFinal} view={m.view} outline={fr.outline} showOutline stagger={0} className="hs-mini" label={m.name} />;
}
