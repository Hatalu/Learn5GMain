'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ALL_SUBJECTS, MediaItem, Subject } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { SUBJECT_STYLE } from '@/lib/utils/subject';
import { cn } from '@/lib/utils/cn';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { CountUp } from '@/components/fx/CountUp';
import { hasMembership } from '@/lib/membership';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gamepad2,
  Gift,
  Layers,
  Pause,
  Play,
} from 'lucide-react';
import {
  CrownArt,
  EnglishArt,
  HeroDecor,
  MathArt,
  OrbitArt,
  ScienceArt,
  Spark,
} from './HeroArt';
import { JoinButton } from '@/components/membership/JoinButton';

const SLIDE_MS = 7000;
const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61594556657667';

interface HeroCarouselProps {
  media: MediaItem[];
  isLoading: boolean;
  selectedSubjects: Subject[];
  onPickSubject: (subject: Subject) => void;
  onSelectMedia: (media: MediaItem) => void;
  onBrowseAll: () => void;
}

interface SlideDef {
  key: string;
  label: string;
  bg: string;
  backdrop?: React.ReactNode;
  content: React.ReactNode;
  art: React.ReactNode;
}

const SUBJECT_SLIDE: Record<
  Subject,
  { bg: string; title: string; desc: string; Art: () => JSX.Element }
> = {
  คณิตศาสตร์: {
    bg: 'from-emerald-500 via-teal-600 to-sky-700',
    title: 'ตะลุยโลกคณิตศาสตร์',
    desc: 'ตัวเลข รูปทรง และเวลา ฝึกคิดเป็นขั้นตอนผ่านเกมผจญภัย',
    Art: MathArt,
  },
  วิทยาศาสตร์: {
    bg: 'from-sky-500 via-blue-600 to-indigo-700',
    title: 'นักสำรวจวิทยาศาสตร์',
    desc: 'ทดลอง สังเกต และค้นพบความลับของโลกรอบตัว',
    Art: ScienceArt,
  },
  ภาษาอังกฤษ: {
    bg: 'from-amber-400 via-orange-500 to-violet-600',
    title: 'ผจญภัยภาษาอังกฤษ',
    desc: 'คำศัพท์ ประโยค และ Tenses ฝึกผ่านภารกิจสนุกๆ',
    Art: EnglishArt,
  },
};

/** ข้อความที่ค่อยๆ ลอยขึ้นตอนสไลด์เปิด (หน่วงเวลาตาม d) */
function Rise({ d = 0, className, children }: { d?: number; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('hero-reveal', className)} style={{ '--d': `${d}ms` } as React.CSSProperties}>
      {children}
    </div>
  );
}

function SlideFrame({
  active,
  label,
  children,
}: {
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // สไลด์ที่ซ่อนอยู่ต้องกด Tab เข้าไม่ได้
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) el.removeAttribute('inert');
    else el.setAttribute('inert', '');
  }, [active]);

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      aria-label={label}
      aria-hidden={!active}
      data-active={active}
      className={cn(
        'hero-slide relative [grid-area:1/1] transition-[opacity,transform] duration-700 ease-out',
        active ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-[1.02] pointer-events-none z-0'
      )}
    >
      {children}
    </div>
  );
}

const eyebrowCls =
  'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur text-white text-sm font-semibold border border-white/25';
const titleCls = 'mt-4 text-3xl sm:text-5xl font-medium text-white leading-tight';
const descCls = 'mt-3 text-base sm:text-lg text-white/85 max-w-xl';
const ctaCls =
  'btn-jelly inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-indigo-700 font-bold text-base shadow-[0_5px_0_0_rgba(0,0,0,0.2)]';
const ghostCls =
  'btn-jelly inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 text-white font-bold text-base border-2 border-white/30 hover:bg-white/20';

export function HeroCarousel({
  media,
  isLoading,
  selectedSubjects,
  onPickSubject,
  onSelectMedia,
  onBrowseAll,
}: HeroCarouselProps) {
  const { user, profile } = useAuth();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  /* ---------------- ข้อมูลประกอบสไลด์ ---------------- */
  const total = media.length;
  const gameCount = media.filter((m) => m.media_type === 'เกม').length;
  const latest = media.length
    ? [...media].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : null;
  const premiumActive = hasMembership(profile);

  const slides: SlideDef[] = [];

  // 1) ยินดีต้อนรับ
  slides.push({
    key: 'welcome',
    label: 'ยินดีต้อนรับ',
    bg: 'from-indigo-600 via-indigo-700 to-violet-600',
    art: <OrbitArt />,
    content: (
      <>
        <Rise>
          <span className={eyebrowCls}>
            <Spark className="w-3.5 h-3.5 text-sun-300" />
            คลังเกมและสื่อการเรียนรู้ ป.1 - ป.6
          </span>
        </Rise>
        <Rise d={90}>
          <h1 className={titleCls}>
            เล่นสนุก{' '}
            <span className="relative inline-block text-sun-300">
              เรียนรู้จริง
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-sun-300/80" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2 8 Q 25 1 50 7 T 100 7 T 150 7 T 198 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
        </Rise>
        <Rise d={180}>
          <p className={descCls}>เลือกวิชาที่อยากผจญภัย แล้วกดเล่นได้เลย</p>
        </Rise>
        <Rise d={270}>
          <div className="mt-6 flex flex-wrap gap-2.5" role="group" aria-label="เลือกวิชา">
            {ALL_SUBJECTS.map((subject) => {
              const active = selectedSubjects.includes(subject);
              return (
                <button
                  key={subject}
                  type="button"
                  onClick={() => onPickSubject(subject)}
                  aria-pressed={active}
                  className={cn(
                    'btn-jelly inline-flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full text-sm font-bold border-2 transition-colors',
                    active
                      ? 'bg-white text-indigo-700 border-white shadow-lg'
                      : 'bg-white/10 text-white border-white/30 hover:bg-white/20'
                  )}
                >
                  <span
                    className={cn(
                      'w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shadow-inner',
                      SUBJECT_STYLE[subject].gradient
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
        </Rise>
        <Rise d={360}>
          <dl className="mt-6 flex flex-wrap gap-3">
            {[
              { icon: Layers, label: 'สื่อทั้งหมด', value: total },
              { icon: Gamepad2, label: 'เกม', value: gameCount },
              { icon: Gift, label: 'ทดลองเล่นได้', value: total },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-black/15 backdrop-blur border border-white/15">
                <Icon className="w-5 h-5 text-sun-300" aria-hidden="true" />
                <dt className="sr-only">{label}</dt>
                <dd className="text-white leading-tight">
                  <span className="block font-display text-xl">{isLoading ? '-' : <CountUp value={value} />}</span>
                  <span className="block text-xs text-white/75">{label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </Rise>
      </>
    ),
  });

  // 2) สื่อมาใหม่ล่าสุด
  if (!isLoading && latest) {
    slides.push({
      key: 'latest',
      label: 'มาใหม่ล่าสุด',
      bg: 'from-gray-950 via-indigo-950 to-violet-950',
      backdrop: (
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <Image src={latest.icon_url} alt="" fill sizes="100vw" className="object-cover opacity-35 blur-2xl animate-kenburns" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-gray-950/60 to-transparent" />
        </div>
      ),
      art: (
        <div className="relative w-[80%] max-w-[330px] aspect-square">
          <div className="absolute -inset-5 rounded-[2.5rem] bg-[conic-gradient(from_0deg,#8660fb,#f53d9b,#ffc53a,#2fd196,#8660fb)] opacity-80 blur-2xl animate-[spin_10s_linear_infinite]" />
          <div className="relative h-full rotate-[-4deg]">
            <button
              type="button"
              onClick={() => onSelectMedia(latest)}
              className="group relative block h-full w-full rounded-[2rem] overflow-hidden ring-4 ring-white/85 shadow-2xl animate-float-slow"
              aria-label={`ดูรายละเอียด ${latest.title}`}
            >
              <Image src={latest.icon_url} alt={latest.title} fill sizes="330px" className="object-cover transition-transform duration-700 group-hover:scale-110" />
              <span className="card-shine-auto" />
            </button>
          </div>
          <span className="absolute -top-3 -right-3 rotate-12 px-4 py-2 rounded-2xl bg-sun-400 text-indigo-950 font-display text-lg shadow-lg ring-4 ring-white animate-wiggle">
            มาใหม่
          </span>
        </div>
      ),
      content: (
        <>
          <Rise>
            <span className={eyebrowCls}>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-mint-400" />
              </span>
              สื่อมาใหม่ล่าสุด
            </span>
          </Rise>
          <Rise d={90} className="flex items-center gap-4">
            <div className="md:hidden relative w-20 h-20 shrink-0 mt-4 rounded-2xl overflow-hidden ring-2 ring-white/70">
              <Image src={latest.icon_url} alt="" fill sizes="80px" className="object-cover" />
            </div>
            <h2 className={cn(titleCls, 'line-clamp-2')}>{latest.title}</h2>
          </Rise>
          <Rise d={180}>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-white text-gray-900">
                <span
                  className={cn('w-2.5 h-2.5 rounded-full bg-gradient-to-br', SUBJECT_STYLE[latest.subject]?.gradient)}
                  aria-hidden="true"
                />
                {latest.subject}
              </span>
              {latest.grade_level?.map((g) => (
                <span key={g} className="px-3 py-1 rounded-full text-sm font-semibold bg-white/15 text-white">
                  {g}
                </span>
              ))}
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-white/15 text-white">{latest.media_type}</span>
            </div>
          </Rise>
          {latest.description && (
            <Rise d={260}>
              <p className={cn(descCls, 'line-clamp-2')}>{latest.description}</p>
            </Rise>
          )}
          <Rise d={340}>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => onSelectMedia(latest)} className={ctaCls}>
                <Play className="w-5 h-5 fill-current" />
                เล่นเลย
              </button>
              <button type="button" onClick={onBrowseAll} className={ghostCls}>
                ดูสื่อทั้งหมด
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </Rise>
        </>
      ),
    });
  }

  // 3) สไลด์ประจำวิชา (เฉพาะวิชาที่มีสื่อแล้ว)
  if (!isLoading) {
    ALL_SUBJECTS.forEach((subject) => {
      const items = media.filter((m) => m.subject === subject);
      if (items.length === 0) return;
      const cfg = SUBJECT_SLIDE[subject];
      const Art = cfg.Art;
      slides.push({
        key: `subject-${subject}`,
        label: subject,
        bg: cfg.bg,
        art: <Art />,
        content: (
          <>
            <Rise>
              <span className={eyebrowCls}>
                <Spark className="w-3.5 h-3.5 text-white" />
                วิชา{subject}
              </span>
            </Rise>
            <Rise d={90}>
              <h2 className={titleCls}>{cfg.title}</h2>
            </Rise>
            <Rise d={180}>
              <p className={descCls}>{cfg.desc}</p>
            </Rise>
            <Rise d={270}>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex -space-x-3">
                  {items.slice(0, 3).map((m) => (
                    <div key={m.id} className="relative w-12 h-12 rounded-2xl overflow-hidden ring-[3px] ring-white shadow-md">
                      <Image src={m.icon_url} alt="" fill sizes="48px" className="object-cover" />
                    </div>
                  ))}
                </div>
                <span className="text-white font-semibold">
                  <span className="font-display text-2xl">{items.length}</span> สื่อพร้อมเล่น
                </span>
              </div>
            </Rise>
            <Rise d={360}>
              <div className="mt-6">
                <button type="button" onClick={() => onPickSubject(subject)} className={ctaCls}>
                  ไปเล่น{subject}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </Rise>
          </>
        ),
      });
    });
  }

  // 4) Premium
  slides.push({
    key: 'premium',
    label: 'สมัครสมาชิก',
    bg: 'from-gray-950 via-indigo-950 to-violet-900',
    art: <CrownArt />,
    content: (
      <>
        <Rise>
          <span className={cn(eyebrowCls, 'text-sun-300 border-sun-400/40')}>
            <Crown className="w-4 h-4" />
            สมัครสมาชิก
          </span>
        </Rise>
        <Rise d={90}>
          <h2 className={titleCls}>
            {user && premiumActive ? (
              <>
                คุณปลดล็อก<span className="text-sun-300">ทุกเกม</span>แล้ว
              </>
            ) : (
              <>
                ปลดล็อก<span className="text-sun-300">ทุกเกม</span>ในคลัง
              </>
            )}
          </h2>
        </Rise>
        <Rise d={180}>
          <p className={descCls}>
            {user && premiumActive
              ? 'เลือกเกมที่ชอบ แล้วเริ่มผจญภัยได้ทันที'
              : 'ทุกเกมเล่นเต็มรูปแบบได้เฉพาะสมาชิก ลองเล่นฟรี 5 นาทีก่อนได้ทุกเกม หรือติดต่อสมัครทางเพจ สื่อการสอน 5G'}
          </p>
        </Rise>
        <Rise d={270}>
          <div className="mt-6 flex flex-wrap gap-3">
            {user && premiumActive ? (
              <button type="button" onClick={onBrowseAll} className={ctaCls}>
                <Play className="w-5 h-5 fill-current" />
                เลือกเกมเลย
              </button>
            ) : (
              <JoinButton className={cn(ctaCls, 'bg-sun-400 text-indigo-950')}>
                <Crown className="w-5 h-5" />
                สมัครสมาชิก
              </JoinButton>
            )}
          </div>
        </Rise>
      </>
    ),
  });

  /* ---------------- การควบคุม ---------------- */
  const count = slides.length;
  const active = index % count;
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);
  const next = () => go(active + 1);
  const prev = () => go(active - 1);

  const autoplay = !reducedMotion && !userPaused && count > 1;
  const paused = hovered;

  const handlePointerMove = (e: React.PointerEvent) => {
    const el = rootRef.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
    el.style.setProperty('--my', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
  };

  const handlePointerLeave = () => {
    setHovered(false);
    rootRef.current?.style.setProperty('--mx', '0');
    rootRef.current?.style.setProperty('--my', '0');
  };

  return (
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label="ป้ายแนะนำ สื่อการสอน 5G"
      onMouseEnter={() => setHovered(true)}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      onPointerDown={(e) => {
        if (e.pointerType !== 'mouse') touchStartX.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') next();
        if (e.key === 'ArrowLeft') prev();
      }}
      className="relative isolate overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border-2 border-white/20 shadow-toy-lg touch-pan-y select-none"
    >
      <div className="grid">
        {slides.map((s, i) => (
          <SlideFrame key={s.key} active={i === active} label={`${i + 1} จาก ${count}: ${s.label}`}>
            <div className={cn('absolute inset-0 bg-gradient-to-br', s.bg)} />
            {s.backdrop}
            <HeroDecor />
            {/* มือถือ: ภาพประกอบจางๆ มุมขวาล่าง (สไลด์ "มาใหม่" มีรูปย่อในเนื้อหาแล้ว) */}
            {s.key !== 'latest' && (
              <div className="md:hidden pointer-events-none absolute -right-6 bottom-14 w-44 h-44 opacity-35" aria-hidden="true">
                {s.art}
              </div>
            )}
            <div className="relative grid md:grid-cols-[1.15fr_0.85fr] items-center gap-6 px-6 pt-9 pb-24 sm:px-12 sm:pt-12 sm:pb-24 min-h-[460px]">
              <div className="min-w-0">{s.content}</div>
              <div className="hidden md:flex items-center justify-center h-[340px]">
                <div className="hero-parallax w-full h-full flex items-center justify-center">
                  <div className="hero-art w-full h-full max-w-[340px] flex items-center justify-center">{s.art}</div>
                </div>
              </div>
            </div>
          </SlideFrame>
        ))}
      </div>

      {/* แถบควบคุม */}
      <div className="absolute z-20 bottom-5 left-6 right-6 sm:left-12 sm:right-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => go(i)}
              aria-label={`ไปหน้า ${i + 1}: ${s.label}`}
              aria-current={i === active}
              className={cn(
                'relative h-2.5 rounded-full overflow-hidden bg-white/30 transition-all duration-500',
                i === active ? 'w-12' : 'w-2.5 hover:bg-white/60'
              )}
            >
              {i === active &&
                (autoplay ? (
                  <span
                    key={`${active}-${count}`}
                    className="hero-progress absolute inset-y-0 left-0 bg-white rounded-full"
                    style={{
                      animationDuration: `${SLIDE_MS}ms`,
                      animationPlayState: paused ? 'paused' : 'running',
                    }}
                    onAnimationEnd={next}
                  />
                ) : (
                  <span className="absolute inset-0 bg-white rounded-full" />
                ))}
            </button>
          ))}
          <span className="ml-2 hidden sm:inline text-sm font-semibold text-white/80 tabular-nums">
            {String(active + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!reducedMotion && (
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              aria-label={userPaused ? 'เล่นสไลด์อัตโนมัติ' : 'หยุดสไลด์อัตโนมัติ'}
              className="btn-jelly p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur"
            >
              {userPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
            </button>
          )}
          <button
            type="button"
            onClick={prev}
            aria-label="สไลด์ก่อนหน้า"
            className="btn-jelly p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="สไลด์ถัดไป"
            className="btn-jelly p-2.5 rounded-full bg-white text-indigo-700 shadow-md"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
