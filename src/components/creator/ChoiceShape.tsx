'use client';

import React from 'react';

/** สี + รูปทรงประจำตัวเลือก (ช่วยเด็กที่ยังอ่านไม่คล่องจับคู่ด้วยสี/รูป) */
export const CHOICE_STYLES = [
  { color: '#ff6b7a', dark: '#c9354a', name: 'สามเหลี่ยม' },
  { color: '#4a7bf0', dark: '#2a4fb8', name: 'ข้าวหลามตัด' },
  { color: '#ffcf3f', dark: '#c99a0f', name: 'วงกลม' },
  { color: '#3fd6a8', dark: '#169a72', name: 'สี่เหลี่ยม' },
  { color: '#9b6cf0', dark: '#6a3cc4', name: 'ดาว' },
  { color: '#ff9a3d', dark: '#c76512', name: 'หัวใจ' },
];

export const choiceStyle = (i: number) => CHOICE_STYLES[i % CHOICE_STYLES.length];

export function ChoiceShape({ i, size = 28, className }: { i: number; size?: number; className?: string }) {
  const k = i % 6;
  const p = { fill: '#fff', stroke: '#2a2350', strokeWidth: 3, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden="true">
      {k === 0 && <path d="M20 5 L36 33 L4 33 Z" {...p} />}
      {k === 1 && <path d="M20 3 L37 20 L20 37 L3 20 Z" {...p} />}
      {k === 2 && <circle cx="20" cy="20" r="15" {...p} />}
      {k === 3 && <rect x="6" y="6" width="28" height="28" rx="4" {...p} />}
      {k === 4 && <path d="M20 3 L25 14.5 L37.5 15.5 L28 23.8 L31 36 L20 29.5 L9 36 L12 23.8 L2.5 15.5 L15 14.5 Z" {...p} />}
      {k === 5 && <path d="M20 35 C8 26 3 19 3 12.5 C3 7.5 7 4 11.5 4 C15 4 18 6 20 9 C22 6 25 4 28.5 4 C33 4 37 7.5 37 12.5 C37 19 32 26 20 35 Z" {...p} />}
    </svg>
  );
}
