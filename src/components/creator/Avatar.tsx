'use client';

import React from 'react';

/** ตัวละครผู้เล่น 12 แบบ วาดด้วย SVG (ห้ามใช้อิโมจิ) */
interface Critter {
  name: string;
  body: string;
  belly: string;
  ear: 'cat' | 'bunny' | 'bear' | 'frog' | 'chick' | 'fox' | 'panda' | 'penguin' | 'alien' | 'robot' | 'owl' | 'monster';
}

export const CRITTERS: Critter[] = [
  { name: 'แมวส้ม', body: '#ffb04a', belly: '#ffe3b8', ear: 'cat' },
  { name: 'กระต่าย', body: '#ffc2e2', belly: '#fff0f8', ear: 'bunny' },
  { name: 'หมีน้อย', body: '#c98a5a', belly: '#f3d6bd', ear: 'bear' },
  { name: 'กบเขียว', body: '#6fd67a', belly: '#d8f7d0', ear: 'frog' },
  { name: 'ลูกเจี๊ยบ', body: '#ffd84a', belly: '#fff3b8', ear: 'chick' },
  { name: 'จิ้งจอก', body: '#ff7a45', belly: '#fff1e6', ear: 'fox' },
  { name: 'แพนด้า', body: '#ffffff', belly: '#ffffff', ear: 'panda' },
  { name: 'เพนกวิน', body: '#4a5d8f', belly: '#ffffff', ear: 'penguin' },
  { name: 'มนุษย์ต่างดาว', body: '#8be0d0', belly: '#d9fbf4', ear: 'alien' },
  { name: 'หุ่นยนต์', body: '#9fb3d1', belly: '#e3ebf7', ear: 'robot' },
  { name: 'นกฮูก', body: '#9b6cf0', belly: '#e7dcff', ear: 'owl' },
  { name: 'มอนสเตอร์', body: '#ff6b7a', belly: '#ffd6db', ear: 'monster' },
];

const INK = '#2a2350';

export function Avatar({ id, size = 56, className, mood = 'happy' }: { id: number; size?: number; className?: string; mood?: 'happy' | 'wow' | 'sad' }) {
  const c = CRITTERS[((id % CRITTERS.length) + CRITTERS.length) % CRITTERS.length];
  const sw = 3;
  const ears = (() => {
    switch (c.ear) {
      case 'cat':
        return (
          <>
            <path d="M18 30 L22 8 L38 22 Z" fill={c.body} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
            <path d="M82 30 L78 8 L62 22 Z" fill={c.body} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
            <path d="M24 24 L25 15 L32 21 Z" fill="#ff94cc" />
            <path d="M76 24 L75 15 L68 21 Z" fill="#ff94cc" />
          </>
        );
      case 'bunny':
        return (
          <>
            <ellipse cx="36" cy="16" rx="8" ry="20" fill={c.body} stroke={INK} strokeWidth={sw} transform="rotate(-10 36 16)" />
            <ellipse cx="64" cy="16" rx="8" ry="20" fill={c.body} stroke={INK} strokeWidth={sw} transform="rotate(10 64 16)" />
            <ellipse cx="36" cy="17" rx="3.5" ry="13" fill="#fff" transform="rotate(-10 36 17)" />
            <ellipse cx="64" cy="17" rx="3.5" ry="13" fill="#fff" transform="rotate(10 64 17)" />
          </>
        );
      case 'bear':
      case 'panda':
        return (
          <>
            <circle cx="24" cy="24" r="11" fill={c.ear === 'panda' ? INK : c.body} stroke={INK} strokeWidth={sw} />
            <circle cx="76" cy="24" r="11" fill={c.ear === 'panda' ? INK : c.body} stroke={INK} strokeWidth={sw} />
            {c.ear === 'bear' && (
              <>
                <circle cx="24" cy="24" r="5" fill={c.belly} />
                <circle cx="76" cy="24" r="5" fill={c.belly} />
              </>
            )}
          </>
        );
      case 'frog':
        return (
          <>
            <circle cx="32" cy="24" r="13" fill={c.body} stroke={INK} strokeWidth={sw} />
            <circle cx="68" cy="24" r="13" fill={c.body} stroke={INK} strokeWidth={sw} />
          </>
        );
      case 'chick':
        return <path d="M50 20 C46 8 40 6 38 10 C44 10 46 14 47 20 M50 20 C52 6 58 4 61 8 C56 9 54 13 53 20" fill={c.body} stroke={INK} strokeWidth={sw} strokeLinecap="round" />;
      case 'fox':
        return (
          <>
            <path d="M16 36 L18 6 L40 22 Z" fill={c.body} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
            <path d="M84 36 L82 6 L60 22 Z" fill={c.body} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
            <path d="M22 26 L22 14 L32 22 Z" fill={INK} opacity="0.85" />
            <path d="M78 26 L78 14 L68 22 Z" fill={INK} opacity="0.85" />
          </>
        );
      case 'alien':
        return (
          <>
            <path d="M38 22 L30 6" stroke={INK} strokeWidth={sw} strokeLinecap="round" />
            <path d="M62 22 L70 6" stroke={INK} strokeWidth={sw} strokeLinecap="round" />
            <circle cx="30" cy="6" r="5" fill="#ffcf3f" stroke={INK} strokeWidth={2.5} />
            <circle cx="70" cy="6" r="5" fill="#ffcf3f" stroke={INK} strokeWidth={2.5} />
          </>
        );
      case 'robot':
        return (
          <>
            <path d="M50 18 L50 6" stroke={INK} strokeWidth={sw} strokeLinecap="round" />
            <circle cx="50" cy="6" r="5" fill="#ff6b7a" stroke={INK} strokeWidth={2.5} />
            <rect x="8" y="42" width="8" height="18" rx="3" fill={c.body} stroke={INK} strokeWidth={sw} />
            <rect x="84" y="42" width="8" height="18" rx="3" fill={c.body} stroke={INK} strokeWidth={sw} />
          </>
        );
      case 'owl':
        return (
          <>
            <path d="M18 34 L20 10 L38 24 Z" fill={c.body} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
            <path d="M82 34 L80 10 L62 24 Z" fill={c.body} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
          </>
        );
      case 'monster':
        return (
          <>
            <path d="M26 26 C22 14 26 6 32 4 C30 12 34 18 38 22 Z" fill="#fff8ec" stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
            <path d="M74 26 C78 14 74 6 68 4 C70 12 66 18 62 22 Z" fill="#fff8ec" stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
          </>
        );
      default:
        return null;
    }
  })();

  const robot = c.ear === 'robot';
  const bigEyes = c.ear === 'owl' || c.ear === 'frog';
  const eyeY = c.ear === 'frog' ? 26 : 50;
  const eyeR = bigEyes ? 7 : 5;
  const mouth =
    mood === 'wow' ? (
      <ellipse cx="50" cy="70" rx="6" ry="7" fill={INK} />
    ) : mood === 'sad' ? (
      <path d="M41 72 Q50 64 59 72" fill="none" stroke={INK} strokeWidth={sw} strokeLinecap="round" />
    ) : c.ear === 'chick' || c.ear === 'owl' || c.ear === 'penguin' ? (
      <path d="M44 64 L56 64 L50 72 Z" fill="#ff9a3d" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
    ) : (
      <path d="M40 66 Q50 76 60 66" fill={mood === 'happy' ? '#ff6b7a' : 'none'} stroke={INK} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    );

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label={c.name}>
      {ears}
      {robot ? (
        <rect x="14" y="20" width="72" height="70" rx="20" fill={c.body} stroke={INK} strokeWidth={sw} />
      ) : (
        <ellipse cx="50" cy="58" rx="38" ry="35" fill={c.body} stroke={INK} strokeWidth={sw} />
      )}
      {c.ear === 'penguin' && <ellipse cx="50" cy="62" rx="27" ry="26" fill={c.belly} />}
      {c.ear === 'fox' && <path d="M14 60 Q30 80 50 78 Q70 80 86 60 Q70 70 50 66 Q30 70 14 60 Z" fill={c.belly} />}
      {!robot && c.ear !== 'penguin' && c.ear !== 'fox' && <ellipse cx="50" cy="74" rx="22" ry="14" fill={c.belly} opacity="0.9" />}
      {robot && <rect x="26" y="40" width="48" height="26" rx="10" fill="#2a2350" />}
      {c.ear === 'panda' && (
        <>
          <ellipse cx="35" cy="51" rx="9" ry="11" fill={INK} transform="rotate(-20 35 51)" />
          <ellipse cx="65" cy="51" rx="9" ry="11" fill={INK} transform="rotate(20 65 51)" />
        </>
      )}
      {c.ear === 'owl' && (
        <>
          <circle cx="35" cy="48" r="13" fill="#fff8ec" stroke={INK} strokeWidth={2.5} />
          <circle cx="65" cy="48" r="13" fill="#fff8ec" stroke={INK} strokeWidth={2.5} />
        </>
      )}
      {c.ear === 'frog' && (
        <>
          <circle cx="32" cy="24" r="8" fill="#fff" />
          <circle cx="68" cy="24" r="8" fill="#fff" />
        </>
      )}
      {/* ตา */}
      {robot ? (
        <>
          <circle cx="38" cy="53" r="6" fill="#5ccbff" />
          <circle cx="62" cy="53" r="6" fill="#5ccbff" />
          <circle cx="40" cy="51" r="2" fill="#fff" />
          <circle cx="64" cy="51" r="2" fill="#fff" />
        </>
      ) : (
        <>
          <circle cx={c.ear === 'frog' ? 32 : 36} cy={eyeY} r={eyeR} fill={c.ear === 'panda' ? '#fff' : INK} />
          <circle cx={c.ear === 'frog' ? 68 : 64} cy={eyeY} r={eyeR} fill={c.ear === 'panda' ? '#fff' : INK} />
          <circle cx={(c.ear === 'frog' ? 32 : 36) + 2} cy={eyeY - 2} r={eyeR * 0.38} fill={c.ear === 'panda' ? INK : '#fff'} />
          <circle cx={(c.ear === 'frog' ? 68 : 64) + 2} cy={eyeY - 2} r={eyeR * 0.38} fill={c.ear === 'panda' ? INK : '#fff'} />
        </>
      )}
      {/* แก้ม */}
      {!robot && (
        <>
          <ellipse cx="24" cy="64" rx="6" ry="4" fill="#ff94cc" opacity="0.7" />
          <ellipse cx="76" cy="64" rx="6" ry="4" fill="#ff94cc" opacity="0.7" />
        </>
      )}
      {robot ? <rect x="40" y="72" width="20" height="5" rx="2.5" fill={INK} /> : mouth}
    </svg>
  );
}
