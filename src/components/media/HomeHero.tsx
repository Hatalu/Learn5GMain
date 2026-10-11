'use client';

import React from 'react';
import { ALL_SUBJECTS, MediaItem, Subject } from '@/types/database';
import { SUBJECT_STYLE } from '@/lib/utils/subject';
import { cn } from '@/lib/utils/cn';
import { Gamepad2, Gift, Layers } from 'lucide-react';

interface HomeHeroProps {
  media: MediaItem[];
  selectedSubjects: Subject[];
  onToggleSubject: (subject: Subject) => void;
}

/** ดาว 4 แฉก (SVG) */
function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 0c.9 6.2 2.8 8.9 12 12-9.2 3.1-11.1 5.8-12 12-.9-6.2-2.8-8.9-12-12C9.2 8.9 11.1 6.2 12 0z"
        fill="currentColor"
      />
    </svg>
  );
}

export function HomeHero({ media, selectedSubjects, onToggleSubject }: HomeHeroProps) {
  const total = media.length;
  const freeCount = media.filter(
    (m) => String(m.access_tier || '').toLowerCase().trim() === 'free'
  ).length;
  const gameCount = media.filter((m) => m.media_type === 'เกม').length;

  const stats = [
    { icon: Layers, label: 'สื่อทั้งหมด', value: total },
    { icon: Gamepad2, label: 'เกม', value: gameCount },
    { icon: Gift, label: 'เล่นฟรี', value: freeCount },
  ];

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border-2 border-white/20 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-600 dark:from-indigo-800 dark:via-indigo-900 dark:to-violet-800 shadow-toy-lg px-5 py-8 sm:px-10 sm:py-12">
      {/* Decorative layer */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-28 right-0 w-96 h-96 rounded-full bg-violet-400/30 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #fff 1.2px, transparent 0)',
            backgroundSize: '26px 26px',
          }}
        />
        <Spark className="absolute top-6 right-[12%] w-7 h-7 text-sun-300 animate-twinkle" />
        <Spark className="absolute top-[38%] right-[4%] w-4 h-4 text-white animate-twinkle [animation-delay:1s]" />
        <Spark className="absolute bottom-8 left-[46%] w-5 h-5 text-mint-400 animate-twinkle [animation-delay:1.8s]" />
        {/* floating shapes */}
        <div className="hidden sm:block absolute right-10 bottom-8 animate-float">
          <svg width="92" height="92" viewBox="0 0 92 92">
            <circle cx="46" cy="46" r="28" fill="#ffc53a" />
            <ellipse cx="46" cy="46" rx="44" ry="11" fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="5" transform="rotate(-22 46 46)" />
            <circle cx="36" cy="38" r="6" fill="#fff" fillOpacity="0.45" />
          </svg>
        </div>
        <div className="hidden md:block absolute right-[26%] top-8 animate-float-slow">
          <svg width="54" height="54" viewBox="0 0 54 54">
            <rect x="8" y="8" width="38" height="38" rx="11" fill="#2fd196" transform="rotate(14 27 27)" />
          </svg>
        </div>
        <div className="hidden md:block absolute right-[8%] top-[46%] animate-float [animation-delay:1.2s]">
          <svg width="46" height="46" viewBox="0 0 46 46">
            <path d="M23 4 43 40H3z" fill="#5ccbff" strokeLinejoin="round" stroke="#5ccbff" strokeWidth="6" />
          </svg>
        </div>
      </div>

      <div className="relative max-w-2xl">
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur text-white text-sm font-semibold border border-white/25">
          <Spark className="w-3.5 h-3.5 text-sun-300" />
          คลังเกมและสื่อการเรียนรู้ ป.1 - ป.6
        </span>

        <h1 className="mt-4 text-3xl sm:text-5xl font-medium text-white leading-tight">
          เล่นสนุก{' '}
          <span className="relative inline-block text-sun-300">
            เรียนรู้จริง
            <svg
              className="absolute -bottom-2 left-0 w-full h-3 text-sun-300/80"
              viewBox="0 0 200 12"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M2 8 Q 25 1 50 7 T 100 7 T 150 7 T 198 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>
        </h1>

        <p className="mt-4 text-base sm:text-lg text-white/85 max-w-xl">
          เลือกวิชาที่อยากผจญภัย แล้วกดเล่นได้เลย
        </p>

        {/* Subject quick picks */}
        <div className="mt-6 flex flex-wrap gap-2.5" role="group" aria-label="เลือกวิชา">
          {ALL_SUBJECTS.map((subject) => {
            const active = selectedSubjects.includes(subject);
            const style = SUBJECT_STYLE[subject];
            return (
              <button
                key={subject}
                type="button"
                onClick={() => onToggleSubject(subject)}
                aria-pressed={active}
                className={cn(
                  'btn-jelly group inline-flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full text-sm font-bold border-2 transition-colors',
                  active
                    ? 'bg-white text-indigo-700 border-white shadow-lg'
                    : 'bg-white/10 text-white border-white/30 hover:bg-white/20'
                )}
              >
                <span
                  className={cn(
                    'w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shadow-inner',
                    style.gradient
                  )}
                  aria-hidden="true"
                >
                  {subject === 'คณิตศาสตร์' ? '+' : subject === 'วิทยาศาสตร์' ? 'S' : 'A'}
                </span>
                {subject}
              </button>
            );
          })}
        </div>

        {/* Stats */}
        <dl className="mt-7 flex flex-wrap gap-3">
          {stats.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-black/15 backdrop-blur border border-white/15"
            >
              <Icon className="w-5 h-5 text-sun-300" aria-hidden="true" />
              <dt className="sr-only">{label}</dt>
              <dd className="text-white leading-tight">
                <span className="block font-display text-xl">{value}</span>
                <span className="block text-xs text-white/75">{label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
