'use client';

import React from 'react';

/** ภาพปลา/ของที่ตกได้ใน Fishing Frenzy (SVG ล้วน หันหน้าไปทางขวา) */

const INK = '#2a2350';
const s = { stroke: INK, strokeWidth: 2.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export type FishId = 'goldfish' | 'clown' | 'tilapia' | 'boot' | 'puffer' | 'squid' | 'ray' | 'shark' | 'turtle' | 'sword' | 'angler' | 'kraken' | 'whale' | 'chest';

function Eye({ x, y, r = 5 }: { x: number; y: number; r?: number }) {
  return (
    <>
      <circle cx={x} cy={y} r={r} fill="#fff" {...s} strokeWidth={2} />
      <circle cx={x + r * 0.2} cy={y + r * 0.1} r={r * 0.55} fill={INK} />
      <circle cx={x + r * 0.45} cy={y - r * 0.3} r={r * 0.22} fill="#fff" />
    </>
  );
}

function BasicFish({ body, fin, belly, stripes, fancy }: { body: string; fin: string; belly?: string; stripes?: boolean; fancy?: boolean }) {
  return (
    <>
      {fancy ? <path d="M28 40 Q8 10 2 18 Q10 30 8 40 Q10 50 2 62 Q8 70 28 40 Z" fill={fin} {...s} /> : <path d="M26 40 L4 22 Q12 40 4 58 Z" fill={fin} {...s} />}
      <path d="M50 21 Q60 6 76 22 Z" fill={fin} {...s} />
      <path d="M58 58 Q64 70 72 57 Z" fill={fin} {...s} />
      <path d="M20 40 Q40 12 78 22 Q100 30 106 40 Q100 52 78 58 Q40 68 20 40 Z" fill={body} {...s} />
      {belly && <path d="M34 46 Q60 62 96 46 Q80 58 60 58 Q44 56 34 46 Z" fill={belly} opacity="0.9" />}
      {stripes && (
        <>
          <path d="M48 22 Q42 40 48 60 L58 60 Q52 40 58 21 Z" fill="#fff" {...s} strokeWidth={2} />
          <path d="M72 22 Q67 40 72 58 L80 56 Q76 40 80 24 Z" fill="#fff" {...s} strokeWidth={2} />
        </>
      )}
      <path d="M84 30 Q80 40 84 50" fill="none" stroke={INK} strokeWidth="2" opacity="0.6" />
      <path d="M46 32 Q58 26 72 28" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <Eye x={92} y={35} />
      <path d="M100 45 Q104 47 106 44" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

export function FishArt({ id, size = 80, glow = false }: { id: FishId; size?: number; glow?: boolean }) {
  let inner: React.ReactNode = null;
  switch (id) {
    case 'goldfish':
      inner = <BasicFish body="#ffb35c" fin="#ff7a3d" belly="#fff1d6" fancy />;
      break;
    case 'clown':
      inner = <BasicFish body="#ff8a3d" fin="#ff6b3d" stripes />;
      break;
    case 'tilapia':
      inner = (
        <>
          <BasicFish body="#8fa8c9" fin="#5f7aa3" belly="#dfe8f5" />
          <path d="M44 26 L42 54 M56 22 L54 58 M68 22 L67 57" stroke="#5f7aa3" strokeWidth="2.4" opacity="0.55" />
        </>
      );
      break;
    case 'boot':
      inner = (
        <>
          <path d="M34 8 L64 8 L64 46 L96 52 Q110 56 106 70 L30 70 Q26 70 28 60 Z" fill="#a8774f" {...s} />
          <rect x="30" y="4" width="38" height="10" rx="3" fill="#7d5536" {...s} />
          <path d="M28 62 L106 62" stroke={INK} strokeWidth="2.2" />
          <circle cx="46" cy="26" r="2.4" fill={INK} />
          <circle cx="46" cy="38" r="2.4" fill={INK} />
          <path d="M84 50 Q90 40 98 42" fill="none" stroke="#7ddc86" strokeWidth="3" strokeLinecap="round" />
        </>
      );
      break;
    case 'puffer':
      inner = (
        <>
          <path d="M26 40 L8 28 Q14 40 8 52 Z" fill="#f5a50f" {...s} />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <path key={i} d={`M${62 + Math.cos(a) * 28} ${40 + Math.sin(a) * 28} L${62 + Math.cos(a) * 38} ${40 + Math.sin(a) * 38}`} stroke={INK} strokeWidth="2.6" strokeLinecap="round" />;
          })}
          <circle cx="62" cy="40" r="30" fill="#ffd84a" {...s} />
          <path d="M40 50 Q62 66 84 50 Q74 64 62 64 Q48 64 40 50 Z" fill="#fff6c8" />
          <Eye x={74} y={32} r={6} />
          <ellipse cx="88" cy="46" rx="4" ry="3" fill="#ff8a8a" {...s} strokeWidth={1.8} />
          <circle cx="48" cy="34" r="2.4" fill="#f5a50f" />
          <circle cx="56" cy="24" r="2" fill="#f5a50f" />
        </>
      );
      break;
    case 'squid':
    case 'kraken': {
      const k = id === 'kraken';
      const c = k ? '#9b6cf0' : '#ff8fb1';
      const d = k ? '#6a3cc4' : '#e2618a';
      inner = (
        <>
          {Array.from({ length: k ? 8 : 6 }).map((_, i) => {
            const y = 26 + i * (k ? 4.4 : 5.5);
            return <path key={i} d={`M44 ${y} Q24 ${y - 8 + (i % 2) * 14} 8 ${y + (i - 3) * 3} Q20 ${y + 6} 44 ${y + 4}`} fill={c} {...s} strokeWidth={2.2} />;
          })}
          <path d="M40 22 Q70 12 110 40 Q70 68 40 58 Q34 40 40 22 Z" fill={c} {...s} />
          <path d="M100 40 L114 30 L112 50 Z" fill={d} {...s} />
          {[54, 68, 82].map((x) => (
            <circle key={x} cx={x} cy={40 + (x % 3) * 3 - 3} r="3" fill={d} opacity="0.7" />
          ))}
          <Eye x={52} y={34} r={k ? 7 : 6} />
          {k && <path d="M44 48 Q50 52 56 48" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />}
        </>
      );
      break;
    }
    case 'ray':
      inner = (
        <>
          <path d="M20 40 Q0 36 -8 44" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M20 40 Q60 0 80 6 Q86 20 112 40 Q86 60 80 74 Q60 80 20 40 Z" fill="#7e8fc4" {...s} />
          <path d="M40 40 Q70 22 96 40 Q70 58 40 40 Z" fill="#a9b6dd" opacity="0.6" />
          <Eye x={88} y={32} r={4.5} />
          <Eye x={88} y={48} r={4.5} />
          <circle cx="60" cy="30" r="2.4" fill="#5a6aa0" />
          <circle cx="66" cy="50" r="2.4" fill="#5a6aa0" />
        </>
      );
      break;
    case 'shark':
      inner = (
        <>
          <path d="M22 40 L2 16 Q10 40 4 64 Z" fill="#7186ad" {...s} />
          <path d="M50 22 Q56 0 74 22 Z" fill="#7186ad" {...s} />
          <path d="M62 56 Q66 74 80 56 Z" fill="#7186ad" {...s} />
          <path d="M18 40 Q44 14 84 20 Q110 28 118 42 Q106 54 84 58 Q44 66 18 40 Z" fill="#8fa3c4" {...s} />
          <path d="M40 46 Q70 60 112 46 Q100 56 84 58 Q56 60 40 46 Z" fill="#fff" />
          <path d="M70 30 Q68 40 70 46 M76 30 Q74 40 76 46 M82 30 Q80 40 82 46" fill="none" stroke={INK} strokeWidth="1.8" opacity="0.6" />
          <Eye x={100} y={34} r={4.5} />
          <path d="M96 48 L100 52 L104 48 L108 52 L112 47" fill="#fff" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        </>
      );
      break;
    case 'turtle':
      inner = (
        <>
          <path d="M36 52 Q22 70 12 62 Q20 54 34 46 Z" fill="#7ddc86" {...s} />
          <path d="M80 52 Q94 72 104 62 Q96 52 82 46 Z" fill="#7ddc86" {...s} />
          <path d="M30 24 Q20 10 12 18 Q20 26 34 30 Z" fill="#7ddc86" {...s} />
          <ellipse cx="100" cy="36" rx="13" ry="10" fill="#7ddc86" {...s} />
          <path d="M20 42 Q24 12 60 12 Q96 12 98 42 Q60 56 20 42 Z" fill="#3fa86a" {...s} />
          <path d="M44 20 L52 32 L68 32 L76 20 M52 32 L48 44 M68 32 L72 44" fill="none" stroke="#22704a" strokeWidth="2.4" />
          <path d="M20 42 Q60 56 98 42 Q96 52 60 54 Q24 52 20 42 Z" fill="#f2e3a8" {...s} strokeWidth={2} />
          <Eye x={104} y={33} r={4} />
          <path d="M106 41 Q109 42 111 40" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
      break;
    case 'sword':
      inner = (
        <>
          <path d="M24 40 L4 20 Q12 40 4 60 Z" fill="#2a4fb8" {...s} />
          <path d="M40 22 Q50 -4 76 20 Z" fill="#5c8af5" {...s} />
          <path d="M20 40 Q40 18 76 24 Q96 30 100 40 Q96 50 76 54 Q40 62 20 40 Z" fill="#4a7bf0" {...s} />
          <path d="M98 38 L122 39 L98 43 Z" fill="#a9b3c9" {...s} strokeWidth={2} />
          <path d="M32 44 Q60 56 94 44 Q80 52 66 53 Q44 52 32 44 Z" fill="#dfe8ff" />
          <Eye x={86} y={36} r={4.5} />
        </>
      );
      break;
    case 'angler':
      inner = (
        <>
          {glow && <circle cx="104" cy="6" r="16" fill="#fff6a8" opacity="0.35" />}
          <path d="M80 18 Q92 -4 104 6" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="104" cy="6" r="6" fill="#fff6a8" {...s} strokeWidth={2} />
          <path d="M28 40 L6 24 Q14 40 6 56 Z" fill="#5a4f8a" {...s} />
          <path d="M22 40 Q30 12 72 14 Q108 18 110 44 Q104 68 70 68 Q32 66 22 40 Z" fill="#3a3358" {...s} />
          <path d="M70 52 Q90 62 108 48 L106 56 Q90 70 72 60 Z" fill="#1e1838" />
          <path d="M74 54 L78 60 L82 55 L86 61 L90 55 L94 60 L98 53 L102 57" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          <Eye x={84} y={34} r={6} />
          <circle cx="48" cy="34" r="2.2" fill="#8fe3ff" />
          <circle cx="58" cy="48" r="1.8" fill="#8fe3ff" />
        </>
      );
      break;
    case 'whale':
      inner = (
        <>
          <path d="M16 34 Q0 14 -4 22 Q2 32 4 36 Q2 42 -4 50 Q2 58 16 40 Z" fill="#3e6fd8" {...s} />
          <path d="M14 38 Q20 8 70 8 Q116 8 120 42 Q118 66 80 68 Q30 70 14 38 Z" fill="#4a7bf0" {...s} />
          <path d="M40 54 Q80 72 118 50 Q114 64 82 67 Q52 68 40 54 Z" fill="#dfe8ff" />
          <path d="M60 58 L60 66 M70 60 L70 68 M80 60 L80 68 M90 59 L90 66 M100 57 L100 64" stroke="#9fb6ef" strokeWidth="1.8" />
          <path d="M66 52 Q74 66 86 54 Z" fill="#3e6fd8" {...s} strokeWidth={2} />
          <Eye x={100} y={38} r={4} />
          <path d="M106 50 Q112 52 118 48" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
        </>
      );
      break;
    case 'chest':
      inner = (
        <>
          {glow && <circle cx="60" cy="40" r="40" fill="#fff6a8" opacity="0.4" />}
          <path d="M22 34 Q22 12 60 12 Q98 12 98 34 Z" fill="#c8823f" {...s} />
          <rect x="22" y="34" width="76" height="36" rx="4" fill="#a8652f" {...s} />
          <path d="M40 13 L40 70 M80 13 L80 70" stroke="#ffd84a" strokeWidth="5" />
          <path d="M22 34 L98 34" stroke={INK} strokeWidth="2.6" />
          <rect x="52" y="30" width="16" height="16" rx="3" fill="#ffd84a" {...s} strokeWidth={2} />
          <circle cx="60" cy="38" r="2.4" fill={INK} />
        </>
      );
      break;
  }
  return (
    <svg viewBox="-10 -10 136 90" width={size} height={size * (90 / 136)} aria-hidden="true" style={{ overflow: 'visible' }}>
      {inner}
    </svg>
  );
}

/** เหยื่อ (สีตามตัวคูณความลึก) */
export function BaitIcon({ tier = 1, size = 22 }: { tier?: number; size?: number }) {
  const c = ['#ff9ec4', '#ff9ec4', '#ffb35c', '#ffd84a', '#7ddc86', '#5ccbff', '#b98cff'][Math.min(6, tier)];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M12 2 L12 9" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 10 Q12 6 17 10 Q19 15 12 22 Q5 15 7 10 Z" fill={c} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="10" cy="12" r="1.4" fill="#fff" />
    </svg>
  );
}

/** แม่เหล็ก */
export function MagnetIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M5 4 L10 4 L10 13 Q10 16 12 16 Q14 16 14 13 L14 4 L19 4 L19 13 Q19 21 12 21 Q5 21 5 13 Z" fill="#ff6b7a" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="5" y="4" width="5" height="4" fill="#e8ecf5" stroke={INK} strokeWidth="1.6" />
      <rect x="14" y="4" width="5" height="4" fill="#e8ecf5" stroke={INK} strokeWidth="1.6" />
    </svg>
  );
}
