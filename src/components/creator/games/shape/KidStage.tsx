'use client';

/** เด็กการ์ตูน SVG ทำท่าของตัวเลือก: เริ่มจากยืนตรงแล้วขยับเข้าท่าแบบเด้ง (prefers-reduced-motion = เข้าท่าทันที) */
import React, { useEffect, useState } from 'react';
import { STAND, type PoseDef } from '@/lib/game-creator/shape/settings';

type St = number[]; // la lf ra rf ll rl dy
const toSt = (p: PoseDef): St => [p.la[0], p.la[1], p.ra[0], p.ra[1], p.ll, p.rl, p.dy];
const easeOutBack = (t: number) => 1 + 2.45 * Math.pow(t - 1, 3) + 1.45 * Math.pow(t - 1, 2);

function useTween(pose: PoseDef, delay: number, ms = 650): St {
  const [st, setSt] = useState<St>(() => toSt(STAND));
  useEffect(() => {
    const from = toSt(STAND);
    const to = toSt(pose);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return setSt(to);
    setSt(from);
    const t0 = performance.now() + delay;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0) / ms));
      const e = easeOutBack(k);
      setSt(to.map((v, i) => from[i] + (v - from[i]) * e));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pose, delay, ms]);
  return st;
}

const SHIRTS = ['#ff6b7a', '#4a7bf0', '#ffb31a', '#25c48a', '#9b6cf0', '#ff8a2f'];
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

/** i = ลำดับตัวเลือก (0-based) ใช้เลือกสีตัวละคร */
export function PoseKid({ pose, i }: { pose: PoseDef; i: number }) {
  const [la, lf, ra, rf, ll, rl, dy] = useTween(pose, i * 90);
  const skin = SKINS[i % SKINS.length];
  const hair = HAIRS[(i * 3) % HAIRS.length];
  const pants = PANTS[i % PANTS.length];
  const shirt = SHIRTS[i % SHIRTS.length];
  const shoe = <ellipse cx="0" cy="2" rx="5" ry="3.4" fill={INK} />;
  const hand = <circle r="3.4" fill={skin} stroke={INK} strokeWidth="1.6" />;
  return (
    <svg className="hs-kid" viewBox="-46 -52 92 92" role="img" aria-label={pose.name}>
      <ellipse cx="0" cy="34" rx="20" ry="4" fill="#000" opacity="0.14" />
      <g transform={`translate(0 ${dy})`}>
        <Limb x={-4.5} y={8} a={ll} len={22} w={7} color={pants} end={shoe} />
        <Limb x={4.5} y={8} a={rl} len={22} w={7} color={pants} end={shoe} />
        <rect x="-10" y="-15" width="20" height="26" rx="8" fill={shirt} stroke={INK} strokeWidth="2.4" />
        <circle cx="0" cy="-26" r="11" fill={skin} stroke={INK} strokeWidth="2.4" />
        {i % 2 ? (
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
        {/* แขนวาดทับหัว: ท่ายกแขนจะไม่ถูกหัวบัง */}
        <Limb x={-8} y={-10} a={la} len={12} w={6} color={shirt} end={<Limb x={0} y={0} a={lf} len={11} w={5} color={skin} end={hand} />} />
        <Limb x={8} y={-10} a={ra} len={12} w={6} color={shirt} end={<Limb x={0} y={0} a={rf} len={11} w={5} color={skin} end={hand} />} />
      </g>
    </svg>
  );
}
