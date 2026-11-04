'use client';

import dynamic from 'next/dynamic';

/** โหลดตัวเกม Human Shape Builder เฉพาะตอนเล่น */
export const ShapeGame = dynamic(() => import('./ShapeGame').then((m) => m.ShapeGame), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-[110] grid place-items-center bg-[#5aa8ff] text-white font-bold">กำลังเตรียมลานกิจกรรม…</div>,
});
