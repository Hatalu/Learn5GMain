'use client';

import React from 'react';
import { RARITY } from '@/lib/game-creator/eggValues';
import { BIOMES } from './biomes';
import { petLook } from './pets';

const INK = '#2a2350';
const s = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** ภาพสัตว์ที่ฟักได้ (SVG ล้วน) รูปร่างตรงกับตัว 3 มิติในเกม */
export function PetArt({ b, t, size = 72 }: { b: number; t: number; size?: number }) {
  const p = petLook(b, t);
  const has = (k: string) => p.parts.includes(k as never);
  const shiny = p.rarity === 'legend' || p.rarity === 'secret';
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label={p.name} role="img" style={{ overflow: 'visible' }}>
      {shiny && <circle cx="50" cy="56" r="46" fill={RARITY[p.rarity].color} opacity="0.22" />}
      {has('wings') && (
        <>
          <ellipse cx="16" cy="52" rx="15" ry="9" fill={p.belly} {...s} transform="rotate(-25 16 52)" />
          <ellipse cx="84" cy="52" rx="15" ry="9" fill={p.belly} {...s} transform="rotate(25 84 52)" />
        </>
      )}
      {has('tail') && <path d="M74 74 Q96 70 92 50 Q86 64 72 66 Z" fill={p.body} {...s} />}
      {has('shell') && <path d="M18 62 Q20 26 50 26 Q80 26 82 62 Z" fill="#c2261a" {...s} />}
      {has('claws') && (
        <>
          <circle cx="12" cy="66" r="9" fill={p.body} {...s} />
          <circle cx="88" cy="66" r="9" fill={p.body} {...s} />
        </>
      )}
      {has('ears') && (
        <>
          <ellipse cx="34" cy="20" rx="7" ry="17" fill={p.body} {...s} transform="rotate(-12 34 20)" />
          <ellipse cx="66" cy="20" rx="7" ry="17" fill={p.body} {...s} transform="rotate(12 66 20)" />
        </>
      )}
      {has('horns') && (
        <>
          <path d="M30 32 L24 10 L40 26 Z" fill="#fff2cf" {...s} />
          <path d="M70 32 L76 10 L60 26 Z" fill="#fff2cf" {...s} />
        </>
      )}
      {has('spikes') && (
        <>
          <path d="M26 34 L20 14 L36 28 Z M50 26 L50 4 L60 24 Z M74 34 L80 14 L64 28 Z" fill="#d8ccff" {...s} />
        </>
      )}
      <ellipse cx="50" cy="60" rx="34" ry="31" fill={p.body} {...s} />
      <ellipse cx="50" cy="68" rx="20" ry="16" fill={p.belly} opacity="0.85" />
      {has('cap') && <path d="M10 46 Q12 12 50 10 Q88 12 90 46 Z" fill="#ff5d5d" {...s} />}
      {has('cap') && (
        <>
          <circle cx="34" cy="26" r="5" fill="#fff" />
          <circle cx="62" cy="22" r="4" fill="#fff" />
        </>
      )}
      {has('crown') && <path d="M34 34 L34 18 L42 26 L50 14 L58 26 L66 18 L66 34 Z" fill="#ffd23f" {...s} />}
      {has('fur') && (
        <>
          <circle cx="40" cy="31" r="7" fill={p.body} {...s} />
          <circle cx="50" cy="28" r="7" fill={p.body} {...s} />
          <circle cx="60" cy="31" r="7" fill={p.body} {...s} />
        </>
      )}
      <circle cx="39" cy="54" r="6.5" fill="#fff" {...s} strokeWidth={2.4} />
      <circle cx="61" cy="54" r="6.5" fill="#fff" {...s} strokeWidth={2.4} />
      <circle cx="40" cy="55" r="3.4" fill={INK} />
      <circle cx="62" cy="55" r="3.4" fill={INK} />
      <circle cx="41.4" cy="53.4" r="1.2" fill="#fff" />
      <circle cx="63.4" cy="53.4" r="1.2" fill="#fff" />
      <ellipse cx="30" cy="64" rx="5" ry="3" fill="#ff9db5" opacity="0.8" />
      <ellipse cx="70" cy="64" rx="5" ry="3" fill="#ff9db5" opacity="0.8" />
      <path d="M45 64 Q50 69 55 64" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** ไข่ (SVG) สีตามชนิดไข่ ใช้ตอนฟัก */
export function EggArt({ b, t, size = 90, crack = 0 }: { b: number; t: number; size?: number; crack?: number }) {
  const e = BIOMES[b]?.eggs[t] || BIOMES[0].eggs[0];
  return (
    <svg viewBox="0 0 100 120" width={size} height={size * 1.2} aria-hidden="true">
      <path d="M50 6 C78 6 92 52 92 76 C92 100 74 114 50 114 C26 114 8 100 8 76 C8 52 22 6 50 6 Z" fill={e.base} {...s} />
      {[
        [32, 44, 8],
        [64, 36, 6],
        [58, 74, 10],
        [30, 88, 7],
        [76, 92, 6],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={e.spot} opacity="0.9" />
      ))}
      {crack > 0 && <path d="M14 70 L28 62 L38 74 L50 60 L62 74 L72 62 L86 70" fill="none" stroke={INK} strokeWidth="3" strokeLinejoin="round" />}
      {crack > 1 && <path d="M38 74 L34 86 M62 74 L66 88" fill="none" stroke={INK} strokeWidth="2.4" />}
    </svg>
  );
}
