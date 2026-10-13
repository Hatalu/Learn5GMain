'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, Gamepad2, Lock, RotateCcw, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Navbar } from '@/components/navbar/Navbar';
import { Buddy } from '@/components/companion/Buddy';
import { StarIcon } from '@/components/companion/Stars';
import { useCompanion } from '@/components/companion/CompanionProvider';
import { Modal } from '@/components/ui/Modal';
import { CountUp } from '@/components/fx/CountUp';
import { Reveal } from '@/components/ui/Reveal';
import {
  BUDDY_COLORS,
  BUDDY_COLOR_HEX,
  BUDDY_NAME,
  BUDDY_STAGES,
  COLOR_LABEL,
  HATS,
  HAT_INFO,
  TIER_INFO,
  buddyStage,
  stickerTier,
  unlockedHats,
  type Hat,
  type StickerTier,
} from '@/lib/companion';
import { resetStore, setColor, setHat } from '@/lib/companion-store';
import { sfx } from '@/lib/sound';
import { cn } from '@/lib/utils/cn';

const FRAME: Record<number, string> = {
  1: 'border-white dark:border-gray-400',
  2: 'border-slate-300 shadow-[0_0_0_4px_rgba(203,213,225,0.55)]',
  3: 'border-sun-400 shadow-[0_0_0_5px_rgba(255,197,58,0.5)]',
};

export default function BuddyPage() {
  const { state, media, mediaLoaded } = useCompanion();
  const [confirmReset, setConfirmReset] = useState(false);

  const stars = state.stars;
  const stage = buddyStage(stars);
  const visitDays = state.visitDays.length;
  const hats = unlockedHats(stars, visitDays);
  const pct = stage.next ? Math.min(100, Math.round(((stars - stage.from) / (stage.next - stage.from)) * 100)) : 100;

  const stickers = useMemo(
    () =>
      media.map((m) => {
        const c = state.plays[m.id]?.c || 0;
        return { m, count: c, tier: stickerTier(c) as StickerTier };
      }),
    [media, state.plays]
  );
  const collected = stickers.filter((s) => s.tier > 0).length;
  const totalPlays = Object.values(state.plays).reduce((a, p) => a + p.c, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* ตัวละคร */}
        <section className="relative overflow-hidden rounded-[2rem] border-2 border-white/20 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-600 dark:from-indigo-800 dark:via-indigo-900 dark:to-violet-800 shadow-toy-lg p-5 sm:p-8 text-white">
          <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1.2px, transparent 0)', backgroundSize: '26px 26px' }} />
          <div className="relative grid sm:grid-cols-[auto_1fr] gap-6 items-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-white/10 p-5">
                <Buddy stage={stage.index} color={state.color} hat={state.hat as Hat} size={190} />
              </div>
            </div>
            <div>
              <p className="text-white/80 text-sm">คู่หูของเธอ</p>
              <h1 className="text-3xl sm:text-4xl font-medium leading-tight">
                {BUDDY_NAME} <span className="text-sun-300">· {stage.name}</span>
              </h1>

              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  { icon: <StarIcon className="w-6 h-6" />, label: 'ดาวสะสม', value: stars },
                  { icon: <CalendarDays className="w-6 h-6 text-sky-300" />, label: 'วันที่มาเยี่ยม', value: visitDays },
                  { icon: <Gamepad2 className="w-6 h-6 text-mint-400" />, label: 'ครั้งที่เล่น', value: totalPlays },
                  { icon: <ImageIcon className="w-6 h-6 text-pink-300" />, label: 'สติกเกอร์', value: collected },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/15 border border-white/15">
                    {s.icon}
                    <div className="leading-tight">
                      <CountUp value={s.value} className="block font-display text-xl" />
                      <span className="text-xs text-white/75">{s.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-semibold">{stage.name}</span>
                  <span className="text-white/80">{stage.next ? `อีก ${Math.max(0, stage.next - stars)} ดาวจะโตขึ้น` : 'โตเต็มที่แล้ว!'}</span>
                </div>
                <div className="h-3.5 rounded-full bg-black/25 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="ความคืบหน้าของตัวละคร">
                  <div className="h-full rounded-full bg-gradient-to-r from-sun-300 to-sun-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
                <ol className="mt-3 flex justify-between text-xs text-white/75">
                  {BUDDY_STAGES.map((s, i) => (
                    <li key={s.name} className={cn(i <= stage.index && 'text-sun-300 font-semibold')}>{s.name}</li>
                  ))}
                </ol>
              </div>
              <p className="mt-4 text-sm text-white/85">
                ได้ดาวจาก: เปิดเว็บทุกวัน +1, เล่นเกมใหม่ +2, เล่นซ้ำ +1, เกมประจำวัน +3
              </p>
            </div>
          </div>
        </section>

        {/* แต่งตัว */}
        <Reveal>
          <section aria-labelledby="dress-h" className="surface p-5 sm:p-6 shadow-toy">
            <h2 id="dress-h" className="text-2xl font-medium text-gray-900 dark:text-white mb-4">แต่งตัวให้{BUDDY_NAME}</h2>

            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">สี</p>
            <div className="flex flex-wrap gap-3 mb-6">
              {BUDDY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setColor(c);
                    sfx.sparkle();
                  }}
                  aria-label={`สี${COLOR_LABEL[c]}`}
                  aria-pressed={state.color === c}
                  className={cn('btn-jelly w-12 h-12 rounded-full border-4', state.color === c ? 'border-gray-900 dark:border-white scale-110' : 'border-white dark:border-gray-700')}
                  style={{ background: BUDDY_COLOR_HEX[c].body }}
                />
              ))}
            </div>

            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">เครื่องแต่งตัว</p>
            <div className="flex flex-wrap gap-3">
              {HATS.map((h) => {
                const open = hats.includes(h);
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={!open}
                    onClick={() => {
                      if (setHat(h)) sfx.sparkle();
                    }}
                    aria-pressed={state.hat === h}
                    className={cn(
                      'btn-jelly px-4 py-2.5 rounded-2xl border-2 text-sm font-semibold text-left',
                      state.hat === h ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200',
                      !open && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {!open && <Lock className="w-3.5 h-3.5" />}
                      {HAT_INFO[h].label}
                    </span>
                    {!open && <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">ปลดล็อก: {HAT_INFO[h].hint}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        </Reveal>

        {/* สมุดสติกเกอร์ */}
        <Reveal>
          <section aria-labelledby="album-h">
            <div className="flex flex-wrap items-end justify-between gap-2 mb-1">
              <h2 id="album-h" className="text-2xl font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-indigo-500" /> สมุดสะสมสติกเกอร์
              </h2>
              <p className="font-display text-indigo-600 dark:text-indigo-300">
                <CountUp value={collected} /> / {stickers.length}
              </p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              เล่นเกมครั้งแรกได้สติกเกอร์ เล่นครบ {TIER_INFO[2].need} ครั้งได้ระดับเงิน ครบ {TIER_INFO[3].need} ครั้งได้ระดับทอง (นับครั้งใหม่เมื่อห่างกัน 10 นาทีขึ้นไป)
            </p>

            {!mediaLoaded ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => <div key={i} className="aspect-square rounded-3xl bg-gray-200/70 dark:bg-gray-800/70 animate-pulse" />)}
              </div>
            ) : stickers.length === 0 ? (
              <p className="surface p-8 text-center text-gray-500">ยังไม่มีเกมในคลัง</p>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {stickers.map(({ m, count, tier }) => {
                  const next = tier === 3 ? null : tier === 2 ? TIER_INFO[3].need : tier === 1 ? TIER_INFO[2].need : TIER_INFO[1].need;
                  return (
                    <li key={m.id} className="text-center">
                      <div
                        className={cn(
                          'relative aspect-square rounded-3xl overflow-hidden border-4 bg-gray-100 dark:bg-gray-800 transition-transform hover:-translate-y-1 hover:rotate-[-2deg]',
                          tier ? FRAME[tier] : 'border-dashed border-gray-300 dark:border-gray-700'
                        )}
                      >
                        <Image src={m.icon_url} alt={tier ? m.title : 'สติกเกอร์ที่ยังไม่ได้'} fill sizes="200px" className={cn('object-cover', !tier && 'brightness-0 opacity-25 dark:opacity-40')} />
                        {!tier && (
                          <span className="absolute inset-0 flex items-center justify-center font-display text-4xl text-gray-400 dark:text-gray-500">?</span>
                        )}
                        {tier === 3 && <span className="card-shine-auto" />}
                        {tier > 0 && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-xs font-bold">
                            {TIER_INFO[tier].label}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug">{tier ? m.title : 'ยังไม่ได้รับ'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {tier === 3 ? `เล่น ${count} ครั้ง` : tier ? `เล่น ${count} ครั้ง · อีก ${next! - count} ครั้งได้ระดับถัดไป` : 'เล่นเกมนี้เพื่อรับสติกเกอร์'}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-5 text-center">
              <Link href="/home" className="btn-primary-grad btn-jelly inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-display">ไปเล่นเกมเพิ่ม</Link>
            </div>
          </section>
        </Reveal>

        <section className="surface p-5 text-sm text-gray-600 dark:text-gray-300">
          <p>ข้อมูลของ{BUDDY_NAME}และสติกเกอร์เก็บไว้ในเครื่องนี้เท่านั้น (ไม่ต้องสมัครสมาชิก และไม่ส่งไปที่ไหน) ถ้าเปลี่ยนเครื่องหรือล้างข้อมูลเบราว์เซอร์ จะเริ่มสะสมใหม่</p>
          <button type="button" onClick={() => setConfirmReset(true)} className="btn-jelly mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-semibold">
            <RotateCcw className="w-4 h-4" /> ล้างข้อมูลคู่หูในเครื่องนี้
          </button>
        </section>
      </main>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="ล้างข้อมูลคู่หู?">
        <p className="text-gray-700 dark:text-gray-300">ดาว สติกเกอร์ และการแต่งตัวทั้งหมดในเครื่องนี้จะถูกลบ และ{BUDDY_NAME}จะกลับไปเป็นไข่ <b className="text-rose-600">กู้คืนไม่ได้</b> (เหมาะเมื่อเครื่องนี้เปลี่ยนคนเล่น)</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setConfirmReset(false)} className="btn-jelly px-5 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200">ยกเลิก</button>
          <button
            onClick={() => {
              resetStore();
              setConfirmReset(false);
            }}
            className="btn-jelly px-5 py-3 rounded-2xl bg-rose-600 text-white font-semibold"
          >
            ล้างข้อมูล
          </button>
        </div>
      </Modal>
    </div>
  );
}
