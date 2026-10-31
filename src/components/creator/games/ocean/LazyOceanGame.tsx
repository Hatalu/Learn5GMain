'use client';

import dynamic from 'next/dynamic';

/** โหลด three.js + MediaPipe เฉพาะตอนเล่น Ocean Guardian AR (ไม่ถ่วงหน้าอื่น) */
export const OceanGame = dynamic(() => import('./OceanGame').then((m) => m.OceanGame), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-[110] grid place-items-center bg-[#0f4f80] text-white font-bold">กำลังดำดิ่งสู่ใต้ทะเล…</div>,
});
