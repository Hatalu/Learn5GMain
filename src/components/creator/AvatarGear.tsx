'use client';

import React from 'react';

/**
 * ภาพเครื่องประดับของตัวละคร (SVG ล้วน ห้ามใช้อิโมจิ) วาดบนพิกัด 0-100 เดียวกับ Avatar
 * ลำดับเลขต้องตรงกับ GEAR_SLOTS ใน lib/game-creator/gear.ts
 */

const INK = '#2a2350';
const s = { stroke: INK, strokeWidth: 2.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const thin = { ...s, strokeWidth: 1.6 };

export interface FaceAnchor {
  /** จุดกลางฐานหมวก + ขนาด */
  hat: [number, number, number];
  eyes: [number, number];
  eyeY: number;
  eyeR: number;
  mouthY: number;
  hand: [number, number];
}

/* ------------------------------ หมวก (พิกัดย่อย: ฐานหมวกอยู่ที่ 0,0) ------------------------------ */
function hatShape(id: number) {
  switch (id) {
    case 1: // มงกุฎ
      return (
        <>
          <path d="M-17 0 L-20 -18 L-9 -9 L0 -22 L9 -9 L20 -18 L17 0 Z" fill="#ffd84a" {...s} />
          <rect x="-17" y="-5" width="34" height="5" rx="1.5" fill="#f5a50f" {...thin} />
          <circle cx="0" cy="-22" r="2.6" fill="#ff6b7a" {...thin} />
          <circle cx="-20" cy="-18" r="2.2" fill="#5ccbff" {...thin} />
          <circle cx="20" cy="-18" r="2.2" fill="#5ccbff" {...thin} />
          <circle cx="0" cy="-2.5" r="1.8" fill="#ff6b7a" />
        </>
      );
    case 2: // หมวกแก๊ป
      return (
        <>
          <path d="M8 -3 Q30 -6 34 1 Q22 5 8 2 Z" fill="#2a4fb8" {...s} />
          <path d="M-18 1 Q-19 -22 0 -22 Q19 -22 18 1 Z" fill="#4a7bf0" {...s} />
          <path d="M-6 -21 Q-8 -10 -7 0 M6 -21 Q8 -10 7 0" fill="none" stroke="#2a4fb8" strokeWidth="1.6" />
          <circle cx="0" cy="-22" r="2.4" fill="#ffcf3f" {...thin} />
          <path d="M-12 -14 Q-8 -18 -3 -18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        </>
      );
    case 3: // หมวกพ่อมด
      return (
        <>
          <path d="M-14 -2 Q-6 -22 4 -40 Q10 -44 14 -38 Q8 -36 7 -30 Q9 -16 15 -2 Z" fill="#7e52cf" {...s} />
          <ellipse cx="0" cy="-1" rx="23" ry="5.5" fill="#6a3cc4" {...s} />
          <path d="M-4 -18 L-2.6 -14.6 L1 -14 L-1.8 -11.6 L-1 -8 L-4 -10 L-7 -8 L-6.2 -11.6 L-9 -14 L-5.4 -14.6 Z" fill="#ffd84a" {...thin} strokeWidth={1.1} />
          <circle cx="6" cy="-24" r="1.8" fill="#ffd84a" />
          <circle cx="8" cy="-8" r="1.3" fill="#fff6a8" />
        </>
      );
    case 4: // หมวกโจรสลัด
      return (
        <>
          <path d="M-26 1 Q-22 -20 0 -21 Q22 -20 26 1 Q0 -8 -26 1 Z" fill="#3a3358" {...s} />
          <path d="M-22 -3 Q0 -11 22 -3" fill="none" stroke="#ffcf3f" strokeWidth="2" />
          <circle cx="0" cy="-12" r="4.6" fill="#fff" {...thin} />
          <circle cx="-1.6" cy="-12.6" r="1.1" fill={INK} />
          <circle cx="1.6" cy="-12.6" r="1.1" fill={INK} />
          <path d="M-5 -6 L5 -9 M-5 -9 L5 -6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </>
      );
    case 5: // โบว์
      return (
        <g transform="translate(10 -4) rotate(18)">
          <path d="M0 0 Q-14 -12 -16 -2 Q-14 10 0 0 Z" fill="#ff7fae" {...s} />
          <path d="M0 0 Q14 -12 16 -2 Q14 10 0 0 Z" fill="#ff7fae" {...s} />
          <path d="M-11 -3 Q-7 -3 -4 -1 M11 -3 Q7 -3 4 -1" fill="none" stroke="#e24f8a" strokeWidth="1.4" />
          <circle cx="0" cy="0" r="4" fill="#ff4d8f" {...thin} />
        </g>
      );
    case 6: // หมวกปาร์ตี้
      return (
        <g transform="rotate(-12)">
          <path d="M-11 0 L0 -32 L11 0 Z" fill="#ff9a3d" {...s} />
          <path d="M-7.2 -11 L7.4 -10 M-3.8 -21 L4 -20.5" stroke="#fff" strokeWidth="3" />
          <circle cx="-3" cy="-5" r="1.6" fill="#5ccbff" />
          <circle cx="4" cy="-15" r="1.4" fill="#ff6b7a" />
          <circle cx="0" cy="-33" r="4.4" fill="#ffd84a" {...thin} />
        </g>
      );
    case 7: // หมวกเชฟ
      return (
        <>
          <path d="M-14 0 L-14 -10 Q-23 -13 -19 -22 Q-16 -31 -6 -28 Q0 -37 8 -29 Q19 -31 19 -21 Q23 -12 14 -10 L14 0 Z" fill="#fff" {...s} />
          <rect x="-15" y="-7" width="30" height="7" rx="2" fill="#f1edf8" {...thin} />
          <path d="M-6 -18 Q-4 -12 -5 -8 M6 -19 Q4 -13 5 -8" fill="none" stroke="#d6d0e6" strokeWidth="1.6" strokeLinecap="round" />
        </>
      );
    case 8: // หมวกไวกิ้ง
      return (
        <>
          <path d="M-15 -9 Q-30 -12 -29 -31 Q-22 -19 -13 -17 Z" fill="#fff1d6" {...s} />
          <path d="M15 -9 Q30 -12 29 -31 Q22 -19 13 -17 Z" fill="#fff1d6" {...s} />
          <path d="M-18 1 Q-18 -22 0 -22 Q18 -22 18 1 Z" fill="#b9c3d8" {...s} />
          <rect x="-19" y="-4" width="38" height="5" rx="2" fill="#d39a6a" {...thin} />
          <path d="M0 -22 L0 -4" stroke="#8e9ab4" strokeWidth="2.2" />
          <circle cx="-9" cy="-1.5" r="1.2" fill={INK} />
          <circle cx="9" cy="-1.5" r="1.2" fill={INK} />
        </>
      );
    case 9: // มงกุฎดอกไม้
      return (
        <>
          <path d="M-22 0 Q0 -8 22 0" fill="none" stroke="#4fb55c" strokeWidth="3" strokeLinecap="round" />
          {[
            [-19, -2, '#ff7fae'],
            [-9, -6, '#ffd84a'],
            [1, -7, '#ff9a3d'],
            [11, -5, '#9b6cf0'],
            [20, -1, '#5ccbff'],
          ].map(([x, y, c], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse key={a} cx="0" cy="-3.4" rx="2.6" ry="3.4" fill={c as string} stroke={INK} strokeWidth="1" transform={`rotate(${a})`} />
              ))}
              <circle r="2" fill="#fff6a8" stroke={INK} strokeWidth="1" />
            </g>
          ))}
        </>
      );
    default:
      return null;
  }
}

export function HatArt({ id, a }: { id: number; a: FaceAnchor }) {
  if (!id) return null;
  const [x, y, k] = a.hat;
  return <g transform={`translate(${x} ${y}) scale(${k})`}>{hatShape(id)}</g>;
}

/* ------------------------------ ชุด ------------------------------ */
/** ส่วนที่อยู่หลังลำตัว (ผ้าคลุม) */
export function OutfitBack({ id }: { id: number }) {
  if (id === 1)
    return (
      <>
        <path d="M26 62 Q8 80 12 99 Q30 94 50 99 Q70 94 88 99 Q92 80 74 62 Z" fill="#ff4d6d" {...s} />
        <path d="M30 70 Q20 84 22 96" fill="none" stroke="#c9354a" strokeWidth="2" opacity="0.6" />
        <path d="M70 70 Q80 84 78 96" fill="none" stroke="#c9354a" strokeWidth="2" opacity="0.6" />
      </>
    );
  return null;
}

export function OutfitFront({ id, robot }: { id: number; robot?: boolean }) {
  switch (id) {
    case 1: // ผ้าคลุมฮีโร่ (สายผูกด้านหน้า)
      return (
        <>
          <path d="M26 69 Q50 80 74 69" fill="none" stroke="#ff4d6d" strokeWidth="5" strokeLinecap="round" />
          <path d="M26 69 Q50 80 74 69" fill="none" stroke={INK} strokeWidth="1.2" opacity="0.5" />
          <circle cx="50" cy="75" r="4.4" fill="#ffd84a" {...thin} />
          <path d="M48 75 L50 72.6 L52 75 L50 77.4 Z" fill="#f5a50f" />
        </>
      );
    case 2: // ผ้าพันคอ
      return (
        <>
          <path d="M61 77 L70 97 L60 98 L55 80 Z" fill="#3fd6a8" {...s} />
          <path d="M63 86 L67 85 M65 92 L69 91" stroke="#fff" strokeWidth="2" />
          <path d="M18 69 Q50 83 82 69 L83 77 Q50 91 17 77 Z" fill="#3fd6a8" {...s} />
          <path d="M30 75 L32 80 M44 78 L45 84 M58 78 L57 84 M71 75 L69 80" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    case 3: // หูกระต่าย
      return (
        <>
          <path d="M50 75 L37 67 Q34 75 37 83 Z" fill="#ff4d6d" {...s} />
          <path d="M50 75 L63 67 Q66 75 63 83 Z" fill="#ff4d6d" {...s} />
          <path d="M40 72 L44 74 M60 72 L56 74" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
          <rect x="46" y="71" width="8" height="8" rx="3" fill="#e2304f" {...thin} />
        </>
      );
    case 4: // เกราะอัศวิน
      return (
        <>
          <path d={robot ? 'M24 70 Q50 63 76 70 L76 88 Q50 96 24 88 Z' : 'M22 71 Q50 63 78 71 Q81 85 71 92 Q50 96 29 92 Q19 85 22 71 Z'} fill="#d4dcea" {...s} />
          <path d="M50 66 L50 93" stroke="#a9b3c9" strokeWidth="2" />
          <path d="M28 76 Q50 70 72 76" fill="none" stroke="#fff" strokeWidth="2" opacity="0.8" />
          <path d="M50 74 L52.6 79.4 L58.4 80 L54 84 L55.4 89.6 L50 86.6 L44.6 89.6 L46 84 L41.6 80 L47.4 79.4 Z" fill="#ffd84a" {...thin} />
        </>
      );
    case 5: // ชุดเอี๊ยม
      return (
        <>
          <path d="M38 74 L31 58 M62 74 L69 58" stroke="#2a4fb8" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M35 73 L65 73 L67 92 Q50 95 33 92 Z" fill="#4a7bf0" {...s} />
          <rect x="43" y="78" width="14" height="8" rx="2" fill="#2a4fb8" {...thin} />
          <circle cx="38.5" cy="76" r="2.2" fill="#ffcf3f" {...thin} />
          <circle cx="61.5" cy="76" r="2.2" fill="#ffcf3f" {...thin} />
        </>
      );
    case 6: // กระโปรงบัลเล่ต์
      return (
        <>
          <path d="M15 82 Q50 74 85 82 L88 88 L82 86 L80 92 L73 88 L68 94 L62 89 L56 95 L50 90 L44 95 L38 89 L32 94 L27 88 L20 92 L18 86 L12 88 Z" fill="#ffb0d9" {...s} />
          <path d="M18 84 Q50 77 82 84" fill="none" stroke="#fff" strokeWidth="2.2" opacity="0.8" />
          <circle cx="34" cy="85" r="1.2" fill="#fff" />
          <circle cx="56" cy="86" r="1.2" fill="#fff" />
          <circle cx="72" cy="85" r="1.2" fill="#fff" />
        </>
      );
    case 7: // เหรียญดาว
      return (
        <>
          <path d="M36 64 L50 82" stroke="#4a7bf0" strokeWidth="5" strokeLinecap="round" />
          <path d="M64 64 L50 82" stroke="#ff6b7a" strokeWidth="5" strokeLinecap="round" />
          <circle cx="50" cy="86" r="8" fill="#ffd84a" {...s} />
          <path d="M50 80.6 L51.8 84.2 L55.6 84.6 L52.8 87.2 L53.6 91 L50 89 L46.4 91 L47.2 87.2 L44.4 84.6 L48.2 84.2 Z" fill="#f5a50f" />
        </>
      );
    case 8: // เสื้อนักบินอวกาศ
      return (
        <>
          <path d="M22 70 Q50 80 78 70 L80 75 Q50 86 20 75 Z" fill="#c9d3e6" {...s} />
          <rect x="34" y="77" width="32" height="14" rx="4" fill="#f4f6fb" {...s} />
          <circle cx="41" cy="84" r="2.6" fill="#ff6b7a" {...thin} />
          <circle cx="50" cy="84" r="2.6" fill="#5ccbff" {...thin} />
          <rect x="56" y="81.5" width="6" height="5" rx="1.2" fill="#ffcf3f" {...thin} />
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------ หน้ากาก ------------------------------ */
function heart(cx: number, cy: number, r: number) {
  return `M${cx} ${cy + r * 0.9} C${cx - r * 1.5} ${cy - r * 0.1} ${cx - r * 0.9} ${cy - r * 1.3} ${cx} ${cy - r * 0.45} C${cx + r * 0.9} ${cy - r * 1.3} ${cx + r * 1.5} ${cy - r * 0.1} ${cx} ${cy + r * 0.9} Z`;
}
function star(cx: number, cy: number, r: number) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.5 : r;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `;
  }
  return d + 'Z';
}

export function MaskArt({ id, a }: { id: number; a: FaceAnchor }) {
  const [x1, x2] = a.eyes;
  const y = a.eyeY;
  const r = a.eyeR;
  const mid = (x1 + x2) / 2;
  switch (id) {
    case 1: // แว่นกันแดด
      return (
        <>
          <path d={`M${x1 + r} ${y - 2} Q${mid} ${y - 6} ${x2 - r} ${y - 2}`} fill="none" stroke={INK} strokeWidth="2.6" />
          {[x1, x2].map((x) => (
            <g key={x}>
              <rect x={x - r - 2.5} y={y - r + 0.5} width={(r + 2.5) * 2} height={r * 1.75} rx={r * 0.7} fill="#2a2350" {...s} />
              <path d={`M${x - r + 1} ${y - r * 0.35} L${x - r * 0.2} ${y - r * 0.75}`} stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            </g>
          ))}
        </>
      );
    case 2: // แว่นกลม
      return (
        <>
          <path d={`M${x1 + r + 1} ${y - 1} Q${mid} ${y - 5} ${x2 - r - 1} ${y - 1}`} fill="none" stroke="#b07448" strokeWidth="2.6" />
          {[x1, x2].map((x) => (
            <g key={x}>
              <circle cx={x} cy={y} r={r + 2} fill="#ffffff" fillOpacity="0.22" stroke="#b07448" strokeWidth="3" />
              <circle cx={x} cy={y} r={r + 3.6} fill="none" stroke={INK} strokeWidth="1.2" />
            </g>
          ))}
        </>
      );
    case 3: {
      // หน้ากากฮีโร่ (เจาะรูตา)
      const L = x1 - r - 7;
      const R = x2 + r + 7;
      const d =
        `M${L} ${y - 3} Q${mid} ${y - r - 9} ${R} ${y - 3} Q${R - 2} ${y + r + 2} ${mid + 4} ${y + 4} Q${mid} ${y + 1} ${mid - 4} ${y + 4} Q${L + 2} ${y + r + 2} ${L} ${y - 3} Z ` +
        `M${x1 - r + 1} ${y} a${r - 1} ${r - 2} 0 1 0 ${(r - 1) * 2} 0 a${r - 1} ${r - 2} 0 1 0 ${-(r - 1) * 2} 0 Z ` +
        `M${x2 - r + 1} ${y} a${r - 1} ${r - 2} 0 1 0 ${(r - 1) * 2} 0 a${r - 1} ${r - 2} 0 1 0 ${-(r - 1) * 2} 0 Z`;
      return (
        <>
          <path d={d} fill="#4a7bf0" fillRule="evenodd" {...s} />
          <path d={`M${L + 1} ${y - 3} L${L - 8} ${y + 2} M${L + 1} ${y - 1} L${L - 6} ${y + 7}`} stroke="#4a7bf0" strokeWidth="3" strokeLinecap="round" />
        </>
      );
    }
    case 4: {
      // หนวดเท่
      const my = a.mouthY - 1;
      return (
        <path
          d={`M50 ${my} Q44 ${my - 5} 37 ${my - 1} Q31 ${my + 3} 28 ${my - 3} Q30 ${my + 7} 38 ${my + 5} Q45 ${my + 3} 50 ${my + 1} Q55 ${my + 3} 62 ${my + 5} Q70 ${my + 7} 72 ${my - 3} Q69 ${my + 3} 63 ${my - 1} Q56 ${my - 5} 50 ${my} Z`}
          fill="#5b3a29"
          {...s}
          strokeWidth={1.8}
        />
      );
    }
    case 5: // แว่นดำน้ำ
      return (
        <>
          <path d={`M13 ${y - 2} L${x1 - r - 4} ${y - 2} M${x2 + r + 4} ${y - 2} L87 ${y - 2}`} stroke="#ff9a3d" strokeWidth="5" strokeLinecap="round" />
          {[x1, x2].map((x) => (
            <g key={x}>
              <circle cx={x} cy={y} r={r + 4} fill="#ff9a3d" {...s} />
              <circle cx={x} cy={y} r={r + 0.5} fill="#8fe3ff" fillOpacity="0.55" stroke={INK} strokeWidth="1.6" />
              <path d={`M${x - r * 0.6} ${y - r * 0.2} Q${x - r * 0.4} ${y - r * 0.7} ${x} ${y - r * 0.75}`} stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
            </g>
          ))}
          <rect x={mid - 3} y={y - 3} width="6" height="5" rx="2" fill="#ff9a3d" {...thin} />
        </>
      );
    case 6: // แว่นดาว
      return (
        <>
          <path d={`M${x1 + r} ${y - 1} L${x2 - r} ${y - 1}`} stroke={INK} strokeWidth="2.4" />
          {[x1, x2].map((x) => (
            <path key={x} d={star(x, y, r + 5)} fill="#ffd84a" fillOpacity="0.9" {...s} strokeWidth={2} />
          ))}
        </>
      );
    case 7: // แว่นหัวใจ
      return (
        <>
          <path d={`M${x1 + r} ${y - 1} L${x2 - r} ${y - 1}`} stroke={INK} strokeWidth="2.4" />
          {[x1, x2].map((x) => (
            <path key={x} d={heart(x, y, r + 2.5)} fill="#ff7fae" fillOpacity="0.85" {...s} strokeWidth={2} />
          ))}
        </>
      );
    case 8: {
      // ผ้าปิดนินจา
      const my = a.mouthY;
      return (
        <>
          <path d={`M17 ${my - 9} Q50 ${my - 15} 83 ${my - 9} Q84 ${my + 9} 70 ${my + 15} Q50 ${my + 20} 30 ${my + 15} Q16 ${my + 9} 17 ${my - 9} Z`} fill="#3a3358" {...s} />
          <path d={`M32 ${my - 3} Q50 ${my - 7} 68 ${my - 3} M36 ${my + 5} Q50 ${my + 2} 64 ${my + 5}`} fill="none" stroke="#5a5280" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    }
    default:
      return null;
  }
}

/* ------------------------------ ของถือ (พิกัดย่อย: มือ = 0,0 ของชี้ขึ้น) ------------------------------ */
function itemShape(id: number) {
  switch (id) {
    case 1: // ค้อนยักษ์
      return (
        <>
          <rect x="-2.6" y="-34" width="5.2" height="42" rx="2.4" fill="#b07448" {...s} />
          <rect x="-15" y="-50" width="30" height="18" rx="4" fill="#a9b3c9" {...s} />
          <rect x="-15" y="-44" width="30" height="6" fill="#8390ab" {...thin} />
          <path d="M-11 -47 L-3 -47" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        </>
      );
    case 2: // ดาบ
      return (
        <>
          <path d="M-3.2 -8 L-3.2 -46 L0 -53 L3.2 -46 L3.2 -8 Z" fill="#e8ecf5" {...s} />
          <path d="M0 -50 L0 -10" stroke="#a9b3c9" strokeWidth="1.4" />
          <rect x="-10" y="-10" width="20" height="4.4" rx="2" fill="#ffd84a" {...thin} />
          <rect x="-2.4" y="-6" width="4.8" height="11" rx="2" fill="#b07448" {...thin} />
          <circle cx="0" cy="6.4" r="2.8" fill="#ffd84a" {...thin} />
        </>
      );
    case 3: // คทา
      return (
        <>
          <rect x="-2.2" y="-36" width="4.4" height="44" rx="2" fill="#ffd84a" {...s} />
          <path d="M-9 -40 Q-6 -34 0 -34 Q6 -34 9 -40" fill="none" stroke="#f5a50f" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="0" cy="-43" r="7.5" fill="#9b6cf0" {...s} />
          <circle cx="-2.5" cy="-45.5" r="2.2" fill="#fff" opacity="0.8" />
          <circle cx="0" cy="-52.5" r="2" fill="#ff6b7a" {...thin} />
        </>
      );
    case 4: // ไม้เบสบอล
      return (
        <>
          <path d="M-2.6 8 L-2.2 -10 Q-6 -30 -5 -45 Q0 -50 5 -45 Q6 -30 2.2 -10 L2.6 8 Z" fill="#e8b878" {...s} />
          <path d="M-2.4 -2 L2.4 -4 M-2.4 2 L2.4 0 M-2.4 6 L2.4 4" stroke="#ff6b7a" strokeWidth="1.6" />
          <path d="M-2 -40 Q-3 -30 -1 -18" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        </>
      );
    case 5: // ไม้กายสิทธิ์
      return (
        <>
          <rect x="-1.8" y="-30" width="3.6" height="38" rx="1.6" fill="#3a3358" {...thin} />
          <rect x="-1.8" y="-30" width="3.6" height="6" rx="1.4" fill="#fff" />
          <path d={star(0, -38, 9)} fill="#ffd84a" {...s} strokeWidth={2} />
          <circle cx="11" cy="-46" r="1.6" fill="#fff6a8" />
          <circle cx="-10" cy="-30" r="1.3" fill="#fff6a8" />
          <path d="M9 -32 L9 -28 M7 -30 L11 -30" stroke="#fff6a8" strokeWidth="1.4" strokeLinecap="round" />
        </>
      );
    case 6: // ลูกโป่ง
      return (
        <>
          <path d="M0 4 Q-5 -10 2 -20 Q8 -30 2 -40" fill="none" stroke={INK} strokeWidth="1.4" />
          <ellipse cx="3" cy="-53" rx="11" ry="13.5" fill="#ff6b7a" {...s} />
          <path d="M0 -40.5 L3 -38 L6 -40.5 Z" fill="#ff6b7a" {...thin} />
          <ellipse cx="-1" cy="-58" rx="3" ry="4.6" fill="#fff" opacity="0.55" transform="rotate(-20 -1 -58)" />
        </>
      );
    case 7: // อมยิ้ม
      return (
        <>
          <rect x="-1.6" y="-24" width="3.2" height="32" rx="1.4" fill="#fff" {...thin} />
          <circle cx="0" cy="-33" r="11" fill="#ff8fc4" {...s} />
          <path d="M1 -33 A2 2 0 1 0 -1.5 -35 A4.5 4.5 0 1 1 -5 -30 A7.5 7.5 0 0 1 4 -40" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    case 8: // โล่
      return (
        <g transform="rotate(-20)">
          <path d="M-13 -24 L13 -24 L13 -8 Q13 7 0 14 Q-13 7 -13 -8 Z" fill="#4a7bf0" {...s} />
          <path d="M-8.5 -19.5 L8.5 -19.5 L8.5 -8 Q8.5 3 0 8.4 Q-8.5 3 -8.5 -8 Z" fill="#5ccbff" {...thin} />
          <path d={star(0, -7, 6)} fill="#ffd84a" {...thin} />
        </g>
      );
    case 9: // ธงสายฟ้า
      return (
        <>
          <rect x="-1.8" y="-48" width="3.6" height="56" rx="1.6" fill="#a9b3c9" {...thin} />
          <circle cx="0" cy="-49" r="2.8" fill="#ffd84a" {...thin} />
          <path d="M1.8 -46 Q14 -48 28 -42 Q16 -38 28 -32 Q14 -28 1.8 -30 Z" fill="#ffd84a" {...s} />
          <path d="M14 -45 L9 -38.5 L14 -38.5 L10 -32" fill="none" stroke="#f5a50f" strokeWidth="2" strokeLinejoin="round" />
        </>
      );
    default:
      return null;
  }
}

export function ItemArt({ id, a }: { id: number; a: FaceAnchor }) {
  if (!id) return null;
  const [x, y] = a.hand;
  return <g transform={`translate(${x} ${y}) rotate(${id === 8 ? 0 : 16}) scale(1.12)`}>{itemShape(id)}</g>;
}
