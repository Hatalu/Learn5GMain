'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Buddy } from './Buddy';
import { StarIcon } from './Stars';
import { useCompanion } from './CompanionProvider';
import { Confetti } from '@/components/fx/Confetti';
import { CountUp } from '@/components/fx/CountUp';
import { BUDDY_NAME, TIER_INFO, buddyStage, type Hat } from '@/lib/companion';
import { sfx } from '@/lib/sound';

const FRAME: Record<number, string> = {
  1: 'border-white dark:border-gray-300',
  2: 'border-slate-300 shadow-[0_0_0_4px_rgba(203,213,225,0.5)]',
  3: 'border-sun-400 shadow-[0_0_0_5px_rgba(255,197,58,0.45)]',
};

/** หน้าต่างฉลองเมื่อได้สติกเกอร์/ตัวละครโต (รอจนผู้ใช้กลับมาที่แท็บนี้ก่อนค่อยแสดง) */
export function RewardModal() {
  const { rewards, dismissReward, state } = useCompanion();
  const [visible, setVisible] = useState(true);
  const r = rewards[0];

  useEffect(() => {
    const on = () => setVisible(document.visibilityState === 'visible');
    on();
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  useEffect(() => {
    if (r && visible) sfx.cheer();
  }, [r, visible]);

  if (!r || !visible) return null;

  const sticker = r.newSticker || r.tierUp;
  const tier = r.tierUp ? r.tierUp.tier : r.newSticker ? 1 : 0;
  const stage = buddyStage(state.stars);
  const title = r.evolved
    ? `${BUDDY_NAME}โตขึ้นแล้ว!`
    : r.tierUp
      ? `ได้สติกเกอร์${TIER_INFO[r.tierUp.tier].label.replace('ระดับ', 'ระดับ')}!`
      : r.newSticker
        ? 'ได้สติกเกอร์ใหม่!'
        : 'เยี่ยมมาก!';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-indigo-950/70 backdrop-blur-md animate-fade-in" role="dialog" aria-modal="true" aria-label={title}>
      <Confetti />
      <div className="relative w-full max-w-sm rounded-[2rem] bg-white dark:bg-gray-900 border-2 border-indigo-200 dark:border-indigo-800 shadow-toy-lg p-7 text-center animate-pop-in">
        <p className="font-display text-2xl sm:text-3xl text-gradient-brand">{title}</p>

        <div className="my-5 flex items-center justify-center gap-4">
          {sticker && (
            <div className={`relative w-28 h-28 rounded-3xl overflow-hidden border-4 rotate-[-6deg] animate-pop-in ${FRAME[tier] || FRAME[1]}`}>
              <Image src={sticker.icon} alt={sticker.title} fill sizes="112px" className="object-cover" />
            </div>
          )}
          {(r.evolved || !sticker) && <Buddy stage={r.evolved ? r.evolved.stage : stage.index} color={state.color} hat={state.hat as Hat} size={110} />}
        </div>

        {sticker && <p className="font-semibold text-gray-900 dark:text-white line-clamp-2">{sticker.title}</p>}
        {r.evolved && <p className="text-indigo-600 dark:text-indigo-300 font-semibold mt-1">เป็น &quot;{r.evolved.name}&quot; แล้ว!</p>}

        <p className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-sun-400/25 text-amber-800 dark:text-sun-300 font-display text-lg">
          <StarIcon className="w-6 h-6" /> +<CountUp value={r.starsGained} duration={700} /> ดาว
        </p>
        {r.dailyBonus && <p className="mt-2 text-sm text-emerald-700 dark:text-mint-400 font-semibold">รวมโบนัสเกมประจำวันแล้ว</p>}

        <div className="mt-6 flex flex-col gap-2">
          <button onClick={dismissReward} className="btn-primary-grad btn-jelly py-3 rounded-2xl font-display text-lg">เก๋ไปเลย</button>
          <Link href="/buddy" onClick={dismissReward} className="btn-jelly py-2.5 rounded-2xl text-indigo-700 dark:text-indigo-200 font-semibold">
            ดูสมุดสะสมของฉัน
          </Link>
        </div>
      </div>
    </div>
  );
}
