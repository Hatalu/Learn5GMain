'use client';

import React from 'react';
import type { FaceAnchor } from './AvatarGear';

/**
 * แฟชั่นชุดที่ 2 (หลายแนว เท่ ตลก สวย น่ารัก) ต่อท้ายของเดิมใน AvatarGear.tsx
 * ลำดับในแต่ละรายการต้องตรงกับชื่อที่ต่อท้ายใน GEAR_SLOTS (gear.ts) ห้ามสลับ
 */

const INK = '#2a2350';
const s = { stroke: INK, strokeWidth: 2.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const thin = { ...s, strokeWidth: 1.6 };

function starPath(cx: number, cy: number, r: number) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.5 : r;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `;
  }
  return d + 'Z';
}
const heartPath = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy + r * 0.9} C${cx - r * 1.5} ${cy - r * 0.1} ${cx - r * 0.9} ${cy - r * 1.3} ${cx} ${cy - r * 0.45} C${cx + r * 0.9} ${cy - r * 1.3} ${cx + r * 1.5} ${cy - r * 0.1} ${cx} ${cy + r * 0.9} Z`;

/* ================================ หมวก (ฐานหมวก 0,0 กว้าง ~±18) ================================ */

const beanie = (c: string, c2: string) => (
  <>
    <path d="M-18 0 Q-19 -24 0 -24 Q19 -24 18 0 Z" fill={c} {...s} />
    <rect x="-19" y="-6" width="38" height="7" rx="3" fill={c2} {...thin} />
    <path d="M-10 -6 L-10 -20 M-3 -6 L-3 -23 M4 -6 L4 -23 M11 -6 L11 -20" stroke={c2} strokeWidth="1.4" opacity="0.6" />
    <circle cx="0" cy="-26" r="5" fill={c2} {...thin} />
  </>
);
const beret = (c: string) => (
  <>
    <path d="M-20 -2 Q-24 -16 -6 -20 Q16 -24 22 -10 Q22 -2 12 0 Z" fill={c} {...s} />
    <path d="M2 -21 L4 -26" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
  </>
);
const cat = (c: string, inner: string) => (
  <>
    <path d="M-20 0 Q0 -8 20 0" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round" />
    <path d="M-18 -2 L-14 -22 L-4 -7 Z" fill={c} {...s} />
    <path d="M18 -2 L14 -22 L4 -7 Z" fill={c} {...s} />
    <path d="M-14 -5 L-13 -15 L-8 -7 Z M14 -5 L13 -15 L8 -7 Z" fill={inner} />
  </>
);

export const HATS2: (() => React.ReactNode)[] = [
  // หมวกไหมพรม ชมพู / ฟ้า
  () => beanie('#ff8fbf', '#fff'),
  () => beanie('#4fb3ff', '#ffd84a'),
  // หมวกเบเร่ต์ แดง / ดำ
  () => beret('#ff4d6d'),
  () => beret('#3a3358'),
  // ที่คาดหูแมว ชมพู / ดำ
  () => cat('#ffb0d9', '#ff7fae'),
  () => cat('#3a3358', '#ff7fae'),
  // หูกระต่ายคาดผม
  () => (
    <>
      <path d="M-20 0 Q0 -8 20 0" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="-8" cy="-22" rx="5.5" ry="17" fill="#fff" {...s} transform="rotate(-12 -8 -22)" />
      <ellipse cx="8" cy="-22" rx="5.5" ry="17" fill="#fff" {...s} transform="rotate(12 8 -22)" />
      <ellipse cx="-8" cy="-22" rx="2.4" ry="11" fill="#ffb0d9" transform="rotate(-12 -8 -22)" />
      <ellipse cx="8" cy="-22" rx="2.4" ry="11" fill="#ffb0d9" transform="rotate(12 8 -22)" />
    </>
  ),
  // หมวกทรงสูง
  () => (
    <>
      <ellipse cx="0" cy="-1" rx="24" ry="5" fill="#2a2350" {...s} />
      <path d="M-14 -2 L-13 -34 Q0 -38 13 -34 L14 -2 Z" fill="#3a3358" {...s} />
      <rect x="-14" y="-12" width="28" height="6" fill="#ff4d6d" {...thin} />
    </>
  ),
  // หมวกคาวบอย
  () => (
    <>
      <path d="M-30 -2 Q-26 4 0 3 Q26 4 30 -2 Q24 -6 14 -4 L12 -20 Q6 -26 0 -20 Q-6 -26 -12 -20 L-14 -4 Q-24 -6 -30 -2 Z" fill="#c98a4b" {...s} />
      <path d="M-13 -8 Q0 -5 13 -8" fill="none" stroke="#7a4a1f" strokeWidth="3" />
      <path d={starPath(0, -12, 3.4)} fill="#ffd84a" />
    </>
  ),
  // หมวกนิรภัย
  () => (
    <>
      <path d="M-20 0 Q-20 -24 0 -25 Q20 -24 20 0 Z" fill="#ffcf3f" {...s} />
      <rect x="-24" y="-3" width="48" height="5" rx="2" fill="#f5a50f" {...thin} />
      <path d="M0 -25 L0 -4" stroke="#f5a50f" strokeWidth="4" />
    </>
  ),
  // รัศมีนางฟ้า
  () => (
    <>
      <ellipse cx="0" cy="-16" rx="16" ry="5" fill="none" stroke="#ffd84a" strokeWidth="5" />
      <ellipse cx="0" cy="-16" rx="16" ry="5" fill="none" stroke={INK} strokeWidth="1.2" />
    </>
  ),
  // เขาปีศาจน้อย
  () => (
    <>
      <path d="M-14 -2 Q-22 -14 -16 -26 Q-14 -14 -6 -8 Z" fill="#ff4d6d" {...s} />
      <path d="M14 -2 Q22 -14 16 -26 Q14 -14 6 -8 Z" fill="#ff4d6d" {...s} />
    </>
  ),
  // หนวดเอเลี่ยน
  () => (
    <>
      <path d="M-6 -2 Q-12 -16 -16 -28 M6 -2 Q12 -16 16 -28" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="-16" cy="-30" r="5" fill="#7cf06b" {...thin} />
      <circle cx="16" cy="-30" r="5" fill="#7cf06b" {...thin} />
    </>
  ),
  // หมวกรับปริญญา
  () => (
    <>
      <path d="M-14 -2 L-14 -12 Q0 -6 14 -12 L14 -2 Q0 4 -14 -2 Z" fill="#3a3358" {...s} />
      <path d="M-28 -16 L0 -26 L28 -16 L0 -6 Z" fill="#3a3358" {...s} />
      <path d="M0 -16 L18 -12 L18 0" fill="none" stroke="#ffd84a" strokeWidth="2" />
      <circle cx="18" cy="2" r="3" fill="#ffd84a" {...thin} />
    </>
  ),
  // หมวกซานต้า
  () => (
    <>
      <path d="M-18 -4 Q-10 -30 10 -30 Q24 -26 28 -10 Q16 -20 14 -6 Z" fill="#ff4d6d" {...s} />
      <rect x="-21" y="-7" width="40" height="8" rx="4" fill="#fff" {...thin} />
      <circle cx="28" cy="-8" r="5" fill="#fff" {...thin} />
    </>
  ),
  // หมวกใบพัด
  () => (
    <>
      <path d="M-18 0 Q-18 -20 0 -20 Q18 -20 18 0 Z" fill="#ff4d6d" {...s} />
      <path d="M-18 0 Q-18 -20 0 -20 L0 0 Z" fill="#ffd84a" {...thin} />
      <rect x="-1.5" y="-28" width="3" height="8" fill={INK} />
      <ellipse cx="-9" cy="-29" rx="9" ry="2.6" fill="#4fb3ff" {...thin} />
      <ellipse cx="9" cy="-29" rx="9" ry="2.6" fill="#3fd6a8" {...thin} />
    </>
  ),
  // หมวกปีกกว้างซอมเบรโร
  () => (
    <>
      <ellipse cx="0" cy="-2" rx="34" ry="7" fill="#ffcf3f" {...s} />
      <path d="M-12 -4 Q-12 -28 0 -28 Q12 -28 12 -4 Z" fill="#ffcf3f" {...s} />
      <path d="M-12 -8 Q0 -4 12 -8" fill="none" stroke="#ff4d6d" strokeWidth="3" />
      <path d="M-28 -2 Q0 4 28 -2" fill="none" stroke="#3fd6a8" strokeWidth="2" />
    </>
  ),
  // หมวกบักเก็ต
  () => (
    <>
      <path d="M-24 2 L-16 -8 L16 -8 L24 2 Z" fill="#7cc242" {...s} />
      <path d="M-16 -8 Q-16 -24 0 -24 Q16 -24 16 -8 Z" fill="#9be36a" {...s} />
    </>
  ),
  // หมวกกบ (ตลก)
  () => (
    <>
      <path d="M-20 0 Q-20 -20 0 -20 Q20 -20 20 0 Z" fill="#5fc46a" {...s} />
      <circle cx="-10" cy="-20" r="7" fill="#fff" {...s} />
      <circle cx="10" cy="-20" r="7" fill="#fff" {...s} />
      <circle cx="-9" cy="-20" r="3" fill={INK} />
      <circle cx="11" cy="-20" r="3" fill={INK} />
      <path d="M-8 -8 Q0 -3 8 -8" fill="none" stroke={INK} strokeWidth="2" />
    </>
  ),
  // เปลือกไข่ (ตลก)
  () => (
    <path d="M-19 0 Q-20 -28 0 -30 Q20 -28 19 0 L13 -6 L8 0 L2 -7 L-4 0 L-9 -6 L-14 0 Z" fill="#fffbe8" {...s} />
  ),
  // ขนมปังปิ้ง (ตลก)
  () => (
    <>
      <path d="M-16 0 L-16 -18 Q-22 -22 -18 -28 Q-10 -34 0 -30 Q10 -34 18 -28 Q22 -22 16 -18 L16 0 Z" fill="#e8a85a" {...s} />
      <path d="M-12 -2 L-12 -18 Q-16 -22 -12 -25 Q-6 -28 0 -25 Q6 -28 12 -25 Q16 -22 12 -18 L12 -2 Z" fill="#ffe2a8" />
    </>
  ),
  // กรวยจราจร (ตลก)
  () => (
    <>
      <path d="M-14 0 L-3 -36 L3 -36 L14 0 Z" fill="#ff8a3d" {...s} />
      <path d="M-10 -12 L10 -12 L8 -19 L-8 -19 Z" fill="#fff" />
      <rect x="-20" y="-3" width="40" height="5" rx="2" fill="#ff8a3d" {...thin} />
    </>
  ),
  // มงกุฎเจ้าหญิง (สวย)
  () => (
    <>
      <path d="M-16 0 L-12 -12 L-6 -6 L0 -18 L6 -6 L12 -12 L16 0 Z" fill="#e8ecf5" {...s} />
      <circle cx="0" cy="-12" r="3" fill="#ff7fae" {...thin} />
      <circle cx="-8" cy="-4" r="1.8" fill="#5ccbff" />
      <circle cx="8" cy="-4" r="1.8" fill="#5ccbff" />
    </>
  ),
  // กิ๊บดอกไม้ใหญ่ (น่ารัก)
  () => (
    <g transform="translate(12 -8)">
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-6" rx="4.5" ry="6" fill="#ff9ec7" stroke={INK} strokeWidth="1.6" transform={`rotate(${a})`} />
      ))}
      <circle r="4" fill="#ffd84a" {...thin} />
    </g>
  ),
  // ผ้าคาดหัวนินจา (เท่)
  () => (
    <>
      <path d="M-20 -6 Q0 -12 20 -6 L20 2 Q0 -4 -20 2 Z" fill="#ff4d6d" {...s} />
      <path d="M20 -4 Q30 -2 34 6 M20 -2 Q28 4 28 12" fill="none" stroke="#ff4d6d" strokeWidth="4" strokeLinecap="round" />
      <rect x="-6" y="-9" width="12" height="7" rx="1.5" fill="#d4dcea" {...thin} />
    </>
  ),
  // หูฟังเกมเมอร์ (เท่)
  () => (
    <>
      <path d="M-22 4 Q-24 -26 0 -26 Q24 -26 22 4" fill="none" stroke={INK} strokeWidth="5" />
      <path d="M-22 4 Q-24 -26 0 -26 Q24 -26 22 4" fill="none" stroke="#9b6cf0" strokeWidth="2.6" />
      <rect x="-28" y="-4" width="10" height="16" rx="4" fill="#9b6cf0" {...s} />
      <rect x="18" y="-4" width="10" height="16" rx="4" fill="#9b6cf0" {...s} />
      <circle cx="-23" cy="4" r="2.2" fill="#5fffc8" />
      <circle cx="23" cy="4" r="2.2" fill="#5fffc8" />
    </>
  ),
  // หมวกแม่มด (สวย)
  () => (
    <>
      <path d="M-14 -2 L4 -40 Q8 -42 9 -36 L15 -2 Z" fill="#3a3358" {...s} />
      <ellipse cx="0" cy="-1" rx="25" ry="5.5" fill="#3a3358" {...s} />
      <rect x="-13" y="-10" width="27" height="5" fill="#ff7fae" {...thin} />
      <path d={starPath(9, -22, 3.2)} fill="#ffd84a" />
    </>
  ),
  // มงกุฎกระดาษปาร์ตี้ (ตลก)
  () => (
    <path d="M-16 0 L-16 -14 L-10 -8 L-4 -16 L2 -8 L8 -16 L14 -8 L16 -14 L16 0 Z" fill="#5ccbff" {...s} />
  ),
  // หมวกนักบิน (เท่)
  () => (
    <>
      <path d="M-20 4 Q-21 -22 0 -22 Q21 -22 20 4 Q14 -2 0 -2 Q-14 -2 -20 4 Z" fill="#a0601c" {...s} />
      <ellipse cx="-8" cy="-10" rx="7" ry="5" fill="#8fe3ff" {...s} />
      <ellipse cx="8" cy="-10" rx="7" ry="5" fill="#8fe3ff" {...s} />
    </>
  ),
  // หมวกช่างตัดผม/ฮิปฮอป กลับหลัง (เท่)
  () => (
    <>
      <path d="M-30 1 Q-22 -5 -8 -3 Q-20 4 -30 1 Z" fill="#3a3358" {...s} />
      <path d="M-18 1 Q-19 -22 0 -22 Q19 -22 18 1 Z" fill="#3a3358" {...s} />
      <path d={starPath(4, -12, 5)} fill="#ffd84a" />
    </>
  ),
  // หมวกไข่ดาว (ตลก)
  () => (
    <>
      <path d="M-20 0 Q-24 -10 -12 -14 Q-6 -24 6 -18 Q20 -20 20 -8 Q24 0 14 2 Z" fill="#fff" {...s} />
      <circle cx="0" cy="-8" r="6" fill="#ffcf3f" {...thin} />
    </>
  ),
  // มงกุฎหนาม เท่ ดำทอง
  () => (
    <>
      <path d="M-18 0 L-20 -16 L-12 -8 L-8 -22 L0 -10 L8 -22 L12 -8 L20 -16 L18 0 Z" fill="#3a3358" {...s} />
      <circle cx="0" cy="-5" r="3" fill="#ffd84a" {...thin} />
    </>
  ),
];

/* ================================ ชุด (ลำตัว y 62-98) ================================ */

const capeBack = (c: string, c2: string) => (
  <>
    <path d="M26 62 Q8 80 12 99 Q30 94 50 99 Q70 94 88 99 Q92 80 74 62 Z" fill={c} {...s} />
    <path d="M30 70 Q20 84 22 96 M70 70 Q80 84 78 96" fill="none" stroke={c2} strokeWidth="2" opacity="0.6" />
  </>
);
const capeFront = (c: string) => <path d="M26 69 Q50 80 74 69" fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" />;
const tie = (c: string, c2: string) => (
  <>
    <path d="M46 70 L54 70 L52 75 L48 75 Z" fill={c} {...thin} />
    <path d="M48 75 L52 75 L56 92 L50 97 L44 92 Z" fill={c} {...s} />
    <path d="M47 82 L54 79 M46 88 L55 85" stroke={c2} strokeWidth="1.8" />
  </>
);
const bow = (c: string) => (
  <>
    <path d="M50 75 L38 68 Q35 75 38 82 Z M50 75 L62 68 Q65 75 62 82 Z" fill={c} {...s} />
    <circle cx="50" cy="75" r="3.6" fill={c} {...thin} />
    <circle cx="42" cy="73" r="1.3" fill="#fff" />
    <circle cx="58" cy="77" r="1.3" fill="#fff" />
  </>
);
const wings = (c: string, c2: string, kind: 'angel' | 'bat' | 'fly') =>
  kind === 'angel' ? (
    <>
      <path d="M30 70 Q6 56 2 72 Q8 74 4 82 Q14 82 12 90 Q24 86 32 80 Z" fill={c} {...s} />
      <path d="M70 70 Q94 56 98 72 Q92 74 96 82 Q86 82 88 90 Q76 86 68 80 Z" fill={c} {...s} />
    </>
  ) : kind === 'bat' ? (
    <>
      <path d="M30 72 L4 60 Q8 70 2 76 Q12 76 10 86 Q20 80 30 84 Z" fill={c} {...s} />
      <path d="M70 72 L96 60 Q92 70 98 76 Q88 76 90 86 Q80 80 70 84 Z" fill={c} {...s} />
    </>
  ) : (
    <>
      <ellipse cx="18" cy="66" rx="14" ry="10" fill={c} {...s} transform="rotate(-25 18 66)" />
      <ellipse cx="20" cy="86" rx="10" ry="7" fill={c2} {...s} transform="rotate(20 20 86)" />
      <ellipse cx="82" cy="66" rx="14" ry="10" fill={c} {...s} transform="rotate(25 82 66)" />
      <ellipse cx="80" cy="86" rx="10" ry="7" fill={c2} {...s} transform="rotate(-20 80 86)" />
    </>
  );

export const OUTFITS2: { back?: () => React.ReactNode; front?: () => React.ReactNode }[] = [
  // ผ้าคลุม ม่วง / ดำทอง / ชมพู
  { back: () => capeBack('#9b6cf0', '#6a3cc4'), front: () => capeFront('#9b6cf0') },
  { back: () => capeBack('#3a3358', '#ffd84a'), front: () => capeFront('#ffd84a') },
  { back: () => capeBack('#ff9ec7', '#ff4d8f'), front: () => capeFront('#ff9ec7') },
  // ปีกนางฟ้า / ปีกค้างคาว / ปีกผีเสื้อ
  { back: () => wings('#fff', '#fff', 'angel') },
  { back: () => wings('#3a3358', '#3a3358', 'bat') },
  { back: () => wings('#ff9ec7', '#9b6cf0', 'fly') },
  // เป้จรวด (เท่)
  {
    back: () => (
      <>
        <rect x="14" y="62" width="12" height="26" rx="5" fill="#a9b3c9" {...s} />
        <rect x="74" y="62" width="12" height="26" rx="5" fill="#a9b3c9" {...s} />
        <path d="M16 88 L20 98 L24 88 Z M76 88 L80 98 L84 88 Z" fill="#ff8a3d" {...thin} />
      </>
    ),
  },
  // กระเป๋าเป้
  {
    back: () => <rect x="16" y="64" width="68" height="30" rx="10" fill="#ff6b7a" {...s} />,
    front: () => <path d="M36 66 L34 92 M64 66 L66 92" stroke="#c9354a" strokeWidth="4" strokeLinecap="round" />,
  },
  // เนกไท แดง / ฟ้าลาย
  { front: () => tie('#ff4d6d', '#c9354a') },
  { front: () => tie('#4fb3ff', '#fff') },
  // หูกระต่าย ม่วง / ลายจุดเหลือง
  { front: () => bow('#9b6cf0') },
  { front: () => bow('#ffcf3f') },
  // สร้อยมุก (สวย)
  {
    front: () => (
      <>
        {Array.from({ length: 11 }, (_, i) => {
          const a = Math.PI * (0.12 + (i / 10) * 0.76);
          return <circle key={i} cx={50 - Math.cos(a) * 24} cy={68 + Math.sin(a) * 9} r="2.6" fill="#fff8ff" {...thin} strokeWidth={1.1} />;
        })}
      </>
    ),
  },
  // สร้อยทองแร็ปเปอร์ (เท่)
  {
    front: () => (
      <>
        <path d="M28 68 Q50 90 72 68" fill="none" stroke="#f5a50f" strokeWidth="4" />
        <path d="M28 68 Q50 90 72 68" fill="none" stroke="#ffd84a" strokeWidth="2" strokeDasharray="3 2" />
        <circle cx="50" cy="83" r="6.5" fill="#ffd84a" {...s} />
        <path d="M47 83 L53 83 M50 80 L50 86" stroke="#f5a50f" strokeWidth="2" />
      </>
    ),
  },
  // พวงมาลัยดอกไม้ฮาวาย (น่ารัก)
  {
    front: () => (
      <>
        {Array.from({ length: 9 }, (_, i) => {
          const a = Math.PI * (0.1 + (i / 8) * 0.8);
          return <circle key={i} cx={50 - Math.cos(a) * 25} cy={69 + Math.sin(a) * 11} r="4.2" fill={['#ff7fae', '#ffd84a', '#9b6cf0'][i % 3]} {...thin} />;
        })}
      </>
    ),
  },
  // ห่วงยางเป็ด (ตลก)
  {
    front: () => (
      <>
        <ellipse cx="50" cy="88" rx="34" ry="10" fill="#ffd84a" {...s} />
        <ellipse cx="50" cy="86" rx="20" ry="5" fill="#fff6d6" {...thin} />
        <circle cx="80" cy="80" r="6" fill="#ffd84a" {...s} />
        <path d="M85 80 L91 81 L85 83 Z" fill="#ff8a3d" {...thin} />
        <circle cx="81" cy="78" r="1.2" fill={INK} />
      </>
    ),
  },
  // ผ้ากันเปื้อนเชฟ
  {
    front: () => (
      <>
        <path d="M36 66 Q50 72 64 66" fill="none" stroke="#fff" strokeWidth="2.6" />
        <path d="M30 71 L70 71 L80 84 Q74 92 50 94 Q26 92 20 84 Z" fill="#fff" {...s} />
        <rect x="44" y="80" width="12" height="8" rx="2" fill="#ff8fbf" {...thin} />
      </>
    ),
  },
  // สายสะพายนางงาม (สวย)
  {
    front: () => (
      <>
        <path d="M30 64 L74 94 L66 98 L22 70 Z" fill="#ff7fae" {...s} />
        <path d={starPath(52, 82, 5)} fill="#ffd84a" {...thin} />
      </>
    ),
  },
  // เข็มขัดคาราเต้ (เท่)
  {
    front: () => (
      <>
        <rect x="22" y="84" width="56" height="6" rx="2" fill="#3a3358" {...s} />
        <path d="M48 88 L42 98 M52 88 L58 98" stroke="#3a3358" strokeWidth="4" strokeLinecap="round" />
      </>
    ),
  },
  // ผ้ากันเปื้อนเด็กลายหัวใจ (น่ารัก)
  {
    front: () => (
      <>
        <path d="M27 68 Q50 63 73 68 Q78 88 50 93 Q22 88 27 68 Z" fill="#fff" {...s} />
        <path d={heartPath(50, 77, 5)} fill="#ff7fae" />
      </>
    ),
  },
  // เสื้อกั๊กนักสืบ
  {
    front: () => (
      <>
        <path d="M26 70 L44 70 L50 96 L28 92 Z M74 70 L56 70 L50 96 L72 92 Z" fill="#a0601c" {...s} />
        <circle cx="47" cy="80" r="1.6" fill="#ffd84a" />
        <circle cx="47" cy="87" r="1.6" fill="#ffd84a" />
      </>
    ),
  },
  // ตราดาวนายอำเภอ (เท่)
  {
    front: () => (
      <>
        <path d={starPath(38, 80, 9)} fill="#ffd84a" {...s} />
        <circle cx="38" cy="80" r="2.5" fill="#f5a50f" />
      </>
    ),
  },
  // เกราะทอง
  {
    front: () => (
      <>
        <path d="M22 71 Q50 63 78 71 Q81 85 71 92 Q50 96 29 92 Q19 85 22 71 Z" fill="#ffd84a" {...s} />
        <path d="M28 76 Q50 70 72 76" fill="none" stroke="#fff" strokeWidth="2" opacity="0.8" />
        <path d={starPath(50, 82, 6)} fill="#ff4d6d" {...thin} />
      </>
    ),
  },
  // ผ้าพันคอลายทาง แดงขาว
  {
    front: () => (
      <>
        <path d="M18 69 Q50 83 82 69 L83 77 Q50 91 17 77 Z" fill="#ff4d6d" {...s} />
        <path d="M30 73 L32 82 M44 76 L45 86 M58 76 L57 86 M71 73 L69 82" stroke="#fff" strokeWidth="3" />
        <path d="M61 77 L70 97 L60 98 L55 80 Z" fill="#ff4d6d" {...s} />
      </>
    ),
  },
  // เสื้อซูเปอร์ฮีโร่ ตราสายฟ้า
  {
    front: () => (
      <>
        <circle cx="50" cy="83" r="10" fill="#ffd84a" {...s} />
        <path d="M52 75 L45 84 L50 84 L47 92 L55 82 L50 82 Z" fill="#ff4d6d" {...thin} />
      </>
    ),
  },
  // ชุดชูชีพส้ม
  {
    front: () => (
      <>
        <path d="M26 68 L44 68 L46 96 L28 94 Z M74 68 L56 68 L54 96 L72 94 Z" fill="#ff8a3d" {...s} />
        <path d="M30 80 L44 80 M56 80 L70 80" stroke="#e8ecf5" strokeWidth="3" />
      </>
    ),
  },
  // ปลอกคอกระดิ่ง (น่ารัก)
  {
    front: () => (
      <>
        <path d="M24 68 Q50 80 76 68" fill="none" stroke="#ff4d6d" strokeWidth="5" strokeLinecap="round" />
        <circle cx="50" cy="79" r="5" fill="#ffd84a" {...s} />
        <path d="M46 80 L54 80" stroke={INK} strokeWidth="1.4" />
      </>
    ),
  },
  // โบว์ใหญ่หลังเอว (สวย)
  {
    back: () => (
      <>
        <path d="M50 86 L22 74 Q16 88 26 98 Z M50 86 L78 74 Q84 88 74 98 Z" fill="#ff9ec7" {...s} />
      </>
    ),
    front: () => <rect x="22" y="84" width="56" height="6" rx="3" fill="#ff9ec7" {...thin} />,
  },
  // ชุดคอสตูมไดโน หนามหลัง (ตลก)
  {
    back: () => (
      <>
        {[18, 28, 38].map((y, i) => (
          <path key={i} d={`M${20 - i * 2} ${y + 46} L${6 - i * 2} ${y + 42} L${14 - i * 2} ${y + 54} Z`} fill="#5fc46a" {...thin} />
        ))}
        {[18, 28, 38].map((y, i) => (
          <path key={`r${i}`} d={`M${80 + i * 2} ${y + 46} L${94 + i * 2} ${y + 42} L${86 + i * 2} ${y + 54} Z`} fill="#5fc46a" {...thin} />
        ))}
      </>
    ),
  },
  // ปกเสื้อกะลาสี (น่ารัก)
  {
    front: () => (
      <>
        <path d="M24 66 L50 84 L76 66 L72 80 L50 92 L28 80 Z" fill="#4a7bf0" {...s} />
        <path d="M30 72 L50 86 L70 72" fill="none" stroke="#fff" strokeWidth="2" />
        <path d="M50 86 L44 96 M50 86 L56 96" stroke="#ff4d6d" strokeWidth="4" strokeLinecap="round" />
      </>
    ),
  },
  // ผ้าคลุมไหล่ขนฟู (สวย)
  {
    front: () => (
      <>
        {Array.from({ length: 9 }, (_, i) => (
          <circle key={i} cx={20 + i * 7.5} cy={70 + Math.sin((i / 8) * Math.PI) * 8} r="6" fill="#fff4fa" {...thin} />
        ))}
      </>
    ),
  },
];

/* ================================ หน้ากาก (ตามตำแหน่งตา) ================================ */

function shades(a: FaceAnchor, fill: string, shape: 'rect' | 'cat' | 'round' | 'visor', frame = INK) {
  const [x1, x2] = a.eyes;
  const y = a.eyeY;
  const r = a.eyeR;
  const mid = (x1 + x2) / 2;
  if (shape === 'visor')
    return (
      <>
        <rect x={x1 - r - 6} y={y - r} width={x2 - x1 + (r + 6) * 2} height={r * 1.7} rx={r * 0.85} fill={fill} {...s} />
        <path d={`M${x1 - r} ${y - r * 0.3} L${x2 + r} ${y - r * 0.3}`} stroke="#fff" strokeWidth="2" opacity="0.6" />
      </>
    );
  return (
    <>
      <path d={`M${x1 + r} ${y - 1} Q${mid} ${y - 5} ${x2 - r} ${y - 1}`} fill="none" stroke={frame} strokeWidth="2.6" />
      {[x1, x2].map((x, i) =>
        shape === 'round' ? (
          <circle key={x} cx={x} cy={y} r={r + 2.5} fill={fill} {...s} stroke={frame} />
        ) : shape === 'cat' ? (
          <path key={x} d={i ? `M${x - r - 2} ${y - r * 0.5} L${x + r + 5} ${y - r - 3} Q${x + r + 2} ${y + r} ${x} ${y + r} Q${x - r - 2} ${y + r * 0.6} ${x - r - 2} ${y - r * 0.5} Z` : `M${x + r + 2} ${y - r * 0.5} L${x - r - 5} ${y - r - 3} Q${x - r - 2} ${y + r} ${x} ${y + r} Q${x + r + 2} ${y + r * 0.6} ${x + r + 2} ${y - r * 0.5} Z`} fill={fill} {...s} stroke={frame} />
        ) : (
          <rect key={x} x={x - r - 2.5} y={y - r + 0.5} width={(r + 2.5) * 2} height={r * 1.7} rx={2} fill={fill} {...s} stroke={frame} />
        )
      )}
    </>
  );
}

export const MASKS2: ((a: FaceAnchor) => React.ReactNode)[] = [
  // แว่นกันแดดสีชมพู / ทอง / เขียวนีออน
  (a) => shades(a, '#ff7fae', 'rect'),
  (a) => shades(a, '#ffd84a', 'round', '#f5a50f'),
  (a) => shades(a, '#7cf06b', 'rect'),
  // แว่นตาแมว (สวย)
  (a) => shades(a, '#ffffff55', 'cat', '#ff4d8f'),
  (a) => shades(a, '#2a2350', 'cat'),
  // แว่นไซเบอร์ (เท่)
  (a) => shades(a, '#5ccbff', 'visor'),
  (a) => shades(a, '#ff4d6d', 'visor'),
  // แว่นสามมิติ (ตลก)
  (a) => {
    const [x1, x2] = a.eyes;
    const r = a.eyeR;
    return (
      <>
        <rect x={x1 - r - 4} y={a.eyeY - r} width={x2 - x1 + (r + 4) * 2} height={r * 1.9} rx={2} fill="#fff" {...s} />
        <rect x={x1 - r} y={a.eyeY - r + 3} width={r * 2} height={r * 1.3} fill="#ff4d6d" opacity="0.8" />
        <rect x={x2 - r} y={a.eyeY - r + 3} width={r * 2} height={r * 1.3} fill="#4fb3ff" opacity="0.8" />
      </>
    );
  },
  // แว่นเนิร์ดติดเทป (ตลก)
  (a) => (
    <>
      {shades(a, '#ffffff33', 'rect')}
      <rect x={(a.eyes[0] + a.eyes[1]) / 2 - 3} y={a.eyeY - 4} width="6" height="6" fill="#fff" {...thin} />
    </>
  ),
  // ผ้าปิดตาโจรสลัด (เท่)
  (a) => (
    <>
      <path d={`M14 ${a.eyeY - 14} L86 ${a.eyeY + 4}`} stroke={INK} strokeWidth="2.4" />
      <ellipse cx={a.eyes[1]} cy={a.eyeY} rx={a.eyeR + 2} ry={a.eyeR + 1} fill={INK} {...s} />
    </>
  ),
  // จมูกตัวตลก (ตลก)
  (a) => <circle cx="50" cy={(a.eyeY + a.mouthY) / 2 + 1} r="5.5" fill="#ff4d6d" {...s} />,
  // จมูกหมู (ตลก)
  (a) => {
    const y = (a.eyeY + a.mouthY) / 2 + 1;
    return (
      <>
        <ellipse cx="50" cy={y} rx="7" ry="5" fill="#ffb0c8" {...s} />
        <ellipse cx="47.5" cy={y} rx="1.4" ry="2" fill={INK} />
        <ellipse cx="52.5" cy={y} rx="1.4" ry="2" fill={INK} />
      </>
    );
  },
  // หนวดม้วน (ตลก)
  (a) => {
    const y = a.mouthY - 2;
    return <path d={`M50 ${y} Q40 ${y - 6} 34 ${y} Q30 ${y + 6} 26 ${y} M50 ${y} Q60 ${y - 6} 66 ${y} Q70 ${y + 6} 74 ${y}`} fill="none" stroke="#5b3a29" strokeWidth="4" strokeLinecap="round" />;
  },
  // เคราขาว (ตลก)
  (a) => (
    <path d={`M28 ${a.mouthY - 4} Q30 ${a.mouthY + 18} 50 ${a.mouthY + 22} Q70 ${a.mouthY + 18} 72 ${a.mouthY - 4} Q60 ${a.mouthY + 4} 50 ${a.mouthY + 2} Q40 ${a.mouthY + 4} 28 ${a.mouthY - 4} Z`} fill="#fff" {...s} />
  ),
  // แก้มชมพูวิ้ง (น่ารัก)
  (a) => (
    <>
      {[a.eyes[0] - 4, a.eyes[1] + 4].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={a.eyeY + a.eyeR + 4} rx="6" ry="3.5" fill="#ff7fae" opacity="0.75" />
          <path d={starPath(x + 6, a.eyeY + a.eyeR - 1, 2.6)} fill="#fff" />
        </g>
      ))}
    </>
  ),
  // หนวดแมว (น่ารัก)
  (a) => {
    const y = a.mouthY - 3;
    return (
      <path
        d={`M34 ${y - 3} L16 ${y - 6} M34 ${y} L15 ${y + 1} M34 ${y + 3} L17 ${y + 8} M66 ${y - 3} L84 ${y - 6} M66 ${y} L85 ${y + 1} M66 ${y + 3} L83 ${y + 8}`}
        stroke={INK}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    );
  },
  // ลายเสือ (เท่)
  (a) => (
    <path d={`M16 ${a.eyeY - 6} L26 ${a.eyeY - 3} L16 ${a.eyeY} M16 ${a.eyeY + 6} L24 ${a.eyeY + 8} M84 ${a.eyeY - 6} L74 ${a.eyeY - 3} L84 ${a.eyeY} M84 ${a.eyeY + 6} L76 ${a.eyeY + 8}`} fill="none" stroke="#ff8a3d" strokeWidth="3" strokeLinecap="round" />
  ),
  // หน้ากากผีเสื้อ (สวย)
  (a) => {
    const [x1, x2] = a.eyes;
    const y = a.eyeY;
    const r = a.eyeR;
    return (
      <>
        <path d={`M50 ${y} Q${x1 - r - 10} ${y - r - 12} ${x1 - r - 8} ${y + 2} Q${x1 - 4} ${y + r + 6} 50 ${y + 3} Z`} fill="#c8b8ff" {...s} />
        <path d={`M50 ${y} Q${x2 + r + 10} ${y - r - 12} ${x2 + r + 8} ${y + 2} Q${x2 + 4} ${y + r + 6} 50 ${y + 3} Z`} fill="#c8b8ff" {...s} />
        <circle cx={x1} cy={y} r={r * 0.55} fill={INK} />
        <circle cx={x2} cy={y} r={r * 0.55} fill={INK} />
      </>
    );
  },
  // ผ้าปิดตาตอนนอน (ตลก)
  (a) => (
    <>
      <rect x={a.eyes[0] - a.eyeR - 7} y={a.eyeY - a.eyeR - 1} width={a.eyes[1] - a.eyes[0] + (a.eyeR + 7) * 2} height={a.eyeR * 2 + 2} rx={a.eyeR} fill="#9b6cf0" {...s} />
      {a.eyes.map((x) => (
        <path key={x} d={`M${x - 5} ${a.eyeY} Q${x} ${a.eyeY + 4} ${x + 5} ${a.eyeY}`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      ))}
    </>
  ),
  // พลาสเตอร์ติดแก้ม (เท่)
  (a) => (
    <g transform={`rotate(-20 ${a.eyes[1] + 4} ${a.eyeY + a.eyeR + 4})`}>
      <rect x={a.eyes[1] - 4} y={a.eyeY + a.eyeR + 1} width="16" height="6" rx="3" fill="#ffd6a8" {...thin} />
      <rect x={a.eyes[1] + 2} y={a.eyeY + a.eyeR + 1.5} width="4" height="5" fill="#f5c08a" />
    </g>
  ),
  // ฟันแวมไพร์ (ตลก)
  (a) => (
    <path d={`M44 ${a.mouthY} L46 ${a.mouthY + 6} L48 ${a.mouthY} M52 ${a.mouthY} L54 ${a.mouthY + 6} L56 ${a.mouthY}`} fill="#fff" {...thin} />
  ),
  // แว่นVR (เท่)
  (a) => (
    <>
      <path d={`M12 ${a.eyeY - 2} L88 ${a.eyeY - 2}`} stroke={INK} strokeWidth="4" />
      <rect x={a.eyes[0] - a.eyeR - 6} y={a.eyeY - a.eyeR - 3} width={a.eyes[1] - a.eyes[0] + (a.eyeR + 6) * 2} height={a.eyeR * 2 + 6} rx="5" fill="#e8ecf5" {...s} />
      <rect x={a.eyes[0] - a.eyeR - 2} y={a.eyeY - a.eyeR + 1} width={a.eyes[1] - a.eyes[0] + (a.eyeR + 2) * 2} height={a.eyeR * 2 - 2} rx="3" fill="#3a3358" />
      <circle cx={a.eyes[1] + 2} cy={a.eyeY - 3} r="1.6" fill="#5fffc8" />
    </>
  ),
  // ลายหน้าสายรุ้ง (สวย)
  (a) => (
    <>
      {['#ff4d6d', '#ffd84a', '#3fd6a8', '#4fb3ff'].map((c, i) => (
        <path key={c} d={`M${a.eyes[0] - 10} ${a.eyeY + a.eyeR + 6 + i * 2.4} Q${a.eyes[0] - 2} ${a.eyeY + a.eyeR + 1 + i * 2.4} ${a.eyes[0] + 6} ${a.eyeY + a.eyeR + 6 + i * 2.4}`} fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
      ))}
    </>
  ),
  // กระ (น่ารัก)
  (a) => (
    <>
      {[a.eyes[0], a.eyes[1]].flatMap((x) => [-4, 0, 4].map((d) => <circle key={`${x}${d}`} cx={x + d} cy={a.eyeY + a.eyeR + 4 + (d === 0 ? 2 : 0)} r="1.2" fill="#c98a4b" />))}
    </>
  ),
  // แว่นดำน้ำ+ท่อหายใจ (ตลก)
  (a) => (
    <>
      {shades(a, '#8fe3ff88', 'visor')}
      <path d={`M${a.eyes[1] + a.eyeR + 6} ${a.eyeY} L${a.eyes[1] + a.eyeR + 10} ${a.eyeY - 26}`} stroke="#ff8a3d" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  // หน้ากากกระดาษหัวใจ (สวย)
  (a) => (
    <>
      {a.eyes.map((x) => (
        <path key={x} d={heartPath(x, a.eyeY, a.eyeR + 4)} fill="none" stroke="#ff4d8f" strokeWidth="2.6" />
      ))}
    </>
  ),
  // โมโนเคิล (เท่)
  (a) => (
    <>
      <circle cx={a.eyes[1]} cy={a.eyeY} r={a.eyeR + 3} fill="#ffffff33" stroke="#ffd84a" strokeWidth="2.6" />
      <path d={`M${a.eyes[1] + a.eyeR + 2} ${a.eyeY + 3} Q${a.eyes[1] + a.eyeR + 6} ${a.eyeY + 20} ${a.eyes[1] + 2} ${a.eyeY + 30}`} fill="none" stroke="#ffd84a" strokeWidth="1.4" />
    </>
  ),
  // แว่นพิกเซล (เท่)
  (a) => (
    <>
      <rect x={a.eyes[0] - a.eyeR - 4} y={a.eyeY - 3} width={a.eyes[1] - a.eyes[0] + (a.eyeR + 4) * 2} height="3" fill={INK} />
      {a.eyes.map((x) => (
        <g key={x}>
          <rect x={x - a.eyeR - 2} y={a.eyeY - 3} width={(a.eyeR + 2) * 2} height="6" fill={INK} />
          <rect x={x - a.eyeR + 1} y={a.eyeY + 3} width={(a.eyeR + 2) * 2 - 6} height="3" fill={INK} />
          <rect x={x - a.eyeR + 1} y={a.eyeY - 2} width="3" height="3" fill="#fff" />
        </g>
      ))}
    </>
  ),
  // แว่นดาราสีม่วง (สวย)
  (a) => shades(a, '#b48cff', 'round', '#6a3cc4'),
  // ขอบตาแพนด้า (น่ารัก)
  (a) => (
    <>
      {a.eyes.map((x, i) => (
        <ellipse key={x} cx={x} cy={a.eyeY + 1} rx={a.eyeR + 3} ry={a.eyeR + 4.5} fill="#3a3358" opacity="0.85" transform={`rotate(${i ? -20 : 20} ${x} ${a.eyeY})`} />
      ))}
    </>
  ),
  // ลายนักรบ (เท่)
  (a) => (
    <path d={`M${a.eyes[0] - 10} ${a.eyeY + a.eyeR + 3} L${a.eyes[0] + 6} ${a.eyeY + a.eyeR + 3} M${a.eyes[0] - 8} ${a.eyeY + a.eyeR + 8} L${a.eyes[0] + 4} ${a.eyeY + a.eyeR + 8} M${a.eyes[1] - 6} ${a.eyeY + a.eyeR + 3} L${a.eyes[1] + 10} ${a.eyeY + a.eyeR + 3} M${a.eyes[1] - 4} ${a.eyeY + a.eyeR + 8} L${a.eyes[1] + 8} ${a.eyeY + a.eyeR + 8}`} stroke="#ff4d6d" strokeWidth="3" strokeLinecap="round" />
  ),
];

/* ================================ ของถือ (มือ = 0,0 ชี้ขึ้น) ================================ */

const saber = (c: string) => (
  <>
    <rect x="-3" y="-52" width="6" height="44" rx="3" fill={c} {...thin} />
    <rect x="-1.4" y="-50" width="2.8" height="40" rx="1.4" fill="#fff" />
    <rect x="-3.6" y="-9" width="7.2" height="16" rx="2" fill="#a9b3c9" {...s} />
  </>
);
const balloon = (c: string) => (
  <>
    <path d="M0 4 Q-5 -10 2 -20 Q8 -30 2 -40" fill="none" stroke={INK} strokeWidth="1.4" />
    <path d={heartPath(3, -52, 11)} fill={c} {...s} />
  </>
);
const flag = (c: string, c2: string) => (
  <>
    <rect x="-1.8" y="-48" width="3.6" height="56" rx="1.6" fill="#a9b3c9" {...thin} />
    <path d="M1.8 -46 L28 -46 L28 -28 L1.8 -28 Z" fill={c} {...s} />
    <path d={starPath(15, -37, 5)} fill={c2} />
  </>
);

export const ITEMS2: (() => React.ReactNode)[] = [
  // ดาบเลเซอร์ ฟ้า / แดง / เขียว (เท่)
  () => saber('#4fb3ff'),
  () => saber('#ff4d6d'),
  () => saber('#7cf06b'),
  // ลูกโป่งหัวใจ ชมพู / ม่วง (น่ารัก)
  () => balloon('#ff7fae'),
  () => balloon('#9b6cf0'),
  // ไอศกรีม (น่ารัก)
  () => (
    <>
      <path d="M-8 -26 L0 4 L8 -26 Z" fill="#e8a85a" {...s} />
      <circle cx="0" cy="-30" r="9" fill="#ffb0d9" {...s} />
      <circle cx="0" cy="-42" r="7" fill="#8fe3ff" {...s} />
      <circle cx="0" cy="-51" r="3" fill="#ff4d6d" {...thin} />
    </>
  ),
  // ร่ม (สวย)
  () => (
    <>
      <path d="M0 8 L0 -36" stroke={INK} strokeWidth="2.6" />
      <path d="M0 8 Q4 12 6 6" fill="none" stroke={INK} strokeWidth="2.4" />
      <path d="M-24 -34 Q0 -60 24 -34 Q18 -38 12 -34 Q6 -38 0 -34 Q-6 -38 -12 -34 Q-18 -38 -24 -34 Z" fill="#ff7fae" {...s} />
    </>
  ),
  // ช่อดอกไม้ (สวย)
  () => (
    <>
      <path d="M-4 6 L0 -20 L4 6 Z" fill="#7cc242" {...s} />
      {[
        [-8, -26, '#ff7fae'],
        [6, -28, '#ffd84a'],
        [-1, -36, '#9b6cf0'],
        [9, -38, '#ff4d6d'],
      ].map(([x, y, c], i) => (
        <circle key={i} cx={x as number} cy={y as number} r="6.5" fill={c as string} {...thin} />
      ))}
    </>
  ),
  // ปลา (ตลก)
  () => (
    <g transform="rotate(-70)">
      <ellipse cx="22" cy="0" rx="20" ry="9" fill="#5ccbff" {...s} />
      <path d="M2 0 L-10 -8 L-10 8 Z" fill="#5ccbff" {...s} />
      <circle cx="34" cy="-2" r="2" fill={INK} />
    </g>
  ),
  // ไก่ยาง (ตลก)
  () => (
    <>
      <path d="M-3 6 Q-6 -20 -2 -44 Q2 -50 6 -44 Q8 -20 3 6 Z" fill="#ffe066" {...s} />
      <path d="M-2 -48 L-6 -52 L-2 -54 L0 -58 L3 -53 Z" fill="#ff4d6d" {...thin} />
      <path d="M6 -42 L12 -40 L6 -38 Z" fill="#ff8a3d" {...thin} />
    </>
  ),
  // แครอท (ตลก)
  () => (
    <>
      <path d="M-6 -30 L0 6 L6 -30 Z" fill="#ff8a3d" {...s} />
      <path d="M0 -30 Q-8 -42 -6 -46 M0 -30 Q0 -44 2 -48 M0 -30 Q8 -40 9 -44" fill="none" stroke="#4fb04a" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  // ไมโครโฟน (เท่)
  () => (
    <>
      <path d="M-3 6 L-4 -26 L4 -26 L3 6 Z" fill="#3a3358" {...s} />
      <circle cx="0" cy="-32" r="8" fill="#a9b3c9" {...s} />
      <path d="M-6 -34 L6 -34 M-6 -30 L6 -30" stroke="#8390ab" strokeWidth="1.4" />
    </>
  ),
  // กีตาร์ (เท่)
  () => (
    <g transform="rotate(-20)">
      <rect x="-2" y="-52" width="4" height="34" fill="#7a4a1f" {...thin} />
      <path d="M0 -20 Q-14 -20 -12 -8 Q-16 2 -8 8 Q0 12 8 8 Q16 2 12 -8 Q14 -20 0 -20 Z" fill="#ff4d6d" {...s} />
      <circle cx="0" cy="-6" r="3.6" fill={INK} />
    </g>
  ),
  // แว่นขยาย (นักสืบ)
  () => (
    <>
      <rect x="-2.6" y="-18" width="5.2" height="24" rx="2.4" fill="#7a4a1f" {...s} />
      <circle cx="0" cy="-30" r="12" fill="#8fe3ff55" {...s} strokeWidth={3} />
    </>
  ),
  // ดินสอยักษ์ (ตลก)
  () => (
    <>
      <path d="M-5 -40 L5 -40 L5 0 L0 8 L-5 0 Z" fill="#ffd84a" {...s} />
      <rect x="-5" y="-48" width="10" height="8" rx="2" fill="#ff9ec7" {...thin} />
      <path d="M-2 4 L0 8 L2 4 Z" fill={INK} />
    </>
  ),
  // พู่กันสีรุ้ง (สวย)
  () => (
    <>
      <rect x="-2.4" y="-36" width="4.8" height="44" rx="2" fill="#c98a4b" {...thin} />
      <path d="M-5 -36 Q0 -52 5 -36 Z" fill="#9b6cf0" {...s} />
    </>
  ),
  // สามง่ามเจ้าสมุทร (เท่)
  () => (
    <>
      <rect x="-2" y="-40" width="4" height="48" rx="2" fill="#ffd84a" {...thin} />
      <path d="M-12 -52 L-12 -38 Q0 -32 12 -38 L12 -52 M0 -56 L0 -40" fill="none" stroke="#ffd84a" strokeWidth="4" strokeLinecap="round" />
      <path d="M-12 -52 L-12 -38 Q0 -32 12 -38 L12 -52 M0 -56 L0 -40" fill="none" stroke={INK} strokeWidth="1.2" />
    </>
  ),
  // ตะหลิว (ตลก)
  () => (
    <>
      <rect x="-2" y="-30" width="4" height="38" rx="2" fill="#3a3358" {...thin} />
      <rect x="-9" y="-50" width="18" height="22" rx="4" fill="#a9b3c9" {...s} />
    </>
  ),
  // ไม้กวาดแม่มด
  () => (
    <>
      <rect x="-2" y="-30" width="4" height="40" rx="2" fill="#a0601c" {...thin} />
      <path d="M-10 -56 L10 -56 L4 -30 L-4 -30 Z" fill="#e8b878" {...s} />
    </>
  ),
  // โคมไฟ (สวย)
  () => (
    <>
      <path d="M0 6 L0 -20" stroke={INK} strokeWidth="2" />
      <rect x="-9" y="-40" width="18" height="22" rx="5" fill="#ffd84a" {...s} />
      <rect x="-5" y="-36" width="10" height="14" rx="3" fill="#fff6a8" />
      <path d="M-6 -42 L6 -42" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  // คบเพลิง (เท่)
  () => (
    <>
      <path d="M-3 6 L-5 -22 L5 -22 L3 6 Z" fill="#a0601c" {...s} />
      <path d="M0 -50 Q-12 -36 -6 -24 L6 -24 Q12 -36 0 -50 Z" fill="#ff8a3d" {...s} />
      <path d="M0 -40 Q-5 -32 -2 -26 L2 -26 Q5 -32 0 -40 Z" fill="#ffd84a" />
    </>
  ),
  // สายไหม (น่ารัก)
  () => (
    <>
      <rect x="-1.6" y="-20" width="3.2" height="28" fill="#fff" {...thin} />
      <circle cx="0" cy="-34" r="14" fill="#ffd1f0" {...s} />
      <circle cx="-5" cy="-38" r="5" fill="#a8d8ff" />
    </>
  ),
  // โดนัท (น่ารัก)
  () => (
    <>
      <rect x="-1.6" y="-14" width="3.2" height="22" fill="#fff" {...thin} />
      <circle cx="0" cy="-26" r="12" fill="#ff7fae" {...s} />
      <circle cx="0" cy="-26" r="4" fill="#fff" {...thin} />
    </>
  ),
  // ธงหัวใจ / ธงดาวฟ้า
  () => flag('#ff7fae', '#fff'),
  () => flag('#4fb3ff', '#ffd84a'),
  // พัดลมมือ (สวย)
  () => (
    <>
      <rect x="-1.6" y="-14" width="3.2" height="22" fill="#a0601c" {...thin} />
      <path d="M0 -14 L-22 -36 Q0 -54 22 -36 Z" fill="#ff9ec7" {...s} />
      <path d="M0 -14 L-11 -45 M0 -14 L0 -48 M0 -14 L11 -45" stroke="#fff" strokeWidth="1.4" />
    </>
  ),
  // กล้วย (ตลก)
  () => <path d="M-2 6 Q-14 -24 2 -46 Q4 -48 6 -44 Q-4 -24 6 4 Z" fill="#ffe066" {...s} />,
  // กระทะ (ตลก)
  () => (
    <>
      <rect x="-2.4" y="-24" width="4.8" height="32" rx="2" fill="#3a3358" {...thin} />
      <ellipse cx="0" cy="-36" rx="15" ry="13" fill="#5a5280" {...s} />
      <ellipse cx="-3" cy="-38" rx="6" ry="4" fill="#fff" opacity="0.25" />
    </>
  ),
  // สวิงจับแมลง
  () => (
    <>
      <rect x="-1.8" y="-30" width="3.6" height="38" rx="1.6" fill="#c98a4b" {...thin} />
      <ellipse cx="0" cy="-40" rx="11" ry="10" fill="#ffffff88" {...s} />
      <path d="M-8 -44 L8 -36 M-8 -36 L8 -44 M0 -50 L0 -30" stroke={INK} strokeWidth="0.8" opacity="0.5" />
    </>
  ),
  // หนังสือเวทมนตร์
  () => (
    <g transform="rotate(-10)">
      <rect x="-12" y="-36" width="24" height="30" rx="3" fill="#9b6cf0" {...s} />
      <path d={starPath(0, -21, 6)} fill="#ffd84a" />
    </g>
  ),
  // ขนมปังฝรั่งเศส (ตลก)
  () => (
    <g transform="rotate(-8)">
      <rect x="-6" y="-56" width="12" height="62" rx="6" fill="#e8a85a" {...s} />
      <path d="M-3 -46 L3 -40 M-3 -32 L3 -26 M-3 -18 L3 -12" stroke="#c98a4b" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  // คทาหัวใจ (สวย)
  () => (
    <>
      <rect x="-2" y="-34" width="4" height="42" rx="2" fill="#ff9ec7" {...thin} />
      <path d={heartPath(0, -42, 10)} fill="#ff4d8f" {...s} />
      <circle cx="-3" cy="-46" r="2" fill="#fff" opacity="0.8" />
    </>
  ),
];
