'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { CalendarCheck2, Gift, Play, Timer } from 'lucide-react';
import { useCompanion } from '@/components/companion/CompanionProvider';
import { StarIcon } from '@/components/companion/Stars';
import { MediaItem } from '@/types/database';
import { STAR_RULES, bkkParts, msUntilMidnight } from '@/lib/companion';
import { getSubjectBadge } from '@/lib/utils/subject';
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
  const { daily, dailyPlayedToday, mediaLoaded } = useCompanion();

  if (!mediaLoaded) {
    return <div className="h-56 rounded-[2rem] bg-gray-200/70 dark:bg-gray-800/70 animate-pulse" />;
  }
  if (!daily) return null;
  const m = daily.media;
  const premium = String(m.access_tier) !== 'free';
  const freeToday = daily.unlock && premium;

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
                <Gift className="w-4 h-4" /> ปลดล็อกฟรีเฉพาะวันนี้
              </span>
            )}
          </div>

          <h2 className="mt-3 text-2xl sm:text-4xl font-medium leading-tight line-clamp-2">{m.title}</h2>
          <p className="mt-1.5 text-white/90 line-clamp-2 max-w-xl mx-auto sm:mx-0">
            {daily.note || m.description || 'เกมที่เลือกมาเล่นวันนี้ ห้ามพลาด!'}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className={cn('px-3 py-1 rounded-full text-sm font-bold border bg-white', getSubjectBadge(m.subject))}>{m.subject}</span>
            {m.grade_level?.slice(0, 3).map((g) => (
              <span key={g} className="px-3 py-1 rounded-full text-sm font-semibold bg-white/20">{g}</span>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <button type="button" onClick={() => onSelect(m)} className="btn-jelly inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-orange-700 font-bold text-base shadow-[0_5px_0_0_rgba(0,0,0,0.2)]">
              <Play className="w-5 h-5 fill-current" /> เล่นเลย
            </button>
            {dailyPlayedToday ? (
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
