'use client';

import dynamic from 'next/dynamic';

/** โหลด three.js + MediaPipe เฉพาะตอนเล่น Magic Kingdom AR (ไม่ถ่วงหน้าอื่น) */
export const MagicGame = dynamic(() => import('./MagicGame').then((m) => m.MagicGame), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-[110] grid place-items-center bg-[#2a1660] text-white font-bold">กำลังเปิดประตูอาณาจักรเวทมนตร์…</div>,
});
