'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

/** โหลดเกม 3 มิติ (three.js) เฉพาะตอนเล่นโหมดนี้ โหมดอื่นจะได้ไม่ต้องโหลด */
export const EggGame = dynamic(() => import('./EggGame'), {
  ssr: false,
  loading: () => (
    <div className="l5g-run-center">
      <Loader2 className="w-10 h-10 animate-spin" />
      <p className="font-bold mt-2">กำลังสร้างโลกไข่ 10 ไบโอม…</p>
    </div>
  ),
});
