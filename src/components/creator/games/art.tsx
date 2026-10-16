'use client';

/** ภาพประกอบเกม (SVG ล้วน ห้ามอิโมจิ) */
import React from 'react';

const INK = '#2a2350';
const s = { stroke: INK, strokeWidth: 2.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export type FoodId = 'bread' | 'milk' | 'cake' | 'donut' | 'juice';

export function Food({ id, size = 34 }: { id: FoodId; size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" style={{ overflow: 'visible' }}>
      {id === 'bread' && (
        <>
          <path d="M5 24 C5 12 13 8 20 8 C27 8 35 12 35 24 L35 31 Q35 33 33 33 L7 33 Q5 33 5 31 Z" fill="#f2b064" {...s} />
          <path d="M7 22 C8 15 13 12 20 12 C27 12 32 15 33 22" fill="#ffd79a" />
          <path d="M13 15 L15 20 M20 13 L21 19 M27 15 L25 20" fill="none" stroke="#c97a2b" strokeWidth={2} strokeLinecap="round" />
        </>
      )}
      {id === 'milk' && (
        <>
          <path d="M14 4 L26 4 L26 9 L30 15 L30 34 Q30 36 28 36 L12 36 Q10 36 10 34 L10 15 L14 9 Z" fill="#ffffff" {...s} />
          <rect x="13" y="2" width="14" height="5" rx="2" fill="#4fb3ff" {...s} />
          <rect x="10" y="19" width="20" height="10" fill="#bfe3ff" />
          <path d="M14 24 Q17 21 20 24 Q23 27 26 24" fill="none" stroke="#4a7bf0" strokeWidth={2} strokeLinecap="round" />
        </>
      )}
      {id === 'cake' && (
        <>
          <path d="M6 30 L20 12 L34 30 Z" fill="#fff1dc" {...s} />
          <path d="M6 30 L34 30 L34 34 Q34 36 32 36 L8 36 Q6 36 6 34 Z" fill="#f2b064" {...s} />
          <path d="M9 26 L31 26 L34 30 L6 30 Z" fill="#ff8fb1" />
          <path d="M14 18 Q20 22 26 18" fill="none" stroke="#ff8fb1" strokeWidth={3} strokeLinecap="round" />
          <circle cx="20" cy="9" r="4" fill="#ff4d6a" {...s} />
          <path d="M20 5 Q22 1 25 2" fill="none" {...s} strokeWidth={1.8} />
        </>
      )}
      {id === 'donut' && (
        <>
          <ellipse cx="20" cy="22" rx="16" ry="13" fill="#e9a85a" {...s} />
          <path d="M6 20 C6 12 13 9 20 9 C27 9 34 12 34 20 C33 26 28 27 26 24 C23 29 17 29 14 24 C12 27 7 26 6 20 Z" fill="#ff8fc4" {...s} strokeWidth={2} />
          <ellipse cx="20" cy="19" rx="5" ry="3.5" fill="#e9a85a" {...s} strokeWidth={2} />
          {[
            [11, 15, '#ffd84a'],
            [16, 12, '#5ccbff'],
            [26, 13, '#7ddc86'],
            [29, 18, '#ffd84a'],
            [12, 21, '#5ccbff'],
            [25, 23, '#fff'],
          ].map(([x, y, c], i) => (
            <rect key={i} x={x as number} y={y as number} width="3" height="1.6" rx="0.8" fill={c as string} transform={`rotate(${i * 37} ${x} ${y})`} />
          ))}
        </>
      )}
      {id === 'juice' && (
        <>
          <path d="M24 2 L22 14" {...s} fill="none" />
          <path d="M9 10 L31 10 L28 35 Q28 37 26 37 L14 37 Q12 37 12 35 Z" fill="#ffffff" {...s} />
          <path d="M10.5 16 L29.5 16 L28 35 Q28 36 26 36 L14 36 Q12 36 12 35 Z" fill="#ffa53d" />
          <circle cx="16" cy="22" r="1.6" fill="#fff" opacity="0.8" />
          <circle cx="23" cy="28" r="1.2" fill="#fff" opacity="0.8" />
          <circle cx="31" cy="11" r="5" fill="#ffd84a" {...s} />
          <path d="M31 6 L31 16 M26 11 L36 11" stroke="#f0b81c" strokeWidth={1.4} />
        </>
      )}
    </svg>
  );
}

export function Coin({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#ffcf3f" stroke={INK} strokeWidth="2" />
      <circle cx="12" cy="12" r="6.5" fill="#ffe27a" stroke="#e0a40e" strokeWidth="1.5" />
      <path d="M12 8.5 L12 15.5 M9.8 10.2 Q12 8.6 14.2 10.2" stroke="#c98a00" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <circle cx="8.5" cy="8" r="1.5" fill="#fff" opacity="0.8" />
    </svg>
  );
}

export function Heart({ size = 20, empty = false }: { size?: number; empty?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M12 21 C5 16 2 12 2 8 C2 5 4.5 3 7 3 C9 3 11 4.2 12 6 C13 4.2 15 3 17 3 C19.5 3 22 5 22 8 C22 12 19 16 12 21 Z" fill={empty ? '#e7e1f6' : '#ff5c7a'} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {!empty && <ellipse cx="7.5" cy="8" rx="2" ry="1.4" fill="#fff" opacity="0.7" />}
    </svg>
  );
}

export function Clock({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="13" r="9" fill="#fff" stroke={INK} strokeWidth="2" />
      <path d="M12 8 L12 13 L15.5 15" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
      <rect x="9.5" y="1.5" width="5" height="3" rx="1" fill="#ff6b7a" stroke={INK} strokeWidth="1.6" />
    </svg>
  );
}

export function Bolt({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M13 2 L4 14 L11 14 L9 22 L20 9 L13 9 Z" fill="#ffd84a" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function Banana({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M4 6 C3 14 9 21 19 19 C20 18.6 20 17.6 19 17.4 C12 17 7.5 13 7 6 Z" fill="#ffdc54" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 9 C9 13 12 16 16 17" fill="none" stroke="#e0a40e" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 6 L5.5 3.5 L7.5 4.5 L7 6" fill="#8a5a2b" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function Flag({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 30 40" width={size} height={size * 1.33} aria-hidden="true">
      <path d="M5 38 L5 4" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d="M6 4 L27 4 L27 20 L6 20 Z" fill="#fff" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      {[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4, 5].map((c) => ((r + c) % 2 ? null : <rect key={`${r}${c}`} x={6 + c * 3.5} y={4 + r * 4} width="3.5" height="4" fill={INK} />)))}
    </svg>
  );
}

export function Gear({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M10 2 h4 l.6 2.6 2.2 1 2.3-1.4 2.8 2.8-1.4 2.3 1 2.2L24 12v0l-2.6.6-1 2.2 1.4 2.3-2.8 2.8-2.3-1.4-2.2 1L14 22h-4l-.6-2.6-2.2-1-2.3 1.4-2.8-2.8 1.4-2.3-1-2.2L0 12l2.6-.6 1-2.2-1.4-2.3 2.8-2.8 2.3 1.4 2.2-1z"
        fill="#a9bde0"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
        transform="scale(.92) translate(1 1)"
      />
      <circle cx="12" cy="12" r="3.5" fill="#fff" stroke={INK} strokeWidth="1.8" />
    </svg>
  );
}
