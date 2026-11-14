'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { hasMembership } from '@/lib/membership';
import { PLANS, WELCOME_HOURS, WELCOME_PCT } from '@/lib/plans';
import { FREE_DESIGN_LIMIT } from '@/lib/game-creator/quota';
import { ANIMAL_PRESETS } from '@/lib/studio/char';
import { CharArt } from '@/components/studio/CharArt';
import { ChoiceShape } from '@/components/creator/ChoiceShape';
import { useMembership } from '@/components/membership/MembershipProvider';
import { leftText, type Contest, type Phase } from '@/lib/worksheet/contest';

/** ป้ายที่ปิดไว้: ซ่อน 24 ชั่วโมงแล้วกลับมาใหม่ */
const PROMO = 'l5g-promo-hidden';
const promoHidden = () => {
  try {
    return Number(localStorage.getItem(PROMO) || 0) > Date.now();
  } catch {
    return false;
  }
};
const hidePromo = () => {
  try {
    localStorage.setItem(PROMO, String(Date.now() + 24 * 3600 * 1000));
  } catch {
    /* โหมดส่วนตัว: ซ่อนแค่หน้านี้ */
  }
};

interface Slide {
  id: string;
  tag: string;
  title: string;
  desc: string;
  cta: string;
  href?: string;
  act?: () => void;
  bg: string;
  art: React.ReactNode;
}

const CTA =
  'mt-1 self-start inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-2xl border-[3px] border-[#2a2350] bg-white font-display text-sm sm:text-base shadow-[0_4px_0_#2a2350] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-transform';
const preset = (id: string) => ANIMAL_PRESETS.find((p) => p.id === id)?.look ?? ANIMAL_PRESETS[0].look;
const TEACHER = 'สำหรับคุณครู';

/* ---------------------------------------------------------------- ภาพประกอบ (SVG/ตัวละครของเว็บ ไม่ใช้อิโมจิ) */

function Paper({ className = '', tone = '#7c5cf0' }: { className?: string; tone?: string }) {
  return (
    <svg viewBox="0 0 120 150" className={className} aria-hidden="true">
      <rect x="4" y="4" width="112" height="142" rx="12" fill="#fff" stroke="#2a2350" strokeWidth="4" />
      <rect x="18" y="18" width="62" height="12" rx="6" fill={tone} />
      {[44, 60, 76].map((y) => (
        <rect key={y} x="18" y={y} width="84" height="6" rx="3" fill="#d9d3f5" />
      ))}
      <circle cx="30" cy="104" r="10" fill="#ffd166" stroke="#2a2350" strokeWidth="3" />
      <rect x="48" y="96" width="54" height="16" rx="8" fill="#a8f0d4" stroke="#2a2350" strokeWidth="3" />
      <path d="M20 130 h80" stroke="#2a2350" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
    </svg>
  );
}

function Spark({ className = '', c = '#fff' }: { className?: string; c?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill={c} />
    </svg>
  );
}

/** ถ้วยรางวัล + ใบงาน (กิจกรรมประกวด) */
const ArtContest = () => (
  <div className="relative w-full h-full">
    <Paper className="absolute right-[40%] top-[12%] w-[34%] rotate-[-10deg] drop-shadow-lg" tone="#e8456b" />
    <svg viewBox="0 0 120 130" className="absolute right-[6%] top-[10%] w-[52%] animate-float-slow drop-shadow-lg" aria-hidden="true">
      <path d="M30 14h60v26c0 22-14 38-30 38S30 62 30 40Z" fill="#ffd166" stroke="#2a2350" strokeWidth="5" strokeLinejoin="round" />
      <path d="M30 24H14c0 18 8 26 18 28M90 24h16c0 18-8 26-18 28" fill="none" stroke="#2a2350" strokeWidth="5" strokeLinecap="round" />
      <rect x="52" y="76" width="16" height="18" fill="#ffd166" stroke="#2a2350" strokeWidth="5" />
      <rect x="34" y="94" width="52" height="16" rx="5" fill="#7c5cf0" stroke="#2a2350" strokeWidth="5" />
      <path d="M60 28l4 9 10 1-7.5 6.5 2.5 10-9-5.5-9 5.5 2.5-10L46 38l10-1Z" fill="#fff" stroke="#2a2350" strokeWidth="3" strokeLinejoin="round" />
    </svg>
    <Spark className="absolute left-[14%] top-[12%] w-6 animate-pulse" />
    <Spark className="absolute right-[4%] bottom-[16%] w-5 animate-pulse" c="#ffd166" />
  </div>
);

const ArtStudio = () => (
  <div className="relative w-full h-full">
    <Paper className="absolute right-[34%] top-[8%] w-[38%] rotate-[-8deg] drop-shadow-lg" />
    <Paper className="absolute right-[12%] top-[16%] w-[38%] rotate-[6deg] drop-shadow-lg" tone="#e8456b" />
    <div className="absolute right-[-2%] bottom-[-6%] w-[40%] animate-float-slow">
      <CharArt look={preset('dogTeacher')} />
    </div>
    <Spark className="absolute left-[18%] top-[10%] w-6 animate-pulse" />
  </div>
);

const ArtQuiz = () => (
  <div className="relative w-full h-full">
    <div className="absolute left-[8%] top-[14%] grid grid-cols-2 gap-2 w-[46%] rotate-[-4deg]">
      {['#ff6b7a', '#4fb3ff', '#ffcf3f', '#3fd6a8'].map((c, i) => (
        <span key={c} className="aspect-[1.4] rounded-2xl border-[3px] border-[#2a2350] shadow-[0_4px_0_#2a2350] flex items-center justify-center" style={{ background: c }}>
          <ChoiceShape i={i} size={30} />
        </span>
      ))}
    </div>
    <svg viewBox="0 0 60 30" className="absolute left-[52%] top-[42%] w-[14%]" aria-hidden="true">
      <path d="M4 15 H48 M38 5 L52 15 L38 25" fill="none" stroke="#2a2350" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <Paper className="absolute right-[6%] top-[10%] w-[30%] rotate-[7deg] drop-shadow-lg" tone="#ff9a3d" />
  </div>
);

/** จอเกมที่ AI สร้าง + ตัวเลือกคำตอบ */
const ArtAiGame = () => (
  <div className="relative w-full h-full">
    <svg viewBox="0 0 160 120" className="absolute right-[8%] top-[12%] w-[78%] rotate-[-4deg] drop-shadow-lg" aria-hidden="true">
      <rect x="4" y="4" width="152" height="104" rx="14" fill="#2a2350" />
      <rect x="12" y="12" width="136" height="80" rx="8" fill="#8fd8ff" />
      <path d="M12 74 Q50 56 84 70 T148 64 V92 H12Z" fill="#3fd6a8" />
      <circle cx="122" cy="30" r="10" fill="#ffd166" />
      <rect x="30" y="46" width="22" height="22" rx="6" fill="#ff6b7a" stroke="#2a2350" strokeWidth="3" />
      <circle cx="37" cy="54" r="2.5" fill="#2a2350" /><circle cx="46" cy="54" r="2.5" fill="#2a2350" />
      <rect x="70" y="24" width="38" height="14" rx="7" fill="#fff" stroke="#2a2350" strokeWidth="3" />
      <rect x="66" y="96" width="28" height="8" rx="4" fill="#9b6cf0" />
    </svg>
    <div className="absolute left-[4%] bottom-[10%] flex gap-1.5 w-[60%] rotate-[3deg]">
      {['#ff6b7a', '#4fb3ff', '#ffcf3f'].map((c, i) => (
        <span key={c} className="flex-1 aspect-square rounded-xl border-[3px] border-[#2a2350] shadow-[0_3px_0_#2a2350] flex items-center justify-center" style={{ background: c }}>
          <ChoiceShape i={i} size={20} />
        </span>
      ))}
    </div>
    <Spark className="absolute left-[10%] top-[8%] w-6 animate-pulse" />
    <Spark className="absolute right-[2%] bottom-[30%] w-5 animate-pulse" c="#ffd166" />
  </div>
);

function ArtOffer({ perDay }: { perDay: string }) {
  return (
    <div className="relative w-full h-full flex items-end justify-center">
      <img src="/plans/fiveg-grown.webp" alt="" className="h-[92%] object-contain drop-shadow-xl animate-float-slow" />
      <span className="absolute right-[6%] top-[10%] rotate-[8deg] px-3 py-1.5 rounded-2xl border-[3px] border-[#2a2350] bg-white text-[#2a2350] font-display text-sm sm:text-base shadow-[0_4px_0_#2a2350] whitespace-nowrap">
        วันละ {perDay} บาท
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- ป้าย */

export function PromoBanners({ className = '' }: { className?: string }) {
  const { user, profile } = useAuth();
  const { ready, offer } = useMembership();
  const member = hasMembership(profile);
  const [shown, setShown] = useState(false);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);

  useEffect(() => setShown(!promoHidden()), []);

  // กิจกรรมประกวดใบงาน (ถ้ามีและยังไม่จบ ขึ้นเป็นป้ายแรก)
  const [contest, setContest] = useState<{ c: Contest; phase: Phase } | null>(null);
  useEffect(() => {
    fetch('/api/contest?brief=1')
      .then((r) => r.json())
      .then((j) => j.contest && (j.phase === 'open' || j.phase === 'soon') && setContest({ c: j.contest, phase: j.phase }))
      .catch(() => {});
  }, []);

  const grown = PLANS.find((p) => p.id === 'grown')!;
  const perDay = (grown.price / grown.days).toFixed(2).replace(/\.?0+$/, '');
  const welcome = !!offer.welcomeEndsAt && new Date(offer.welcomeEndsAt).getTime() > Date.now();

  const slides = useMemo(() => {
    const all: Slide[] = [
      {
        id: 'aigame',
        tag: 'ใหม่',
        title: 'สร้างเกมของตัวเองด้วย AI',
        desc: 'เลือกเกมที่ชอบ ปรับวิชา ชั้น เนื้อหา หรือใช้ชุดคำถามของคุณครู แล้วคัดลอก prompt ไปให้ Gemini สร้างเกม',
        cta: 'เลือกเกม',
        href: '/ai-game',
        bg: 'linear-gradient(115deg,#9fe3ff 0%,#c9b8ff 100%)',
        art: <ArtAiGame />,
      },
      {
        id: 'studio',
        tag: TEACHER,
        title: 'สร้างสื่อการสอนเอง ง่ายแบบ Canva',
        desc: `ใบงาน บัตรคำ ป้ายห้องเรียน 33 ตัวช่วยแยกวิชา ลากวาง พร้อมแป้นลัด บัญชีฟรีสร้างได้ ${FREE_DESIGN_LIMIT} ชิ้น`,
        cta: 'ลองสร้างสื่อ',
        href: '/studio',
        bg: 'linear-gradient(115deg,#c9b8ff 0%,#ffc2e2 100%)',
        art: <ArtStudio />,
      },
      {
        id: 'quiz',
        tag: TEACHER,
        title: 'ข้อสอบชุดเดียว ใช้ได้ทั้งเกมและใบงาน',
        desc: 'สร้างชุดคำถาม เปิดเป็นเกมเล่นสดทั้งห้อง แล้วกดปุ่มเดียวเปลี่ยนเป็นใบงานพร้อมเฉลย',
        cta: 'สร้างชุดคำถาม',
        href: '/create',
        bg: 'linear-gradient(115deg,#ffe08a 0%,#ffb27a 100%)',
        art: <ArtQuiz />,
      },
    ];
    if (contest) {
      const top = contest.c.prize_days[0];
      const open = contest.phase === 'open';
      all.unshift({
        id: 'contest',
        tag: open ? `เหลือ ${leftText(new Date(contest.c.ends_at).getTime() - Date.now())}` : 'เร็วๆ นี้',
        title: contest.c.title,
        desc: `ให้ AI วาดใบงานตามที่ครูแต่ง แล้วส่งประกวด ใจมากสุด 3 อันดับรับสมาชิกฟรี${top ? ` สูงสุด ${top} วัน` : ''}`,
        cta: open ? 'ร่วมสนุก' : 'ดูรายละเอียด',
        href: '/contest',
        bg: 'linear-gradient(115deg,#ffe08a 0%,#ffb3cf 60%,#c9b8ff 100%)',
        art: <ArtContest />,
      });
    } else
      all.unshift({
        id: 'worksheet',
        tag: TEACHER,
        title: 'ตู้แต่งตัวใบงาน AI',
        desc: 'เลือกวิชา ธีม สไตล์ เหมือนแต่งตัวละคร แล้วให้ Gemini วาดใบงานสวยๆ ให้ฟรี',
        cta: 'ลองแต่งใบงาน',
        href: '/worksheet',
        bg: 'linear-gradient(115deg,#a8f0d4 0%,#c9b8ff 100%)',
        art: <ArtStudio />,
      });
    if (!member && ready)
      all.push({
        id: 'offer',
        tag: welcome ? `ลด ${WELCOME_PCT}% บัญชีใหม่` : 'สมาชิก',
        title: `ใช้ได้ทุกระบบ เริ่มวันละ ${perDay} บาท`,
        desc: `แพลน ${grown.days} วัน ${grown.price} บาท ใช้เกมในคลังได้เต็ม สร้างชุดคำถามและสื่อการสอนได้ไม่จำกัด${user ? '' : ` สมัครฟรีวันนี้ รับส่วนลด ${WELCOME_PCT}% ใน ${WELCOME_HOURS} ชั่วโมงแรก`}`,
        cta: user ? 'ดูแพลนสมาชิก' : 'สมัครบัญชีฟรี',
        href: user ? '/membership' : '/signup',
        bg: 'linear-gradient(115deg,#fff3c4 0%,#ffd75e 100%)',
        art: <ArtOffer perDay={perDay} />,
      });
    return all;
  }, [member, ready, welcome, perDay, grown, user, contest]);

  const n = slides.length;
  const go = useCallback((k: number) => setI(((k % n) + n) % n), [n]);

  useEffect(() => {
    if (!shown || paused || n < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((k) => (k + 1) % n), 6500);
    return () => clearInterval(t);
  }, [shown, paused, n]);

  if (!shown || !n) return null;

  const close = () => {
    hidePromo();
    setShown(false);
  };

  return (
    <section
      className={`relative ${className}`}
      aria-roledescription="carousel"
      aria-label="ระบบต่างๆ ในเว็บ"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onPointerDown={(e) => (touch.current = e.clientX)}
      onPointerUp={(e) => {
        const dx = touch.current === null ? 0 : e.clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="grid rounded-[2rem] border-[3px] border-[#2a2350] shadow-[0_6px_0_#2a2350] overflow-hidden text-[#2a2350] select-none">
        {slides.map((s, k) => {
          const on = k === i;
          return (
            <div
              key={s.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${k + 1} จาก ${n}: ${s.title}`}
              aria-hidden={!on}
              className={`[grid-area:1/1] relative flex items-stretch min-h-[210px] sm:min-h-[230px] transition-all duration-500 ${on ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6 pointer-events-none'}`}
              style={{ background: s.bg }}
            >
              <span aria-hidden="true" className="absolute -left-10 -bottom-16 w-48 h-48 rounded-full bg-white/30" />
              <span aria-hidden="true" className="absolute right-[30%] -top-12 w-32 h-32 rounded-full bg-white/25" />
              <div className="relative z-10 flex-1 min-w-0 flex flex-col justify-center gap-2 py-5 pl-5 sm:pl-9 pr-2 pb-9">
                <span className="self-start px-2.5 py-0.5 rounded-full border-2 border-[#2a2350] bg-white text-xs font-extrabold">{s.tag}</span>
                <h2 className="font-display text-xl sm:text-3xl leading-tight">{s.title}</h2>
                <p className="text-sm sm:text-base font-semibold opacity-85 max-w-xl leading-snug">{s.desc}</p>
                {s.href ? (
                  <Link href={s.href} tabIndex={on ? 0 : -1} className={CTA}>
                    {s.cta} <ChevronRight className="w-4 h-4" strokeWidth={3} />
                  </Link>
                ) : (
                  <button type="button" onClick={s.act} tabIndex={on ? 0 : -1} className={CTA}>
                    {s.cta} <ChevronRight className="w-4 h-4" strokeWidth={3} />
                  </button>
                )}
              </div>
              <div className="relative z-0 w-[38%] sm:w-[42%] max-w-[420px] shrink-0">{on && s.art}</div>
            </div>
          );
        })}
      </div>

      {/* ปุ่มปิด / เลื่อน / จุดบอกลำดับ */}
      <button
        type="button"
        onClick={close}
        className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full border-2 border-[#2a2350] bg-white/90 text-[#2a2350] flex items-center justify-center hover:scale-110 transition-transform"
        aria-label="ปิดป้ายโฆษณา (ซ่อน 1 วัน)"
        title="ปิดป้าย (ซ่อน 1 วัน)"
      >
        <X className="w-4 h-4" strokeWidth={3} />
      </button>
      {n > 1 && (
        <>
          <button type="button" onClick={() => go(i - 1)} className="max-sm:hidden absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border-[3px] border-[#2a2350] bg-white text-[#2a2350] flex items-center justify-center shadow-[0_3px_0_#2a2350] hover:scale-110 transition-transform" aria-label="ป้ายก่อนหน้า">
            <ChevronLeft className="w-5 h-5" strokeWidth={3} />
          </button>
          <button type="button" onClick={() => go(i + 1)} className="max-sm:hidden absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border-[3px] border-[#2a2350] bg-white text-[#2a2350] flex items-center justify-center shadow-[0_3px_0_#2a2350] hover:scale-110 transition-transform" aria-label="ป้ายถัดไป">
            <ChevronRight className="w-5 h-5" strokeWidth={3} />
          </button>
          <div className="absolute bottom-3 left-5 sm:left-9 z-20 flex gap-1.5">
            {slides.map((s, k) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(k)}
                className={`h-2.5 rounded-full border-2 border-[#2a2350] transition-all ${k === i ? 'w-7 bg-[#2a2350]' : 'w-2.5 bg-white/80'}`}
                aria-label={`ไปป้ายที่ ${k + 1}`}
                aria-current={k === i}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
