'use client';

import dynamic from 'next/dynamic';

/** โหลด three.js + MediaPipe เฉพาะตอนเล่นเกม AR (ไม่ถ่วงหน้าอื่น) */
export const ArGame = dynamic(() => import('./ArGame').then((m) => m.ArGame), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-[110] grid place-items-center bg-[#120c3a] text-white font-bold">กำลังเตรียมยานอวกาศ…</div>,
});
