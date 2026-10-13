'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Volume2, X } from 'lucide-react';
import { Buddy } from './Buddy';
import { useCompanion } from './CompanionProvider';
import { BUDDY_NAME, CHATTER, CHATTER_LOCKED, bkkParts, buddyStage, buildGreeting, eventOf, phaseOf, type Hat } from '@/lib/companion';
import { sfx, speakThai } from '@/lib/sound';

type Mode = 'asleep' | 'awake';
const GREETED = 'l5g_greeted';
const HIDDEN = 'l5g_buddy_hidden';

/**
 * ปุ๋ง ตัวละครนำทางลอยมุมซ้ายล่าง: หลับอยู่ -> ตื่นมาทักทายตามเวลา/วันสำคัญ/เกมล่าสุด
 * ทักเต็มรูปแบบครั้งเดียวต่อรอบการเปิดเว็บ หน้าอื่นๆ เหลือแค่เดินเล่นอยู่มุมจอ
 */
export function CompanionWidget() {
  const path = usePathname();
  const { state, daily, mediaLoaded, dailyPlayedToday, visit, ready, entitled } = useCompanion();

  const [mode, setMode] = useState<Mode>('awake');
  const [waking, setWaking] = useState(false);
  const [lines, setLines] = useState<string[] | null>(null);
  const [hidden, setHidden] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const started = useRef(false);
  const chatIdx = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stars = state.stars;
  const stage = buddyStage(stars);

  useEffect(() => {
    try {
      setHidden(sessionStorage.getItem(HIDDEN) === '1');
    } catch {
      /* ignore */
    }
    if ('speechSynthesis' in window) {
      const check = () => setCanSpeak(window.speechSynthesis.getVoices().some((v) => v.lang?.toLowerCase().startsWith('th')));
      check();
      window.speechSynthesis.addEventListener?.('voiceschanged', check);
      return () => window.speechSynthesis.removeEventListener?.('voiceschanged', check);
    }
  }, []);

  const showLines = useCallback((l: string[], ms = 10000) => {
    setLines(l);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setLines(null), ms);
  }, []);

  // ลำดับตื่น: หลับ -> ตื่น (เด้ง + เสียงระฆัง) -> ทักทาย
  useEffect(() => {
    if (!ready || !visit || started.current) return;
    let greeted = false;
    try {
      greeted = sessionStorage.getItem(GREETED) === '1';
    } catch {
      /* ignore */
    }
    started.current = true;
    if (greeted) return; // เปิดหน้าอื่นต่อ ไม่ต้องตื่นซ้ำ

    setMode('asleep');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t1 = setTimeout(() => {
      setMode('awake');
      setWaking(true);
      sfx.wake();
      setTimeout(() => setWaking(false), 1000);

      const p = bkkParts();
      const g = buildGreeting({
        parts: p,
        phase: phaseOf(p.hour),
        event: eventOf(p),
        firstVisit: visit.firstEver,
        visitDays: state.visitDays.length,
        lastPlayed: state.lastPlayed ? { title: state.lastPlayed.title, day: state.lastPlayed.day } : null,
        dailyTitle: daily?.media.title ?? null,
        dailyPlayedToday,
        checkinStars: visit.checkinStars,
        stage: stage.index,
        locked: !entitled,
      });
      showLines(g, 11000);
      try {
        sessionStorage.setItem(GREETED, '1');
      } catch {
        /* ignore */
      }
    }, reduce ? 300 : 1700);
    return () => clearTimeout(t1);
    // รันครั้งเดียวเมื่อข้อมูลพร้อม
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, visit, mediaLoaded]);

  if (path.startsWith('/dev') || hidden || !ready) return null;

  const onTap = () => {
    if (lines) {
      setLines(null);
      return;
    }
    sfx.sparkle();
    setWaking(true);
    setTimeout(() => setWaking(false), 900);
    const pool = entitled ? CHATTER : CHATTER_LOCKED;
    const line = pool[chatIdx.current++ % pool.length];
    showLines([line], 8000);
  };

  const speak = () => {
    if (!lines) return;
    speakThai(lines.join(' '));
  };

  return (
    <div className="no-print fixed left-2 bottom-2 sm:left-4 sm:bottom-4 z-40 flex items-end gap-1 select-none">
      <div className="relative">
        {mode === 'asleep' && (
          <div className="absolute -top-2 right-0 text-indigo-500 dark:text-indigo-300 font-display text-lg pointer-events-none" aria-hidden="true">
            <span className="zzz inline-block">Z</span>
            <span className="zzz inline-block text-sm" style={{ animationDelay: '0.7s' }}>z</span>
          </div>
        )}
        <button
          type="button"
          onClick={onTap}
          aria-label={`${BUDDY_NAME} คู่หูของเธอ แตะเพื่อคุยด้วย`}
          className={`block rounded-full focus-visible:outline-offset-4 ${mode === 'asleep' ? 'buddy-snooze' : waking ? 'buddy-wake' : ''}`}
        >
          <Buddy
            stage={stage.index}
            color={state.color}
            hat={state.hat as Hat}
            size={typeof window !== 'undefined' && window.innerWidth < 640 ? 78 : 104}
            asleep={mode === 'asleep'}
            animate={mode === 'awake' && !waking}
          />
        </button>
      </div>

      {lines && mode === 'awake' && (
        <div
          role="status"
          className="bubble-in relative mb-10 max-w-[15rem] sm:max-w-[18rem] rounded-3xl rounded-bl-md bg-white dark:bg-gray-900 border-2 border-indigo-200 dark:border-indigo-800 shadow-toy px-4 py-3"
        >
          <button
            type="button"
            onClick={() => setLines(null)}
            aria-label="ปิดข้อความ"
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-700 flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {lines.map((l, i) => (
            <p key={i} className={i === 0 ? 'font-display text-gray-900 dark:text-white leading-snug' : 'text-sm text-gray-600 dark:text-gray-300 mt-1 leading-snug'}>
              {l}
            </p>
          ))}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Link href="/buddy" className="btn-jelly inline-flex items-center px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-200 text-sm font-bold">
              {entitled ? 'ห้องของฉัน' : 'ดูสิทธิ์สมาชิก'}
            </Link>
            {canSpeak && (
              <button type="button" onClick={speak} aria-label="ฟังเสียงพูด" className="btn-jelly p-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                <Volume2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.setItem(HIDDEN, '1');
                } catch {
                  /* ignore */
                }
                setHidden(true);
              }}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
            >
              ซ่อนไว้ก่อน
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
