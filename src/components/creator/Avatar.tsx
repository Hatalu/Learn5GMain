'use client';

import React, { useId } from 'react';
import { HatArt, ItemArt, MaskArt, OutfitBack, OutfitFront, type FaceAnchor } from './AvatarGear';
import type { Gear, GearSlot } from '@/lib/game-creator/gear';

/**
 * ตัวละครผู้เล่น 12 แบบ วาดด้วย SVG (ห้ามใช้อิโมจิ)
 * สไตล์ "ตัวกลมหนุบ": ตาโตมีประกาย แก้มชมพู ปากแมว มีแขนเล็กๆ (โบกมือได้) และเท้ากลม
 */
type Ear = 'cat' | 'bunny' | 'bear' | 'frog' | 'chick' | 'fox' | 'panda' | 'penguin' | 'alien' | 'robot' | 'owl' | 'monster';

interface Critter {
  name: string;
  body: string;
  light: string;
  dark: string;
  belly: string;
  ear: Ear;
}

export const CRITTERS: Critter[] = [
  { name: 'แมวส้ม', body: '#ffb35c', light: '#ffd9a1', dark: '#e88a2e', belly: '#fff1dc', ear: 'cat' },
  { name: 'กระต่าย', body: '#ffc9e3', light: '#ffe8f3', dark: '#f39ac4', belly: '#fff5fa', ear: 'bunny' },
  { name: 'หมีน้อย', body: '#d39a6a', light: '#ebc39f', dark: '#b07448', belly: '#f6dfc7', ear: 'bear' },
  { name: 'กบเขียว', body: '#7ddc86', light: '#b6f0b9', dark: '#4fb55c', belly: '#e3fadf', ear: 'frog' },
  { name: 'ลูกเจี๊ยบ', body: '#ffdc54', light: '#fff0a6', dark: '#f0b81c', belly: '#fff7cc', ear: 'chick' },
  { name: 'จิ้งจอก', body: '#ff8a52', light: '#ffb88f', dark: '#e2622a', belly: '#fff3ea', ear: 'fox' },
  { name: 'แพนด้า', body: '#ffffff', light: '#ffffff', dark: '#e6e2ef', belly: '#ffffff', ear: 'panda' },
  { name: 'เพนกวิน', body: '#5a6fa8', light: '#8195cc', dark: '#3e4f82', belly: '#ffffff', ear: 'penguin' },
  { name: 'มนุษย์ต่างดาว', body: '#93e6d6', light: '#c9f6ed', dark: '#5ec7b2', belly: '#e3fcf7', ear: 'alien' },
  { name: 'หุ่นยนต์', body: '#a9bde0', light: '#d4e0f4', dark: '#7f95bd', belly: '#e8eff9', ear: 'robot' },
  { name: 'นกฮูก', body: '#a77cf2', light: '#cdb2ff', dark: '#7e52cf', belly: '#ece2ff', ear: 'owl' },
  { name: 'มอนสเตอร์', body: '#ff7d8c', light: '#ffb0b9', dark: '#e24f62', belly: '#ffe0e4', ear: 'monster' },
];

const INK = '#2a2350';
const SW = 2.6;

/** ตำแหน่งหัว/ตา/ปาก/มือของแต่ละตัว (ใช้วางเครื่องประดับ) */
function anchorOf(ear: Ear): FaceAnchor {
  if (ear === 'frog') return { hat: [50, 20, 0.95], eyes: [33, 67], eyeY: 30, eyeR: 10, mouthY: 52, hand: [86, 70] };
  if (ear === 'owl') return { hat: [50, 30, 1.32], eyes: [36, 64], eyeY: 54, eyeR: 12, mouthY: 67, hand: [86, 70] };
  if (ear === 'robot') return { hat: [50, 27, 1.4], eyes: [39, 61], eyeY: 56, eyeR: 8, mouthY: 75, hand: [87, 63] };
  if (ear === 'bunny') return { hat: [50, 30, 1.2], eyes: [37, 63], eyeY: 55, eyeR: 9, mouthY: 67, hand: [86, 70] };
  return { hat: [50, 30, 1.36], eyes: [37, 63], eyeY: 55, eyeR: 9, mouthY: 67, hand: [86, 70] };
}

/** กรอบภาพเฉพาะส่วน (ใช้ในตัวเลือกเครื่องประดับ) */
const CROP: Record<GearSlot, string> = { h: '4 -32 92 76', o: '2 48 96 54', m: '12 22 76 50', i: '42 0 74 84' };

export function Avatar({
  id,
  size = 56,
  className,
  mood = 'happy',
  wave = false,
  gear,
  crop,
}: {
  id: number;
  size?: number;
  className?: string;
  mood?: 'happy' | 'wow' | 'sad';
  wave?: boolean;
  gear?: Gear | null;
  crop?: GearSlot;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const c = CRITTERS[((id % CRITTERS.length) + CRITTERS.length) % CRITTERS.length];
  const g = `l5gav${uid}`;
  const fill = `url(#${g})`;
  const s = { stroke: INK, strokeWidth: SW, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

  const robot = c.ear === 'robot';
  const panda = c.ear === 'panda';
  const penguin = c.ear === 'penguin';
  const frog = c.ear === 'frog';
  const owl = c.ear === 'owl';
  const beak = c.ear === 'chick' || owl || penguin;
  const g0 = gear || null;
  const an = anchorOf(c.ear);

  /* ---------- หู/ของบนหัว (วาดก่อนลำตัว) ---------- */
  const ears = (() => {
    switch (c.ear) {
      case 'cat':
        return (
          <>
            <path d="M20 40 Q18 14 26 12 Q34 14 42 28 Z" fill={fill} {...s} />
            <path d="M80 40 Q82 14 74 12 Q66 14 58 28 Z" fill={fill} {...s} />
            <path d="M25 33 Q24 20 28 19 Q32 21 36 28 Z" fill="#ff9ec4" />
            <path d="M75 33 Q76 20 72 19 Q68 21 64 28 Z" fill="#ff9ec4" />
          </>
        );
      case 'bunny':
        return (
          <>
            <path d="M33 34 Q22 4 31 2 Q41 2 43 30 Z" fill={fill} {...s} />
            <path d="M67 34 Q78 4 69 2 Q59 2 57 30 Z" fill={fill} {...s} />
            <path d="M34 28 Q29 10 32 8 Q37 9 38 27 Z" fill="#ff9ec4" />
            <path d="M66 28 Q71 10 68 8 Q63 9 62 27 Z" fill="#ff9ec4" />
          </>
        );
      case 'bear':
      case 'panda':
        return (
          <>
            <circle cx="24" cy="30" r="11" fill={panda ? INK : fill} {...s} />
            <circle cx="76" cy="30" r="11" fill={panda ? INK : fill} {...s} />
            {!panda && (
              <>
                <circle cx="24" cy="30" r="5" fill={c.belly} />
                <circle cx="76" cy="30" r="5" fill={c.belly} />
              </>
            )}
          </>
        );
      case 'frog':
        return (
          <>
            <circle cx="33" cy="30" r="14" fill={fill} {...s} />
            <circle cx="67" cy="30" r="14" fill={fill} {...s} />
          </>
        );
      case 'chick':
        return <path d="M47 27 Q42 12 49 10 Q50 18 52 12 Q58 14 53 27" fill={c.dark} {...s} />;
      case 'fox':
        return (
          <>
            <path d="M18 44 Q12 12 22 10 Q34 14 42 28 Z" fill={fill} {...s} />
            <path d="M82 44 Q88 12 78 10 Q66 14 58 28 Z" fill={fill} {...s} />
            <path d="M22 34 Q20 18 24 17 Q30 20 34 27 Z" fill="#fff3ea" />
            <path d="M78 34 Q80 18 76 17 Q70 20 66 27 Z" fill="#fff3ea" />
          </>
        );
      case 'alien':
        return (
          <>
            <path d="M38 30 Q34 18 28 12" fill="none" {...s} />
            <path d="M62 30 Q66 18 72 12" fill="none" {...s} />
            <circle cx="28" cy="11" r="5.5" fill="#ffd84a" {...s} />
            <circle cx="72" cy="11" r="5.5" fill="#ff9ec4" {...s} />
          </>
        );
      case 'robot':
        return (
          <>
            <path d="M50 24 L50 11" fill="none" {...s} />
            <circle cx="50" cy="9" r="5.5" fill="#ff6b7a" {...s} />
            <rect x="9" y="50" width="9" height="16" rx="4" fill={c.dark} {...s} />
            <rect x="82" y="50" width="9" height="16" rx="4" fill={c.dark} {...s} />
          </>
        );
      case 'owl':
        return (
          <>
            <path d="M22 40 Q18 18 24 16 Q32 20 40 30 Z" fill={c.dark} {...s} />
            <path d="M78 40 Q82 18 76 16 Q68 20 60 30 Z" fill={c.dark} {...s} />
          </>
        );
      case 'monster':
        return (
          <>
            <path d="M30 32 Q24 16 30 10 Q34 20 40 27 Z" fill="#fff8ec" {...s} />
            <path d="M70 32 Q76 16 70 10 Q66 20 60 27 Z" fill="#fff8ec" {...s} />
          </>
        );
      default:
        return null;
    }
  })();

  /* ---------- ตา ---------- */
  const eyeY = frog ? 30 : 55;
  const eyeX = frog ? [33, 67] : [37, 63];
  const eyes = robot ? (
    <>
      <rect x="27" y="44" width="46" height="24" rx="10" fill={INK} />
      <ellipse cx="39" cy="56" rx="5.5" ry="6" fill="#5ccbff" />
      <ellipse cx="61" cy="56" rx="5.5" ry="6" fill="#5ccbff" />
      <circle cx="41" cy="53.5" r="2" fill="#fff" />
      <circle cx="63" cy="53.5" r="2" fill="#fff" />
    </>
  ) : (
    <>
      {panda && (
        <>
          <ellipse cx="36" cy="55" rx="9.5" ry="11" fill={INK} transform="rotate(-18 36 55)" />
          <ellipse cx="64" cy="55" rx="9.5" ry="11" fill={INK} transform="rotate(18 64 55)" />
        </>
      )}
      {owl && (
        <>
          <circle cx="36" cy="54" r="13" fill="#fff8ec" {...s} />
          <circle cx="64" cy="54" r="13" fill="#fff8ec" {...s} />
        </>
      )}
      {frog && (
        <>
          <circle cx="33" cy="30" r="9" fill="#fff" />
          <circle cx="67" cy="30" r="9" fill="#fff" />
        </>
      )}
      {mood === 'sad' ? (
        <>
          <path d={`M${eyeX[0] - 6} ${eyeY} Q${eyeX[0]} ${eyeY + 5} ${eyeX[0] + 6} ${eyeY}`} fill="none" stroke={panda ? '#fff' : INK} strokeWidth={3} strokeLinecap="round" />
          <path d={`M${eyeX[1] - 6} ${eyeY} Q${eyeX[1]} ${eyeY + 5} ${eyeX[1] + 6} ${eyeY}`} fill="none" stroke={panda ? '#fff' : INK} strokeWidth={3} strokeLinecap="round" />
        </>
      ) : (
        eyeX.map((x, i) => (
          <g key={i}>
            <ellipse cx={x} cy={eyeY} rx={mood === 'wow' ? 7.5 : 6.5} ry={mood === 'wow' ? 8.5 : 7.5} fill={panda ? '#fff' : INK} />
            {panda && <ellipse cx={x} cy={eyeY + 0.5} rx="4.5" ry="5.5" fill={INK} />}
            <circle cx={x + 2.2} cy={eyeY - 2.6} r="2.7" fill="#fff" />
            <circle cx={x - 2.2} cy={eyeY + 2.8} r="1.2" fill="#fff" />
          </g>
        ))
      )}
    </>
  );

  /* ---------- ปาก ---------- */
  const mouthY = frog ? 52 : 67;
  const mouth = robot ? (
    <path d="M42 74 Q50 79 58 74" fill="none" stroke="#5ccbff" strokeWidth={3} strokeLinecap="round" />
  ) : beak ? (
    <path d={`M45 ${mouthY - 2} Q50 ${mouthY - 5} 55 ${mouthY - 2} Q53 ${mouthY + 5} 50 ${mouthY + 6} Q47 ${mouthY + 5} 45 ${mouthY - 2} Z`} fill="#ff9a3d" {...s} strokeWidth={2.2} />
  ) : mood === 'wow' ? (
    <ellipse cx="50" cy={mouthY + 2} rx="4.5" ry="5.5" fill={INK} />
  ) : mood === 'sad' ? (
    <path d={`M44 ${mouthY + 4} Q50 ${mouthY - 1} 56 ${mouthY + 4}`} fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
  ) : frog ? (
    <path d={`M36 ${mouthY} Q50 ${mouthY + 12} 64 ${mouthY}`} fill="#ff7d8c" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
  ) : (
    <>
      <path d={`M44 ${mouthY} Q47 ${mouthY + 5} 50 ${mouthY} Q53 ${mouthY + 5} 56 ${mouthY}`} fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      {c.ear === 'monster' && <path d={`M47 ${mouthY + 2} L48.5 ${mouthY + 6} L50 ${mouthY + 2.5}`} fill="#fff" stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />}
    </>
  );

  return (
    <svg viewBox={crop ? CROP[crop] : '0 0 100 100'} width={size} height={size} className={className} role="img" aria-label={c.name} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={g} cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor={c.light} />
          <stop offset="65%" stopColor={c.body} />
          <stop offset="100%" stopColor={c.dark} />
        </radialGradient>
      </defs>

      {/* เงาที่พื้น */}
      <ellipse cx="50" cy="96" rx="26" ry="3.5" fill={INK} opacity="0.15" />

      {g0 && <OutfitBack id={g0.o} />}

      {/* เท้า */}
      <ellipse cx="38" cy="91" rx="8" ry="5" fill={penguin ? '#ff9a3d' : c.dark} {...s} />
      <ellipse cx="62" cy="91" rx="8" ry="5" fill={penguin ? '#ff9a3d' : c.dark} {...s} />

      {ears}

      {/* แขน (ข้างขวาโบกได้) */}
      {!robot && (
        <>
          <ellipse cx="15" cy="68" rx="6" ry="9" fill={c.dark} {...s} transform="rotate(25 15 68)" />
          <g className={wave ? 'l5g-av-wave' : undefined} style={{ transformOrigin: '84px 66px' }}>
            <ellipse cx="85" cy="68" rx="6" ry="9" fill={c.dark} {...s} transform="rotate(-25 85 68)" />
          </g>
        </>
      )}

      {/* ลำตัว */}
      {robot ? (
        <rect x="16" y="24" width="68" height="68" rx="24" fill={fill} {...s} />
      ) : (
        <path d="M50 24 C74 24 87 40 87 60 C87 80 72 92 50 92 C28 92 13 80 13 60 C13 40 26 24 50 24 Z" fill={fill} {...s} />
      )}
      {penguin && <path d="M50 36 C66 36 74 48 74 62 C74 78 64 88 50 88 C36 88 26 78 26 62 C26 48 34 36 50 36 Z" fill={c.belly} />}
      {!robot && !penguin && <ellipse cx="50" cy="80" rx="20" ry="10" fill={c.belly} opacity="0.85" />}
      {(c.ear === 'bear' || c.ear === 'fox') && <ellipse cx="50" cy="69" rx="11" ry="7.5" fill={c.belly} />}

      {g0 && <OutfitFront id={g0.o} robot={robot} />}

      {/* ประกายบนหัว */}
      {!robot && <ellipse cx="36" cy="34" rx="7" ry="3.5" fill="#fff" opacity="0.45" transform="rotate(-20 36 34)" />}

      {eyes}

      {/* แก้ม */}
      {!robot && (
        <>
          <ellipse cx="25" cy={frog ? 48 : 66} rx="6.5" ry="4" fill="#ff7fae" opacity="0.5" />
          <ellipse cx="75" cy={frog ? 48 : 66} rx="6.5" ry="4" fill="#ff7fae" opacity="0.5" />
        </>
      )}

      {mouth}

      {g0 && <MaskArt id={g0.m} a={an} />}
      {g0 && <HatArt id={g0.h} a={an} />}
      {g0 && g0.i > 0 && (
        <g className={wave ? 'l5g-av-wave' : undefined} style={{ transformOrigin: '84px 66px' }}>
          <ItemArt id={g0.i} a={an} />
        </g>
      )}
    </svg>
  );
}
