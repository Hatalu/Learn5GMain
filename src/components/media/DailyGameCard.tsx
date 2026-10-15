'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { CalendarCheck2, Gift, PlayCircle, Play, Timer } from 'lucide-react';
import { useCompanion } from '@/components/companion/CompanionProvider';
import { useTrial } from '@/components/trial/TrialProvider';
import { StarIcon } from '@/components/companion/Stars';
import { MediaItem } from '@/types/database';
import { STAR_RULES, bkkParts, msUntilMidnight } from '@/lib/companion';
import { SubjectTag } from '@/components/media/SubjectTag';
import { cn } from '@/lib/utils/cn';

const two = (n: number) => String(n).padStart(2, '0');

function Countdown() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(msUntilMidnight(bkkParts()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  if (left === null) return <span className="opacity-0">00:00:00</span>;
  const s = Math.floor(left / 1000);
  const parts = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  return (
    <span className="inline-flex items-center gap-1 font-mono" aria-label={`เหลือเวลาอีก ${parts[0]} ชั่วโมง ${parts[1]} นาที`}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          <span className="px-1.5 py-0.5 rounded-lg bg-black/25 text-white tabular-nums">{two(p)}</span>
          {i < 2 && <span className="text-white/70">:</span>}
        </React.Fragment>
      ))}
    </span>
  );
}

/** การ์ด "เกมประจำวัน" บนหน้าหลัก: เปลี่ยนทุกวัน มีนับถอยหลังถึงเที่ยงคืน */
export function DailyGameCard({ onSelect }: { onSelect: (m: MediaItem) => void }) {
  const { daily, dailyPlayedToday, mediaLoaded, entitled } = useCompanion();
  const { openTrial } = useTrial();

  if (!mediaLoaded) {
    return <div className="h-56 rounded-[2rem] bg-gray-200/70 dark:bg-gray-800/70 animate-pulse" />;
  }
  if (!daily) {
    return (
      <section aria-labelledby="daily-h" className="relative isolate overflow-hidden rounded-[2rem] border-2 border-white/20 shadow-toy-lg bg-gradient-to-br from-slate-700 via-indigo-800 to-purple-900 dark:from-slate-800 dark:via-indigo-950 dark:to-purple-950 p-5 sm:p-7 text-white">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1.2px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="pointer-events-none absolute -right-10 -top-10 w-56 h-56 rounded-full bg-fuchsia-400/20 blur-3xl -z-10" />
        <div className="pointer-events-none absolute -left-10 -bottom-12 w-56 h-56 rounded-full bg-sky-400/15 blur-3xl -z-10" />

        <div className="grid sm:grid-cols-[auto_1fr] gap-5 sm:gap-8 items-center">
          {/* ภาพปฏิทินกำลังพักผ่อน */}
          <div className="relative mx-auto sm:mx-0 w-44 h-44 sm:w-52 sm:h-52 rotate-[-4deg] rounded-[1.75rem] ring-4 ring-white/30 shadow-2xl bg-gradient-to-br from-indigo-400/50 via-violet-400/40 to-fuchsia-400/40 overflow-hidden animate-float-slow">
            <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full" aria-hidden="true">
              <g className="animate-twinkle" style={{ transformOrigin: '40px 40px' }}>
                <path d="M40 24 L45 36 L58 40 L45 44 L40 56 L35 44 L22 40 L35 36 Z" fill="#ffe27a" />
              </g>
              <g className="animate-twinkle" style={{ transformOrigin: '164px 58px', animationDelay: '0.8s' }}>
                <path d="M164 46 L168 55 L178 58 L168 61 L164 70 L160 61 L150 58 L160 55 Z" fill="#ff9fd2" />
              </g>
              <circle cx="168" cy="150" r="3.5" fill="#bfe3ff" className="animate-twinkle" />
              <circle cx="30" cy="140" r="3" fill="#ffe27a" className="animate-twinkle" style={{ animationDelay: '1.2s' }} />
              {/* ปฏิทิน */}
              <rect x="42" y="56" width="116" height="104" rx="18" fill="#fff8ec" stroke="#2a2350" strokeWidth="5" />
              <path d="M42 74 a18 18 0 0 1 18 -18 h80 a18 18 0 0 1 18 18 v14 h-116 z" fill="#ff7a8c" stroke="#2a2350" strokeWidth="5" strokeLinejoin="round" />
              <rect x="70" y="42" width="10" height="26" rx="5" fill="#2a2350" />
              <rect x="120" y="42" width="10" height="26" rx="5" fill="#2a2350" />
              {/* หน้าตาง่วง */}
              <path d="M72 118 q9 8 18 0" fill="none" stroke="#2a2350" strokeWidth="5" strokeLinecap="round" />
              <path d="M110 118 q9 8 18 0" fill="none" stroke="#2a2350" strokeWidth="5" strokeLinecap="round" />
              <path d="M92 138 q8 6 16 0" fill="none" stroke="#2a2350" strokeWidth="5" strokeLinecap="round" />
              <circle cx="66" cy="134" r="7" fill="#ffb3c1" opacity="0.8" />
              <circle cx="134" cy="134" r="7" fill="#ffb3c1" opacity="0.8" />
              {/* Zzz */}
              <text x="140" y="44" fontSize="20" fontWeight="800" fill="#fff" className="animate-pulse">z</text>
              <text x="154" y="30" fontSize="26" fontWeight="800" fill="#fff" className="animate-pulse" style={{ animationDelay: '0.5s' }}>Z</text>
            </svg>
          </div>

          <div className="min-w-0 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span id="daily-h" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur border border-white/30 text-sm font-bold">
                <CalendarCheck2 className="w-4 h-4" /> เกมประจำวัน
              </span>
            </div>
            <h2 className="mt-3 text-2xl sm:text-4xl font-medium leading-tight">วันนี้ยังไม่มีเกมประจำวัน</h2>
            <p className="mt-1.5 text-white/85 max-w-xl mx-auto sm:mx-0">เกมเล่นง่ายๆ จบไว กำลังเตรียมมาให้ แวะมาดูใหม่เร็วๆ นี้นะ</p>
            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <Timer className="w-4 h-4" /> วันใหม่เริ่มใน <Countdown />
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }
  const m = daily.media;
  const freeToday = daily.unlock;

  return (
    <section aria-labelledby="daily-h" className="relative isolate overflow-hidden rounded-[2rem] border-2 border-white/25 shadow-toy-lg bg-gradient-to-br from-amber-400 via-orange-500 to-pink-600 dark:from-amber-600 dark:via-orange-700 dark:to-pink-800 p-5 sm:p-7 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.14]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1.2px, transparent 0)', backgroundSize: '24px 24px' }} />
      <div className="pointer-events-none absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/15 blur-2xl -z-10" />

      <div className="grid sm:grid-cols-[auto_1fr] gap-5 sm:gap-8 items-center">
        <button
          type="button"
          onClick={() => onSelect(m)}
          className="group relative mx-auto sm:mx-0 w-44 h-44 sm:w-52 sm:h-52 rotate-[-4deg] rounded-[1.75rem] overflow-hidden ring-4 ring-white/90 shadow-2xl animate-float-slow focus-visible:outline-offset-4"
          aria-label={`เปิดรายละเอียด ${m.title}`}
        >
          <Image src={m.icon_url} alt={m.title} fill sizes="208px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
          <span className="card-shine-auto" />
        </button>

        <div className="min-w-0 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span id="daily-h" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur border border-white/30 text-sm font-bold">
              <CalendarCheck2 className="w-4 h-4" /> เกมประจำวัน
            </span>
            {freeToday && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400 text-emerald-950 text-sm font-bold shadow-md animate-wiggle">
                <Gift className="w-4 h-4" /> แจกเล่นฟรีวันนี้
              </span>
            )}
          </div>

          <h2 className="mt-3 text-2xl sm:text-4xl font-medium leading-tight line-clamp-2">{m.title}</h2>
          <p className="mt-1.5 text-white/90 line-clamp-2 max-w-xl mx-auto sm:mx-0">
            {daily.note || m.description || 'เกมที่เลือกมาเล่นวันนี้ ห้ามพลาด!'}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <SubjectTag subject={m.subject} size="md" />
            {m.grade_level?.slice(0, 3).map((g) => (
              <span key={g} className="px-3 py-1 rounded-full text-sm font-semibold bg-white/20">{g}</span>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <button type="button" onClick={() => onSelect(m)} className="btn-jelly inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-orange-700 font-bold text-base shadow-[0_5px_0_0_rgba(0,0,0,0.2)]">
              <Play className="w-5 h-5 fill-current" /> เล่นเลย
            </button>
            <button type="button" onClick={() => openTrial(m)} className="btn-jelly inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/20 border-2 border-white/60 text-white font-bold text-base backdrop-blur">
              <PlayCircle className="w-5 h-5" /> ทดลองเล่น
            </button>
            {!entitled ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/20 text-sm font-semibold">
                <StarIcon className="w-5 h-5" /> สมาชิกรับโบนัส +{STAR_RULES.dailyGame} ดาว
              </span>
            ) : dailyPlayedToday ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/20 text-sm font-semibold">
                <StarIcon className="w-5 h-5" /> เล่นวันนี้แล้ว ได้โบนัสไปแล้ว
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/20 text-sm font-semibold">
                <StarIcon className="w-5 h-5" /> โบนัส +{STAR_RULES.dailyGame} ดาว
              </span>
            )}
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <Timer className="w-4 h-4" /> หมดเวลาใน <Countdown />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
