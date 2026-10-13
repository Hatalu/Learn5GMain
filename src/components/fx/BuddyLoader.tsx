import React from 'react';
import { Buddy } from '@/components/companion/Buddy';

/** หน้าโหลดที่เป็นตัวละครเด้งดึ๋งๆ แทนวงกลมหมุนธรรมดา (ไม่พึ่ง state ใดๆ ใช้ได้ทุกที่) */
export function BuddyLoader({ label = 'กำลังโหลด...', fullscreen = true }: { label?: string; fullscreen?: boolean }) {
  return (
    <div className={`${fullscreen ? 'min-h-screen' : 'py-16'} flex flex-col items-center justify-center gap-3`} role="status" aria-live="polite">
      <div className="animate-bounce [animation-duration:0.9s]">
        <Buddy stage={1} size={96} animate={false} />
      </div>
      <p className="font-display text-indigo-600 dark:text-indigo-300 flex items-center gap-1">
        {label}
      </p>
    </div>
  );
}
