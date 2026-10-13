import React from 'react';
import { cn } from '@/lib/utils/cn';

interface AvatarSpec {
  label: string;
  bg: string;
  face: string;
  ear: 'round' | 'point' | 'long';
  earColor: string;
  inner: string;
  muzzle?: string;
  patch?: string;
  nose: string;
}

/** ตัวละครโปรไฟล์ของเด็ก (SVG ล้วน ไม่ใช้รูปถ่ายหรืออิโมจิ) */
export const AVATARS: Record<string, AvatarSpec> = {
  bear: { label: 'หมีน้อย', bg: '#ffd9c7', face: '#c98b5a', ear: 'round', earColor: '#c98b5a', inner: '#f2c4a0', muzzle: '#f2d2b0', nose: '#3a2418' },
  cat: { label: 'แมวเหมียว', bg: '#e8defe', face: '#ffb04d', ear: 'point', earColor: '#ffb04d', inner: '#ffd7a3', muzzle: '#fff0d9', nose: '#e0457b' },
  bunny: { label: 'กระต่ายน้อย', bg: '#ffe0ee', face: '#fff5fa', ear: 'long', earColor: '#fff5fa', inner: '#ffb5d3', nose: '#ff7aa8' },
  panda: { label: 'แพนด้า', bg: '#dcf7e8', face: '#ffffff', ear: 'round', earColor: '#2a2740', inner: '#2a2740', patch: '#2a2740', nose: '#2a2740' },
  fox: { label: 'จิ้งจอก', bg: '#fff0c9', face: '#ff7a3d', ear: 'point', earColor: '#ff7a3d', inner: '#2a2740', muzzle: '#fff3e6', nose: '#2a2740' },
  frog: { label: 'กบเขียว', bg: '#d6f4ff', face: '#5fd08a', ear: 'round', earColor: '#5fd08a', inner: '#ffffff', muzzle: '#b4eccb', nose: '#2f8d56' },
  owl: { label: 'นกฮูก', bg: '#efe4ff', face: '#9b7bf0', ear: 'point', earColor: '#7a58d8', inner: '#c9b6ff', patch: '#ffffff', nose: '#ffc53a' },
  penguin: { label: 'เพนกวิน', bg: '#d9efff', face: '#3b4a78', ear: 'round', earColor: '#3b4a78', inner: '#3b4a78', muzzle: '#ffffff', nose: '#ffa63a' },
};

export const AVATAR_KEYS = Object.keys(AVATARS);

export function Avatar({
  name = 'bear',
  size = 64,
  className,
  ring,
}: {
  name?: string | null;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  const a = AVATARS[name || 'bear'] || AVATARS.bear;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn('shrink-0 rounded-full', ring && 'ring-4 ring-white dark:ring-gray-800 shadow-md', className)}
      role="img"
      aria-label={a.label}
    >
      <rect width="100" height="100" fill={a.bg} />
      {/* หู */}
      {a.ear === 'round' && (
        <>
          <circle cx="24" cy="30" r="13" fill={a.earColor} />
          <circle cx="76" cy="30" r="13" fill={a.earColor} />
          <circle cx="24" cy="30" r="6.5" fill={a.inner} />
          <circle cx="76" cy="30" r="6.5" fill={a.inner} />
        </>
      )}
      {a.ear === 'point' && (
        <>
          <path d="M16 46 L22 12 L46 30 Z" fill={a.earColor} />
          <path d="M84 46 L78 12 L54 30 Z" fill={a.earColor} />
          <path d="M23 36 L25 20 L37 30 Z" fill={a.inner} />
          <path d="M77 36 L75 20 L63 30 Z" fill={a.inner} />
        </>
      )}
      {a.ear === 'long' && (
        <>
          <ellipse cx="34" cy="20" rx="9" ry="22" fill={a.earColor} />
          <ellipse cx="66" cy="20" rx="9" ry="22" fill={a.earColor} />
          <ellipse cx="34" cy="21" rx="4.5" ry="15" fill={a.inner} />
          <ellipse cx="66" cy="21" rx="4.5" ry="15" fill={a.inner} />
        </>
      )}
      {/* หน้า */}
      <ellipse cx="50" cy="58" rx="33" ry="30" fill={a.face} />
      {a.muzzle && <ellipse cx="50" cy="68" rx="15" ry="11" fill={a.muzzle} />}
      {a.patch && (
        <>
          <ellipse cx="35" cy="52" rx="8.5" ry="10.5" fill={a.patch} transform="rotate(-18 35 52)" />
          <ellipse cx="65" cy="52" rx="8.5" ry="10.5" fill={a.patch} transform="rotate(18 65 52)" />
        </>
      )}
      {/* ตา */}
      <circle cx="37" cy="53" r="4.6" fill={a.patch && a.patch !== '#ffffff' ? '#fff' : '#2a2740'} />
      <circle cx="63" cy="53" r="4.6" fill={a.patch && a.patch !== '#ffffff' ? '#fff' : '#2a2740'} />
      <circle cx="38.5" cy="51.5" r="1.5" fill={a.patch && a.patch !== '#ffffff' ? '#2a2740' : '#fff'} />
      <circle cx="64.5" cy="51.5" r="1.5" fill={a.patch && a.patch !== '#ffffff' ? '#2a2740' : '#fff'} />
      {/* จมูก + ยิ้ม */}
      <ellipse cx="50" cy="63" rx="4.4" ry="3.2" fill={a.nose} />
      <path d="M43 70 Q50 76 57 70" fill="none" stroke="#2a2740" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="27" cy="66" r="4.2" fill="#ff8fb3" opacity="0.45" />
      <circle cx="73" cy="66" r="4.2" fill="#ff8fb3" opacity="0.45" />
    </svg>
  );
}
