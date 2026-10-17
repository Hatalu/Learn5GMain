'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Crown, Loader2, Maximize2, Minimize2, Play, Timer, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCompanion } from '@/components/companion/CompanionProvider';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { Buddy } from '@/components/companion/Buddy';
import { CONTACT_PAGE_URL, hasMembership } from '@/lib/membership';
import { getTurnstileToken } from '@/lib/turnstile';
import { MediaItem } from '@/types/database';
import { cn } from '@/lib/utils/cn';
import { JoinButton } from '@/components/membership/JoinButton';
import { useMembership } from '@/components/membership/MembershipProvider';

type Phase = 'loading' | 'waiting' | 'playing' | 'ended' | 'error';

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
const fsElement = () => (document as FsDoc).fullscreenElement || (document as FsDoc).webkitFullscreenElement || null;

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * จอทดลองเล่น / เล่นเต็ม: อยู่กลางหน้าเว็บเดิม เกือบเต็มจอ เล่นเกมได้เหมือนสมาชิก (ไม่ต้องใส่รหัส)
 * mode='play' = สมาชิกกด "เล่นเลย": แบบเดียวกันแต่ไม่มีนาฬิกา เกมล็อกอินให้เองด้วยโทเคนสมาชิก (/api/play/start)
 * มีเวลา 5 นาทีมุมบนขวาของจอเกม หมดเวลาแล้วจอเกมจางลงและขึ้นโปรโมทสมัครสมาชิก
 * (โทเคนทดลองเซ็นโดยเซิร์ฟเวอร์และหมดอายุเอง เกมจึงล็อกตัวเองด้วยถ้าถูกเปิดแยก)
 */
export function TrialModal({ media, onClose, mode = 'trial' }: { media: MediaItem; onClose: () => void; mode?: 'trial' | 'play' }) {
  const full = mode === 'play';
  const { user, profile } = useAuth();
  const { fromPrice } = useMembership();
  const { recordPlay } = useCompanion();
  const member = !!user && hasMembership(profile);

  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [total, setTotal] = useState(300);
  const [left, setLeft] = useState<number | null>(null);
  const [frameGone, setFrameGone] = useState(false);
  /** เพิ่มค่า = ขอโทเคนใหม่แล้วเปิดเกมใหม่ (เล่นเต็มนานเกิน 4 ชั่วโมง) */
  const [gen, setGen] = useState(0);

  /** เต็มจอ: ใช้ Fullscreen API ถ้าเบราว์เซอร์รองรับ ไม่งั้นขยายเต็มหน้าต่างแทน (เช่น iPhone) */
  const [max, setMax] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const fsExitAt = useRef(0);

  const startedAt = useRef<number | null>(null);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armedRef = useRef(false); // เกมพร้อมแล้วและรอผู้เล่นแตะเกมก่อนเริ่มนับ
  const accountRef = useRef<string>('');
  const cleanedRef = useRef(false);

  // ลบบัญชีทดลองที่ระบบสร้างให้ (ครั้งเดียว)
  const cleanup = useCallback(() => {
    if (cleanedRef.current || !accountRef.current) return;
    cleanedRef.current = true;
    try {
      fetch('/api/trial/end', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account: accountRef.current }), keepalive: true }).catch(() => {});
    } catch { /* ตัวกวาดจะลบให้ */ }
  }, []);
  useEffect(() => cleanup, [cleanup]);

  // ขอโทเคนทดลองจากเซิร์ฟเวอร์
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const res = await fetch(full ? '/api/play/start' : '/api/trial/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaId: media.id, cf: await getTurnstileToken(full ? 'play' : 'trial') }),
        });
        const json = await res.json().catch(() => ({}));
        if (off) return;
        if (!res.ok || !json.url) {
          setError(json.error || (full ? 'เปิดเกมไม่ได้ในตอนนี้ ลองใหม่อีกครั้งนะ' : 'เปิดโหมดทดลองไม่ได้ในตอนนี้ ลองใหม่อีกครั้งนะ'));
          setPhase('error');
          return;
        }
        if (full && json.inline === false) {
          // เกมของเว็บอื่น (ฝังในหน้านี้ไม่ได้): เปิดแท็บใหม่แบบเดิม
          window.open(json.url, '_blank', 'noopener,noreferrer');
          onClose();
          return;
        }
        if (!full) {
          accountRef.current = String(json.account || '');
          setTotal(Number(json.seconds) || 300);
        }
        setUrl(json.url);
      } catch {
        if (!off) {
          setError('เชื่อมต่อไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
          setPhase('error');
        }
      }
    })();
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.id, full, gen]);

  // เริ่มจับเวลาเมื่อเกมพร้อมจริง (เกมส่งสัญญาณมา) หรือเมื่อหน้าเกมโหลดเสร็จ
  const startTimer = useCallback(() => {
    if (startedAt.current) return;
    startedAt.current = Date.now();
    setPhase('playing');
  }, []);

  // เล่นเต็ม: ขอโทเคนใหม่แล้วเปิดเกมใหม่
  const renew = useCallback(() => {
    setFrameGone(false);
    setUrl('');
    setPhase('loading');
    setGen((g) => g + 1);
  }, []);

  useEffect(() => {
    if (!url) return;
    let gameOrigin = '';
    try {
      gameOrigin = new URL(url).origin;
    } catch {
      /* ไม่เป็นไร */
    }
    const onMsg = (ev: MessageEvent) => {
      if (ev.origin !== gameOrigin) return;
      const d = (ev.data || {}) as { type?: string; waitStart?: boolean; seconds?: number };
      if (full) {
        // เล่นเต็ม: ไม่มีนาฬิกา แค่รู้ว่าเกมพร้อมแล้ว / ขอต่ออายุเซสชัน
        if (d.type === 'l5g:trial-ready' || d.type === 'l5g:trial-started') setPhase('playing');
        if (d.type === 'l5g:member-renew' || d.type === 'l5g:trial-ended') setPhase('ended');
        return;
      }
      if (d.type === 'l5g:trial-ready') {
        if (d.waitStart && !startedAt.current) {
          // เกมรุ่นใหม่: ยังไม่นับเวลา จนกว่าผู้เล่นจะแตะเข้าเกมเอง
          armedRef.current = true;
          setPhase('waiting');
        } else {
          startTimer(); // เกมรุ่นเก่าไม่มีโหมดรอ: นับทันทีเหมือนเดิม
        }
      }
      if (d.type === 'l5g:trial-started') {
        if (typeof d.seconds === 'number' && d.seconds > 0) setTotal((t) => Math.min(t, d.seconds as number));
        startTimer();
      }
      if (d.type === 'l5g:trial-ended') setPhase('ended');
    };
    window.addEventListener('message', onMsg);
    // กันกรณีเกมไม่ส่งสัญญาณเลย (เกมที่ยังไม่มีระบบทดลอง): เริ่มนับเองหลังโหลดนานสุด 20 วินาที
    loadTimer.current = setTimeout(() => {
      if (!armedRef.current) startTimer();
    }, 20000);
    return () => {
      window.removeEventListener('message', onMsg);
      if (loadTimer.current) clearTimeout(loadTimer.current);
    };
  }, [url, startTimer]);

  // นับถอยหลัง (คำนวณจากเวลาจริง ไม่เพี้ยนแม้แท็บถูกพัก)
  useEffect(() => {
    if (full || phase !== 'playing' || !startedAt.current) return;
    const tick = () => {
      const remain = total * 1000 - (Date.now() - (startedAt.current as number));
      setLeft(remain);
      if (remain <= 0) setPhase('ended');
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [phase, total, full]);

  // หมดเวลา: จอเกมจางลง แล้วปิดเกมจริง (หยุดเสียงและการเล่น)
  useEffect(() => {
    if (phase !== 'ended') return;
    cleanup();
    const t = setTimeout(() => setFrameGone(true), 1500);
    return () => clearTimeout(t);
  }, [phase, cleanup]);

  // เต็มจอ / ย่อจอ
  const exitFs = useCallback(() => {
    const d = document as FsDoc;
    if (!fsElement()) return;
    try {
      const r = d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.();
      if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => null);
    } catch {
      /* ไม่เป็นไร */
    }
  }, []);
  const toggleMax = async () => {
    if (max) {
      exitFs();
      setMax(false);
      return;
    }
    setMax(true);
    const el = boxRef.current as FsEl | null;
    if (!el) return;
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    } catch {
      /* เบราว์เซอร์ไม่ให้เต็มจอจริง: ขยายเต็มหน้าต่างแทน */
    }
  };
  useEffect(() => {
    const onFs = () => {
      // ออกจากเต็มจอด้วยปุ่ม Esc / ท่าทางของเบราว์เซอร์: ย่อกลับเป็นหน้าต่างปกติ
      if (!fsElement()) {
        fsExitAt.current = Date.now();
        setMax(false);
      }
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
      exitFs();
    };
  }, [exitFs]);
  const close = useCallback(() => {
    exitFs();
    onClose();
  }, [exitFs, onClose]);

  // Esc ปิด (ถ้าเต็มจออยู่ = ย่อจอก่อน) + ล็อก scroll พื้นหลัง
  const maxRef = useRef(max);
  maxRef.current = max;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (fsElement() || Date.now() - fsExitAt.current < 600) return;
      if (maxRef.current) {
        setMax(false);
        return;
      }
      onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const ended = phase === 'ended';
  const pct = left === null ? 100 : Math.max(0, Math.min(100, (left / (total * 1000)) * 100));
  const urgent = left !== null && left < 15000 && !ended;

  const playFull = () => {
    recordPlay(media);
    window.open(media.game_url, '_blank', 'noopener,noreferrer');
    close();
  };

  return (
    <div
      className={cn('fixed inset-0 z-[70] flex items-center justify-center bg-indigo-950/75 backdrop-blur-md animate-fade-in', max ? 'p-0' : 'p-2 sm:p-5')}
      onMouseDown={close}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${full ? 'เล่น' : 'ทดลองเล่น'} ${media.title}`}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          'relative flex flex-col overflow-hidden bg-gray-950 shadow-toy-lg',
          max ? 'w-screen h-[100dvh] rounded-none border-0' : 'w-[min(98vw,1280px)] h-[min(94vh,860px)] rounded-[1.5rem] sm:rounded-[2rem] border-2 border-indigo-300/60 dark:border-indigo-700 animate-pop-in'
        )}
      >
        {/* แถบหัว */}
        <div className="shrink-0 flex items-center gap-3 px-3 sm:px-5 py-2.5 bg-gray-900 text-white border-b border-white/10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sun-400 text-indigo-950 text-sm font-bold">
            <Play className="w-3.5 h-3.5 fill-current" /> {full ? 'กำลังเล่น' : 'ทดลองเล่น'}
          </span>
          {phase === 'waiting' ? (
            <p className="flex-1 min-w-0 truncate font-display text-sm sm:text-base text-sun-300">แตะเล่นในเกมเพื่อเริ่มนับเวลา</p>
          ) : (
            <p className="flex-1 min-w-0 truncate font-display text-sm sm:text-base">{media.title}</p>
          )}
      {/* ตัวจับเวลา อยู่ข้างปุ่มปิด ไม่บังจอเกม */}
  {phase !== 'error' && !full && (
    <div
      className={cn(
        'shrink-0 flex items-center gap-2 pl-2 pr-3.5 py-1 rounded-full border text-white transition-colors',
        urgent ? 'bg-rose-600/90 border-rose-300 animate-pulse' : 'bg-gray-950/75 border-white/25'
      )}
      role="timer"
      aria-live="off"
      aria-label={left === null ? 'กำลังเตรียมเวลา' : `เหลือเวลา ${fmt(left)}`}
    >
      <span className="relative w-7 h-7" aria-hidden="true">
        <svg viewBox="0 0 36 36" className="w-7 h-7 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="4" />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke={urgent ? '#fff' : '#ffd25e'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={94.25}
            strokeDashoffset={94.25 * (1 - pct / 100)}
          />
        </svg>
        <Timer className="absolute inset-0 m-auto w-3.5 h-3.5" />
      </span>
      <span className="font-mono text-base font-bold tabular-nums">{left === null ? fmt(total * 1000) : fmt(left)}</span>
    </div>
  )}
          <button
            type="button"
            onClick={toggleMax}
            aria-label={max ? 'ย่อจอเกม' : 'ขยายเต็มจอ'}
            title={max ? 'ย่อจอเกม' : 'ขยายเต็มจอ'}
            className="btn-jelly inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold"
          >
            {max ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{max ? 'ย่อจอ' : 'เต็มจอ'}</span>
          </button>
          <button
            type="button"
            onClick={close}
            aria-label={full ? 'ปิดเกม' : 'ปิดจอทดลองเล่น'}
            className="btn-jelly inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold"
          >
            <X className="w-4 h-4" /> <span className="hidden sm:inline">{full ? 'ปิดเกม' : 'ปิด'}</span>
          </button>
        </div>

        {/* จอเกม */}
        <div className="relative flex-1 min-h-0 bg-black">
          {url && !frameGone && (
            <iframe
              key={gen}
              src={url}
              title={`${full ? 'เล่น' : 'ทดลองเล่น'} ${media.title}`}
              onLoad={() => {
                // เกมที่ไม่ได้ส่งสัญญาณ: เริ่มนับหลังโหลดเสร็จ (ถ้าเกมรอผู้เล่นแตะอยู่ จะไม่นับ)
                setTimeout(() => {
                  if (!armedRef.current) startTimer();
                }, 8000);
              }}
              className={cn(
                'absolute inset-0 w-full h-full border-0 transition-all duration-[1400ms] ease-out',
                ended && 'opacity-15 blur-md scale-[0.985] pointer-events-none'
              )}
              allow="fullscreen; autoplay; clipboard-write; gamepad"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-pointer-lock"
            />
          )}

          {/* กำลังเตรียมเกม */}
          {phase === 'loading' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-white bg-gray-950">
              <Buddy stage={1} size={84} animate={false} />
              <p className="inline-flex items-center gap-2 font-display">
                <Loader2 className="w-5 h-5 animate-spin" /> {full ? 'กำลังเปิดเกม...' : 'กำลังเตรียมเกมให้ลองเล่น...'}
              </p>
            </div>
          )}

          {phase === 'error' && (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center text-white">
              <div className="max-w-sm">
                <p className="font-display text-xl mb-2">{full ? 'เปิดเกมไม่ได้' : 'เปิดโหมดทดลองไม่ได้'}</p>
                <p className="text-white/80 mb-5">{error}</p>
                <button onClick={close} className="btn-primary-grad btn-jelly px-6 py-3 rounded-2xl font-display">ปิด</button>
              </div>
            </div>
          )}

          {/* เล่นเต็มนานเกิน 4 ชั่วโมง: ขอเซสชันใหม่ให้ */}
          {ended && full && (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-4 animate-fade-in">
              <div className="w-full max-w-sm rounded-[2rem] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-2 border-sun-400 shadow-toy-lg p-6 text-center animate-pop-in">
                <h2 className="text-xl font-medium text-gray-900 dark:text-white">เล่นมานานแล้ว พักสายตาหน่อยนะ</h2>
                <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300">กดเล่นต่อเพื่อเปิดเกมใหม่</p>
                <div className="mt-5 flex flex-col gap-2.5">
                  <button type="button" onClick={renew} className="btn-primary-grad btn-jelly inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-display text-lg">
                    <Play className="w-5 h-5 fill-current" /> เล่นต่อ
                  </button>
                  <button type="button" onClick={close} className="btn-jelly px-6 py-2.5 rounded-2xl text-gray-600 dark:text-gray-300 font-semibold">
                    ปิดเกม
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* หมดเวลา: โปรโมทสมัครสมาชิก */}
          {ended && !full && (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-4 animate-fade-in">
              <div className="w-full max-w-md rounded-[2rem] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-2 border-sun-400 shadow-toy-lg p-6 sm:p-8 text-center animate-pop-in">
                <span className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-sun-400 to-orange-500 text-white flex items-center justify-center shadow-lg mb-4">
                  <Crown className="w-8 h-8" />
                </span>
                <h2 className="text-2xl font-medium text-gray-900 dark:text-white">หมดเวลาทดลองเล่นแล้ว</h2>
                {member ? (
                  <p className="mt-2 font-display text-lg text-amber-800 dark:text-sun-300">คุณเป็นสมาชิกอยู่แล้ว เล่นต่อแบบเต็มได้เลย</p>
                ) : (
                  <>
                    <p className="mt-2 font-display text-lg text-amber-800 dark:text-sun-300">
                      {user ? 'สนุกไหม? ต่ออายุสมาชิกเพื่อเล่นต่อได้ไม่จำกัด' : 'สนุกไหม? สมัครสมาชิกเพื่อเล่นต่อได้ไม่จำกัด'}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      สมาชิกเล่นได้ทุกเกมในเว็บ ทั้งเกมนี้และเกมอื่นๆ ติดต่อได้ทางเพจ สื่อการสอน 5G
                    </p>
                  </>
                )}
                <div className="mt-5 flex flex-col gap-2.5">
                  {member ? (
                    <button type="button" onClick={playFull} className="btn-primary-grad btn-jelly inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-display text-lg">
                      <Play className="w-5 h-5 fill-current" /> เล่นต่อแบบเต็มรูปแบบ
                    </button>
                  ) : (
                    <>
                      <JoinButton onClick={onClose} className="btn-primary-grad btn-jelly inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-display text-lg">
                        <Crown className="w-5 h-5" /> สมัครสมาชิกเล่นต่อ เริ่ม {fromPrice} บาท
                      </JoinButton>
                      <a href={CONTACT_PAGE_URL} target="_blank" rel="noopener noreferrer" className="btn-jelly inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl border-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold">
                        <FacebookIcon className="w-4 h-4" /> สอบถามทางเพจ
                      </a>
                      {!user && (
                        <Link href="/login" onClick={onClose} className="btn-jelly inline-flex items-center justify-center px-6 py-3 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-200 font-semibold">
                          เป็นสมาชิกอยู่แล้ว? เข้าสู่ระบบ
                        </Link>
                      )}
                    </>
                  )}
                  <button type="button" onClick={close} className="btn-jelly px-6 py-2.5 rounded-2xl text-gray-600 dark:text-gray-300 font-semibold">
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
