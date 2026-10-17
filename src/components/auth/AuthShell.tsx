'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/navbar/ThemeToggle';
import { ChoiceShape, choiceStyle } from '@/components/creator/ChoiceShape';
import s from './auth.module.css';

export type Mood = 'idle' | 'focus' | 'secret' | 'error' | 'happy';

const SAY: Record<Mood, string> = {
  idle: 'สวัสดี! มาเล่นด้วยกันนะ',
  focus: 'พิมพ์ได้เลย ไม่ต้องรีบ',
  secret: 'ปิดตาแล้ว ไม่แอบดูนะ!',
  error: 'อุ๊ย ลองอีกครั้งนะ',
  happy: 'เย้! ยินดีต้อนรับ',
};

function Sparkle({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M12 0c.9 6.2 2.8 8.9 12 12-9.2 3.1-11.1 5.8-12 12-.9-6.2-2.8-8.9-12-12C9.2 8.9 11.1 6.2 12 0z" fill="currentColor" />
    </svg>
  );
}

/** พลุกระดาษตอนสำเร็จ */
function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        left: Math.random() * 100,
        x: (Math.random() - 0.5) * 260,
        r: (Math.random() - 0.5) * 1200,
        t: 1.2 + Math.random() * 1.1,
        dl: Math.random() * 0.35,
        c: choiceStyle(i).color,
      })),
    []
  );
  return (
    <div className={s.confetti} aria-hidden="true">
      {bits.map((b, i) => (
        <i
          key={i}
          style={{
            left: `${b.left}%`,
            background: b.c,
            ['--x' as string]: `${b.x}px`,
            ['--r' as string]: `${b.r}deg`,
            ['--t' as string]: `${b.t}s`,
            ['--dl' as string]: `${b.dl}s`,
          }}
        />
      ))}
    </div>
  );
}

const TOKENS = [
  { left: 6, t: 19, dl: -3, i: 0 },
  { left: 18, t: 24, dl: -14, i: 1 },
  { left: 33, t: 21, dl: -7, i: 2 },
  { left: 52, t: 26, dl: -19, i: 3 },
  { left: 67, t: 20, dl: -11, i: 4 },
  { left: 82, t: 23, dl: -2, i: 5 },
  { left: 93, t: 27, dl: -16, i: 2 },
];
const STARS = [
  { l: 8, t: 14, sz: 20, tt: 3.2, dl: 0 },
  { l: 26, t: 8, sz: 14, tt: 2.6, dl: 0.8 },
  { l: 47, t: 18, sz: 12, tt: 3.6, dl: 1.6 },
  { l: 71, t: 9, sz: 22, tt: 2.9, dl: 0.3 },
  { l: 90, t: 22, sz: 16, tt: 3.3, dl: 1.2 },
  { l: 14, t: 52, sz: 12, tt: 2.4, dl: 2 },
  { l: 95, t: 58, sz: 14, tt: 3.8, dl: 0.6 },
];

/**
 * ฉากหน้าเข้าสู่ระบบ/สมัครบัญชี: ท้องฟ้าไล่สี เมฆ ดาว ชิ้นตัวเลือกเกมลอยขึ้น เนินเขา (ขยับตามเมาส์เล็กน้อย)
 * + น้องไฟว์จียืนบนเกาะ ทำท่าตามสถานะของฟอร์ม (พิมพ์ / ปิดตาตอนพิมพ์รหัส / ผิด / สำเร็จ)
 */
export function AuthShell({
  mode,
  mood,
  headline,
  lead,
  panel,
  perks,
  celebrate,
  backHref,
  backLabel,
  query = '',
  children,
}: {
  mode: 'login' | 'signup';
  mood: Mood;
  headline: React.ReactNode;
  lead: string;
  panel?: React.ReactNode;
  perks?: { icon: React.ReactNode; text: string }[];
  celebrate?: boolean;
  backHref: string;
  backLabel: string;
  /** query ที่ส่งต่อเวลาสลับหน้า (เช่น ?redirect=/create) */
  query?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // เลื่อนฉากตามเมาส์ (เฉพาะเครื่องที่มีเมาส์ และไม่ได้ขอลดการเคลื่อนไหว)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--mx', ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
        el.style.setProperty('--my', ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  const mascot = (
    <div className={s.mascot} data-mood={mood}>
      <Image src="/plans/fiveg-kid.webp" alt="น้องไฟว์จี" fill sizes="250px" priority draggable={false} />
      <span className={`${s.paw} ${s.pawL}`} aria-hidden="true" />
      <span className={`${s.paw} ${s.pawR}`} aria-hidden="true" />
    </div>
  );

  return (
    <div ref={ref} className={s.world}>
      {/* ---------- ฉากหลัง ---------- */}
      <div className={s.layer} style={{ ['--d' as string]: '-8px' }} aria-hidden="true">
        <div className={s.dots} />
        <span className={s.blob} style={{ left: '4%', top: '12%', width: 300, height: 300, background: '#ffd36e' }} />
        <span className={s.blob} style={{ right: '6%', top: '38%', width: 360, height: 360, background: '#ff9ad5', animationDelay: '-6s' }} />
        <span className={s.blob} style={{ left: '38%', bottom: '-8%', width: 340, height: 340, background: '#7fe3ff', animationDelay: '-11s' }} />
      </div>
      <div className={s.layer} style={{ ['--d' as string]: '14px' }} aria-hidden="true">
        <span className={s.cloud} style={{ top: '12%', ['--t' as string]: '85s', animationDelay: '-20s' }} />
        <span className={s.cloud} style={{ top: '30%', ['--t' as string]: '110s', ['--s' as string]: 0.7, animationDelay: '-70s' }} />
        <span className={s.cloud} style={{ top: '64%', ['--t' as string]: '95s', ['--s' as string]: 0.85, animationDelay: '-45s' }} />
        {STARS.map((st, i) => (
          <span key={i} className={s.star} style={{ left: `${st.l}%`, top: `${st.t}%`, ['--t' as string]: `${st.tt}s`, ['--dl' as string]: `${st.dl}s` }}>
            <Sparkle size={st.sz} />
          </span>
        ))}
      </div>
      <div className={s.layer} style={{ ['--d' as string]: '26px' }} aria-hidden="true">
        {TOKENS.map((tk, k) => (
          <span
            key={k}
            className={s.token}
            style={{ left: `${tk.left}%`, background: choiceStyle(tk.i).color, ['--t' as string]: `${tk.t}s`, ['--dl' as string]: `${tk.dl}s`, ['--r' as string]: `${(k % 2 ? -1 : 1) * (180 + k * 30)}deg` }}
          >
            <ChoiceShape i={tk.i} size={26} />
          </span>
        ))}
      </div>
      <div className={s.layer} style={{ ['--d' as string]: '6px', inset: 'auto -40px -10px -40px' }} aria-hidden="true">
        <div className={s.hills}>
          <svg viewBox="0 0 1440 200" preserveAspectRatio="none">
            <path d="M0 120 C 200 60 360 150 560 110 C 760 70 900 150 1100 100 C 1260 62 1360 96 1440 84 L1440 200 L0 200 Z" fill="rgba(124,224,168,0.55)" />
            <path d="M0 160 C 220 120 420 190 640 150 C 860 112 1040 180 1240 146 C 1340 130 1400 140 1440 136 L1440 200 L0 200 Z" fill="rgba(63,191,134,0.6)" />
          </svg>
        </div>
      </div>

      {/* ---------- แถบบน ---------- */}
      <div className={s.top}>
        <Link href={backHref} className={s.chip}>
          <ArrowLeft className="w-4 h-4" strokeWidth={3} /> {backLabel}
        </Link>
        <ThemeToggle />
      </div>

      <main className={s.main}>
        {/* ---------- เวทีมาสคอต ---------- */}
        <section className={s.stage}>
          <span className={s.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" />
            สื่อการสอน 5G
          </span>
          <h1 className={s.headline}>{headline}</h1>
          <p className={s.lead}>{lead}</p>
          {perks && (
            <div className={s.perks}>
              {perks.map((p, i) => (
                <span key={p.text} className={s.perk} style={{ ['--i' as string]: i }}>
                  {p.icon}
                  {p.text}
                </span>
              ))}
            </div>
          )}

          <div className={`${s.mascotWrap} ${s.bigMascot}`}>
            <div className={s.island} />
            <div className={s.shadow} />
            <div className={s.orbit} aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={s.orbitItem}
                  style={{ background: choiceStyle(i).color, ['--t' as string]: '14s', ['--dl' as string]: `${-i * 3.5}s`, ['--rad' as string]: 'clamp(120px, 15vw, 165px)' }}
                >
                  <ChoiceShape i={i} size={20} />
                </span>
              ))}
            </div>
            {mascot}
            <span key={mood} className={s.bubble} role="status">
              {SAY[mood]}
            </span>
          </div>

          {panel && <div className={s.stagePanel}>{panel}</div>}
        </section>

        {/* ---------- การ์ดฟอร์ม ---------- */}
        <section className={s.card}>
          <div className={s.compactHero}>
            <div className={s.mini}>
              <Image src="/plans/fiveg-kid.webp" alt="" fill sizes="64px" />
            </div>
            <span className={s.bubble} style={{ position: 'relative', top: 0, left: 0 }} key={`m-${mood}`}>
              {SAY[mood]}
            </span>
          </div>
          <div className={s.switch} role="tablist" aria-label="เลือกหน้า">
            <span className={s.switchPill} data-side={mode === 'login' ? 'left' : 'right'} style={{ ['--from' as string]: mode === 'login' ? '100%' : '-100%' }} />
            <Link href={`/login${query}`} role="tab" aria-selected={mode === 'login'} data-on={mode === 'login'}>
              เข้าสู่ระบบ
            </Link>
            <Link href={`/signup${query}`} role="tab" aria-selected={mode === 'signup'} data-on={mode === 'signup'}>
              สมัครบัญชี
            </Link>
          </div>
          {children}
        </section>
      </main>

      {celebrate && <Confetti />}
    </div>
  );
}

export { s as authStyles };
