'use client';

import dynamic from 'next/dynamic';

/** โหลด three.js + MediaPipe เฉพาะตอนเล่น Ghost Hunter AR (ไม่ถ่วงหน้าอื่น) */
export const GhostGame = dynamic(() => import('./GhostGame').then((m) => m.GhostGame), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-[110] grid place-items-center bg-[#1a1240] text-white font-bold">กำลังเปิดไฟฉายล่าผี…</div>,
});
