'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Crown, Gamepad2, Home, Pause, Play, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Confetti } from '@/components/fx/Confetti';
import { CHAPTERS, STEPS, type TourStep } from './steps';
import s from './tour.module.css';

const KEY = 'l5g_tour_step';
const SEEN = 'l5g_tour_seen';
const PAD = 10;

type Box = { x: number; y: number; w: number; h: number };
type View = Box & { vw: number; vh: number; empty: boolean };

/** ม่านมืดเจาะรูมุมมนตรงไฟส่อง (evenodd) */
function holePath(v: View): string {
  const { x, y, w, h, vw, vh } = v;
  const outer = `M0 0H${vw}V${vh}H0Z`;
  if (w < 1 || h < 1) return outer;
  const r = Math.min(22, w / 2, h / 2);
  return `${outer}M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}
type Outro = 'play' | 'later' | null;

const TourCtx = createContext<{ start: () => void; active: boolean }>({ start: () => {}, active: false });

/** เริ่มทัวร์แนะนำเว็บ (หลังสมัครบัญชี / เมนูผู้ใช้) */
export const useTour = () => useContext(TourCtx);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const q = (name: string) => document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function visible(el: HTMLElement | null): el is HTMLElement {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
}

async function waitFor<T>(get: () => T | null | false, timeout: number, alive: () => boolean): Promise<T | null> {
  const end = Date.now() + timeout;
  while (alive() && Date.now() < end) {
    const v = get();
    if (v) return v;
    await sleep(90);
  }
  return null;
}

/** รอให้หน้าเลื่อนนิ่ง */
async function settle(alive: () => boolean) {
  let last = -1;
  let still = 0;
  const end = Date.now() + 1600;
  while (alive() && Date.now() < end && still < 3) {
    await sleep(70);
    const y = window.scrollY;
    still = y === last ? still + 1 : 0;
    last = y;
  }
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [idx, setIdx] = useState<number | null>(null);
  const [outro, setOutro] = useState<Outro>(null);
  const router = useRouter();

  // กลับมาเล่นต่อหลังรีเฟรชหน้า
  useEffect(() => {
    try {
      const v = sessionStorage.getItem(KEY);
      const n = v === null ? NaN : Number(v);
      if (Number.isInteger(n) && n >= 0 && n < STEPS.length) setIdx(n);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (idx === null) sessionStorage.removeItem(KEY);
      else sessionStorage.setItem(KEY, String(idx));
    } catch {}
  }, [idx]);

  const start = useCallback(() => {
    setOutro(null);
    setIdx(0);
  }, []);

  const end = useCallback(
    (to: 'home' | 'stay', kind: Outro = null) => {
      setIdx(null);
      try {
        localStorage.setItem(SEEN, '1');
      } catch {}
      if (to === 'home') {
        if (window.location.pathname !== '/home') router.push('/home');
        else window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
        setOutro(kind);
      }
    },
    [router]
  );

  const closeOutro = useCallback(() => setOutro(null), []);
  const value = useMemo(() => ({ start, active: idx !== null }), [start, idx]);

  return (
    <TourCtx.Provider value={value}>
      {children}
      {idx !== null && <TourStage idx={idx} setIdx={setIdx} onEnd={end} />}
      {outro && <TourOutro kind={outro} onClose={closeOutro} />}
    </TourCtx.Provider>
  );
}

/* ====================================================================== */

function TourStage({
  idx,
  setIdx,
  onEnd,
}: {
  idx: number;
  setIdx: React.Dispatch<React.SetStateAction<number | null>>;
  onEnd: (to: 'home' | 'stay', kind?: Outro) => void;
}) {
  const router = useRouter();
  const step = STEPS[idx];
  const last = STEPS.length - 1;

  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View | null>(null);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0, show: false, click: false, instant: true });

  const run = useRef(0);
  const dir = useRef(1);
  const target = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const cursorPos = useRef<{ x: number; y: number } | null>(null);
  const glideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const glide = useRef(true);
  const shown = useRef<Box | null>(null);

  const go = useCallback(
    (n: number) => {
      if (n < 0 || n > last) return;
      dir.current = n >= idx ? 1 : -1;
      setIdx(n);
    },
    [idx, last, setIdx]
  );
  const next = useCallback(() => go(idx + 1), [go, idx]);
  const prev = useCallback(() => go(idx - 1), [go, idx]);
  const skip = useCallback(() => onEnd(window.location.pathname === '/home' ? 'stay' : 'home'), [onEnd]);

  const aim = (el: HTMLElement | null) => {
    target.current = el;
    glide.current = true;
    clearTimeout(glideTimer.current);
    glideTimer.current = setTimeout(() => (glide.current = false), 900);
  };

  /** เลื่อนหน้าให้ element อยู่ในกรอบที่การ์ดไม่บัง */
  const frame = async (el: HTMLElement, alive: () => boolean) => {
    const navH = 72;
    const cardH = (cardRef.current?.offsetHeight ?? 170) + 24;
    const room = window.innerHeight - navH - cardH;
    const r = el.getBoundingClientRect();
    const abs = r.top + window.scrollY;
    const top = r.height + PAD * 2 <= room ? abs - navH - (room - r.height) / 2 : abs - navH - 18;
    window.scrollTo({ top: Math.max(0, top), behavior: reduced() ? 'auto' : 'smooth' });
    await settle(alive);
  };

  /** เคอร์เซอร์เลื่อนไปกด */
  const tap = async (el: HTMLElement, alive: () => boolean) => {
    if (reduced()) return;
    const r = el.getBoundingClientRect();
    const to = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    if (!cursorPos.current) {
      const from = { x: window.innerWidth / 2, y: window.innerHeight - 60 };
      setCursor({ ...from, show: false, click: false, instant: true });
      await sleep(40);
    }
    if (!alive()) return;
    setCursor({ ...to, show: true, click: false, instant: false });
    cursorPos.current = to;
    await sleep(800);
    if (!alive()) return;
    setCursor((c) => ({ ...c, click: true }));
    await sleep(260);
    setCursor((c) => ({ ...c, click: false }));
  };

  const hideCursor = () => {
    cursorPos.current = null;
    setCursor((c) => ({ ...c, show: false }));
  };

  // ---------- เดินแต่ละขั้น ----------
  useEffect(() => {
    const token = ++run.current;
    const alive = () => run.current === token;
    setReady(false);
    setPaused(false);

    (async () => {
      // เปลี่ยนหน้า (ชี้ปุ่มบนเมนูให้ดูก่อนถ้ามี)
      if (window.location.pathname !== step.path) {
        if (step.via && dir.current > 0) {
          const v = q(step.via);
          if (visible(v)) {
            aim(v);
            await tap(v, alive);
          }
        }
        if (!alive()) return;
        hideCursor();
        aim(null);
        router.push(step.path);
        await waitFor(() => window.location.pathname === step.path, 8000, alive);
        await sleep(380);
      }
      if (!alive()) return;

      if (!step.target) {
        aim(null);
        hideCursor();
        setReady(true);
        return;
      }

      // กดแท็บให้ (เช่น สลับไปคลังเอกสาร)
      if (step.click) {
        const c = await waitFor(() => q(step.click!), 6000, alive);
        if (c && c.getAttribute('aria-selected') !== 'true') {
          await frame(c, alive);
          if (!alive()) return;
          await tap(c, alive);
          if (!alive()) return;
          c.click();
          await sleep(420);
        }
      }

      const el = await waitFor(() => q(step.target!), 7000, alive);
      if (!alive()) return;
      hideCursor();
      if (el) {
        await frame(el, alive);
        if (!alive()) return;
        aim(el);
      } else {
        aim(null);
      }
      setReady(true);
    })();
    // ออกจากทัวร์/เปลี่ยนขั้น: งานค้างของขั้นนี้หยุดทันที (กันพาเปลี่ยนหน้าหลังกดข้าม)
    return () => {
      run.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // ---------- ไฟส่องตาม element (ตอนเลื่อนจอ/ย่อขยาย) ไหลไปหาเป้าใหม่แบบนุ่ม ๆ ----------
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const el = target.current;
      let nb: Box | null = null;
      if (el && el.isConnected) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          // ส่วนที่ยาวเกินจอ: ตัดกรอบให้จบเหนือการ์ดคำบรรยาย จะได้เห็นขอบไฟส่องครบ
          const card = cardRef.current;
          const limit = card && !card.dataset.center ? card.getBoundingClientRect().top - 14 : vh - 8;
          let y1 = r.top - PAD;
          let y2 = r.bottom + PAD;
          if (Math.min(y2, limit) - Math.max(y1, 8) >= 60) {
            y1 = Math.max(y1, 8);
            y2 = Math.min(y2, limit);
          }
          nb = { x: r.left - PAD, y: y1, w: r.width + PAD * 2, h: y2 - y1 };
        }
      }
      // ไม่มีเป้า = หดเป็นจุดกลางจอ (มืดทั้งจอ)
      const goal = nb ?? { x: vw / 2, y: vh / 2, w: 0, h: 0 };
      const cur = shown.current ?? goal;
      const k = glide.current && !reduced() ? 0.15 : 1;
      let nx: Box = {
        x: cur.x + (goal.x - cur.x) * k,
        y: cur.y + (goal.y - cur.y) * k,
        w: cur.w + (goal.w - cur.w) * k,
        h: cur.h + (goal.h - cur.h) * k,
      };
      if (Math.abs(nx.x - goal.x) + Math.abs(nx.y - goal.y) + Math.abs(nx.w - goal.w) + Math.abs(nx.h - goal.h) < 1) nx = goal;
      shown.current = nx;
      setView((v) =>
        v && v.vw === vw && v.vh === vh && v.empty === !nb && Math.abs(v.x - nx.x) + Math.abs(v.y - nx.y) + Math.abs(v.w - nx.w) + Math.abs(v.h - nx.h) < 0.3
          ? v
          : { ...nx, vw, vh, empty: !nb }
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(glideTimer.current);
    };
  }, []);

  // ---------- คีย์ลัด ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip();
      else if (e.key === 'ArrowRight' && !step.final) next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ' && !step.final && !(e.target as HTMLElement | null)?.closest?.('button, input, textarea')) {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, skip, step.final]);

  const ch = CHAPTERS[step.chapter];
  const running = ready && !paused && !hover && !step.final;
  const centerCard = !step.target;


  return (
    <div role="dialog" aria-modal="true" aria-label="แนะนำการใช้งานเว็บไซต์" className="select-none">
      {/* กันกดหน้าเว็บระหว่างทัวร์ (ยังเลื่อนจอได้) */}
      <div className="fixed inset-0 z-[9979]" onClick={(e) => e.stopPropagation()} />

      {/* ม่านมืด + ไฟส่อง */}
      <div
        className={cn(s.dim, 'fixed inset-0 z-[9980] pointer-events-none')}
        style={{ clipPath: view ? `path(evenodd, '${holePath(view)}')` : undefined }}
        aria-hidden="true"
      />
      {view && !view.empty && view.w > 4 && (
        <div
          className={s.ring}
          style={{ left: view.x, top: view.y, width: view.w, height: view.h, ['--a' as string]: step.accent } as React.CSSProperties}
          aria-hidden="true"
        >
          <Sparkle className={s.spark} style={{ left: -12, top: -12 }} />
          <Sparkle className={s.spark} style={{ right: -10, bottom: -10, animationDelay: '.8s' }} />
        </div>
      )}

      {/* เคอร์เซอร์จำลอง */}
      <div
        className={s.cursor}
        data-instant={cursor.instant}
        data-click={cursor.click}
        style={{ transform: `translate(${cursor.x - 6}px, ${cursor.y - 4}px)`, opacity: cursor.show ? 1 : 0 }}
        aria-hidden="true"
      >
        {cursor.click && <span key={String(cursor.x) + cursor.y} className={s.ripple} style={{ left: -16, top: -18 }} />}
        <svg viewBox="0 0 32 32" className={s.cursorIcon}>
          <path d="M5 3.5 26 15.2c1.2.7 1 2.4-.3 2.8l-8.1 2.3-3.9 7.6c-.6 1.2-2.4 1-2.7-.3L4.1 4.9c-.3-1.1.9-2 1.9-1.4Z" fill="#fff" stroke="#3b1f9e" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M8.5 9.5 12.6 22" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" opacity=".6" />
        </svg>
      </div>

      {/* ปุ่มข้าม */}
      {!step.final && (
        <button
          type="button"
          onClick={skip}
          className={cn(s.skip, 'btn-jelly fixed z-[9995] right-3 sm:right-6 top-[max(0.75rem,env(safe-area-inset-top))] inline-flex items-center gap-2 pl-4 pr-1.5 py-1.5 rounded-full text-sm font-bold text-indigo-800 dark:text-indigo-100 shadow-[0_6px_20px_-6px_rgba(20,10,60,0.6)]')}
        >
          <span>
            ข้าม<span className="hidden sm:inline">การแนะนำ</span>
          </span>
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 via-fuchsia-500 to-violet-600 text-white flex items-center justify-center shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]">
            <SkipForward className="w-4 h-4" fill="currentColor" />
          </span>
        </button>
      )}

      {/* การ์ดคำบรรยาย */}
      <div
        className={cn(
          'fixed inset-x-0 z-[9985] flex justify-center px-3 pointer-events-none',
          centerCard ? 'inset-y-0 items-center' : 'bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-5'
        )}
      >
        <div
          key={centerCard ? 'c' + idx : 'dock'}
          ref={cardRef}
          data-center={centerCard ? '1' : undefined}
          onMouseEnter={() => window.matchMedia('(hover: hover)').matches && setHover(true)}
          onMouseLeave={() => setHover(false)}
          className={cn(
            'pointer-events-auto relative w-full overflow-hidden border-[3px] bg-white/[0.97] dark:bg-[#17112e]/[0.97] text-gray-900 dark:text-white backdrop-blur-xl',
            centerCard
              ? cn(s.center, 'max-w-md rounded-[2rem] px-5 pt-5 pb-5 sm:px-7 sm:pt-6 text-center shadow-[0_8px_0_0_rgba(20,10,60,0.35),0_30px_60px_-20px_rgba(20,10,60,0.7)]')
              : cn(s.card, 'max-w-[620px] rounded-[1.6rem] sm:rounded-[1.9rem] px-3.5 pt-3 pb-3 sm:px-5 sm:pt-4 sm:pb-4 shadow-[0_6px_0_0_rgba(20,10,60,0.35),0_24px_50px_-18px_rgba(20,10,60,0.7)]')
          )}
          style={{ borderColor: step.accent, ['--a' as string]: step.accent } as React.CSSProperties}
        >
          <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-14 w-44 h-44 rounded-full blur-3xl opacity-30" style={{ background: step.accent }} />

          {/* แถบเวลาแบบสตอรี่ */}
          <div className="relative flex gap-[3px] mb-3" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span key={i} className="flex-1 h-1.5 rounded-full bg-gray-200/90 dark:bg-white/10 overflow-hidden" style={{ ['--a' as string]: step.accent } as React.CSSProperties}>
                {i < idx && <span className="block h-full w-full rounded-full" style={{ background: step.accent }} />}
                {i === idx && !step.final && (
                  <span
                    key={`f${idx}`}
                    className={s.fill}
                    style={{ animationDuration: `${step.ms}ms`, animationPlayState: running ? 'running' : 'paused' }}
                    onAnimationEnd={(e) => e.target === e.currentTarget && next()}
                  />
                )}
                {i === idx && step.final && <span className="block h-full w-full rounded-full" style={{ background: step.accent }} />}
              </span>
            ))}
          </div>

          {centerCard ? (
            <CenterBody step={step} ready={ready} onStart={next} onEnd={onEnd} />
          ) : (
            <div className="relative flex items-center gap-3 sm:gap-4">
              <div className="relative shrink-0 w-14 h-[4.5rem] sm:w-20 sm:h-24">
                <span aria-hidden="true" className="absolute inset-x-1 bottom-0 h-3 rounded-full blur-md opacity-50" style={{ background: step.accent }} />
                <div className={cn('absolute inset-0', s.bob)}>
                  <Image src="/plans/fiveg-kid.webp" alt="" fill sizes="80px" className="object-contain" priority />
                </div>
              </div>
              <div className="min-w-0 flex-1" aria-live="polite">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold text-white" style={{ background: ch.color }}>
                    {ch.label}
                  </span>
                  {step.chip && (
                    <span className="text-[11px] sm:text-xs font-bold truncate" style={{ color: step.accent }}>
                      {step.chip}
                    </span>
                  )}
                </div>
                <h3 key={'t' + idx} className={cn(s.title, 'mt-1 font-display text-lg sm:text-2xl leading-tight')}>
                  {step.title}
                </h3>
                <Words key={'w' + idx} text={step.text} className="mt-0.5 text-[13px] sm:text-[15px] leading-snug font-semibold text-gray-600 dark:text-gray-300" />
              </div>
            </div>
          )}

          {/* ปุ่มควบคุม */}
          {!centerCard && (
            <div className="relative mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={prev}
                disabled={idx === 0}
                aria-label="ย้อนกลับ"
                className="btn-jelly w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-200 flex items-center justify-center disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? 'เล่นต่อ' : 'หยุดชั่วคราว'}
                className="btn-jelly w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-200 flex items-center justify-center"
              >
                {paused ? <Play className="w-4 h-4" fill="currentColor" /> : <Pause className="w-4 h-4" fill="currentColor" />}
              </button>
              <span className="flex-1 text-center text-xs font-bold text-gray-400 dark:text-gray-500 tabular-nums">
                {!ready ? 'กำลังพาไป...' : paused || hover ? 'หยุดอยู่' : `${idx + 1} / ${STEPS.length}`}
              </span>
              <button
                type="button"
                onClick={next}
                className="btn-jelly inline-flex items-center gap-1 pl-4 pr-2.5 h-10 rounded-2xl text-white text-sm font-bold shadow-[0_3px_0_0_rgba(20,10,60,0.3)]"
                style={{ background: `linear-gradient(135deg, ${step.accent}, #7c4dff)` }}
              >
                ถัดไป <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* การ์ดกลางจอ: เปิดทัวร์ / ฉากเลือกตอนจบ */
function CenterBody({
  step,
  ready,
  onStart,
  onEnd,
}: {
  step: TourStep;
  ready: boolean;
  onStart: () => void;
  onEnd: (to: 'home' | 'stay', kind?: Outro) => void;
}) {
  const join = () => {
    onEnd('stay');
    const p = q('plans');
    if (p) window.scrollTo({ top: p.getBoundingClientRect().top + window.scrollY - 84, behavior: reduced() ? 'auto' : 'smooth' });
  };

  return (
    <div className="relative" aria-live="polite">
      <div className="relative mx-auto w-28 h-32 sm:w-32 sm:h-36">
        <span aria-hidden="true" className="absolute inset-x-4 bottom-1 h-4 rounded-full blur-lg opacity-60" style={{ background: step.accent }} />
        <div className={cn('absolute inset-0', s.bob)}>
          <Image src={step.final ? '/plans/fiveg-grown.webp' : '/plans/fiveg-kid.webp'} alt="" fill sizes="140px" className="object-contain" priority />
        </div>
        <Sparkle className={cn(s.spark, 'text-amber-400')} style={{ left: -4, top: 10 }} />
        <Sparkle className={cn(s.spark, 'text-pink-400')} style={{ right: -2, top: 34, animationDelay: '.7s' }} />
      </div>
      <h3 className={cn(s.title, 'mt-2 font-display text-2xl sm:text-3xl leading-tight')}>{step.title}</h3>
      <Words text={step.text} className="mt-1.5 text-sm sm:text-base font-semibold text-gray-600 dark:text-gray-300" />

      {step.final ? (
        <div className="mt-5 grid gap-2.5">
          <button
            type="button"
            onClick={join}
            className="btn-jelly inline-flex items-center justify-center gap-2 h-12 rounded-2xl text-base font-display text-indigo-950 bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-400 shadow-[0_4px_0_0_rgba(180,83,9,0.55)]"
          >
            <Crown className="w-5 h-5" /> สมัครสมาชิก
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onEnd('home', 'play')}
              className="btn-jelly btn-primary-grad inline-flex items-center justify-center gap-1.5 h-12 rounded-2xl text-sm sm:text-base font-bold"
            >
              <Gamepad2 className="w-5 h-5" /> ลองเล่นดูก่อน
            </button>
            <button
              type="button"
              onClick={() => onEnd('home', 'later')}
              className="btn-jelly inline-flex items-center justify-center gap-1.5 h-12 rounded-2xl text-sm sm:text-base font-bold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-white/10"
            >
              <Home className="w-5 h-5" /> ยังไม่สนใจ
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStart}
          disabled={!ready}
          className="btn-jelly btn-primary-grad mt-5 inline-flex items-center justify-center gap-2 h-12 px-7 rounded-2xl text-base font-display disabled:opacity-60"
        >
          เริ่มเที่ยวเลย <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

/* ฉากปิดท้ายที่หน้าหลัก */
function TourOutro({ kind, onClose }: { kind: Exclude<Outro, null>; onClose: () => void }) {
  const pathname = usePathname();
  const atHome = pathname === '/home';

  useEffect(() => {
    if (!atHome) return;
    const t = setTimeout(() => {
      onClose();
      if (kind === 'play') {
        const lib = q('library');
        if (lib) window.scrollTo({ top: lib.getBoundingClientRect().top + window.scrollY - 76, behavior: reduced() ? 'auto' : 'smooth' });
      }
    }, 3200);
    return () => clearTimeout(t);
  }, [atHome, kind, onClose]);

  if (!atHome) return null;
  return (
    <div className="fixed inset-0 z-[9985] flex items-center justify-center p-4 bg-indigo-950/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose}>
      <Confetti count={70} />
      <div className={cn(s.burst, 'relative w-full max-w-sm rounded-[2rem] border-[3px] border-violet-300 dark:border-violet-500/50 bg-white dark:bg-[#17112e] px-6 py-6 text-center shadow-[0_8px_0_0_rgba(20,10,60,0.35),0_30px_60px_-20px_rgba(20,10,60,0.7)]')}>
        <div className="relative mx-auto w-24 h-28">
          <div className={cn('absolute inset-0', s.bob)}>
            <Image src="/plans/fiveg-kid.webp" alt="" fill sizes="110px" className="object-contain" />
          </div>
        </div>
        <h3 className="mt-2 font-display text-2xl text-gray-900 dark:text-white">กลับมาหน้าหลักแล้ว</h3>
        <p className="mt-1 text-sm font-semibold text-gray-600 dark:text-gray-300">
          {kind === 'play' ? 'เลือกเกมที่ชอบแล้วกดเล่นได้เลย' : 'อยากสมัครเมื่อไหร่ กดปุ่มสมัครสมาชิกบนแถบเมนูได้เลย'}
        </p>
      </div>
    </div>
  );
}

function Words({ text, className }: { text: string; className?: string }) {
  const parts = text.split(' ');
  return (
    <p className={className}>
      {parts.map((w, i) => (
        <React.Fragment key={i}>
          <span className={s.word} style={{ animationDelay: `${120 + i * 85}ms` }}>
            {w}
          </span>
          {i < parts.length - 1 && ' '}
        </React.Fragment>
      ))}
    </p>
  );
}

function Sparkle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <path d="M12 0c.9 6.2 2.8 8.9 12 12-9.2 3.1-11.1 5.8-12 12-.9-6.2-2.8-8.9-12-12C9.2 8.9 11.1 6.2 12 0z" fill="currentColor" />
    </svg>
  );
}
