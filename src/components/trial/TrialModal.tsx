'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Crown, Loader2, Play, Timer, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCompanion } from '@/components/companion/CompanionProvider';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { Buddy } from '@/components/companion/Buddy';
import { CONTACT_PAGE_URL, hasMembership } from '@/lib/membership';
import { MediaItem } from '@/types/database';
import { cn } from '@/lib/utils/cn';

type Phase = 'loading' | 'playing' | 'ended' | 'error';

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * จอทดลองเล่น: อยู่กลางหน้าเว็บเดิม เกือบเต็มจอ เล่นเกมได้เหมือนสมาชิก (ไม่ต้องใส่รหัส)
 * มีเวลา 2 นาทีมุมบนขวาของจอเกม หมดเวลาแล้วจอเกมจางลงและขึ้นโปรโมทสมัครสมาชิก
 * (โทเคนทดลองเซ็นโดยเซิร์ฟเวอร์และหมดอายุเอง เกมจึงล็อกตัวเองด้วยถ้าถูกเปิดแยก)
 */
export function TrialModal({ media, onClose }: { media: MediaItem; onClose: () => void }) {
  const { user, profile } = useAuth();
  const { recordPlay } = useCompanion();
  const member = !!user && hasMembership(profile);

  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [total, setTotal] = useState(120);
  const [left, setLeft] = useState<number | null>(null);
  const [frameGone, setFrameGone] = useState(false);

  const startedAt = useRef<number | null>(null);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        const res = await fetch('/api/trial/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaId: media.id }),
        });
        const json = await res.json().catch(() => ({}));
        if (off) return;
        if (!res.ok || !json.url) {
          setError(json.error || 'เปิดโหมดทดลองไม่ได้ในตอนนี้ ลองใหม่อีกครั้งนะ');
          setPhase('error');
          return;
        }
        accountRef.current = String(json.account || '');
        setTotal(Number(json.seconds) || 120);
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
  }, [media.id]);

  // เริ่มจับเวลาเมื่อเกมพร้อมจริง (เกมส่งสัญญาณมา) หรือเมื่อหน้าเกมโหลดเสร็จ
  const startTimer = useCallback(() => {
    if (startedAt.current) return;
    startedAt.current = Date.now();
    setPhase('playing');
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
      const t = (ev.data as { type?: string } | null)?.type;
      if (t === 'l5g:trial-ready') startTimer();
      if (t === 'l5g:trial-ended') setPhase('ended');
    };
    window.addEventListener('message', onMsg);
    // กันกรณีเกมไม่ส่งสัญญาณ: เริ่มนับเองหลังโหลดนานสุด 12 วินาที
    loadTimer.current = setTimeout(startTimer, 12000);
    return () => {
      window.removeEventListener('message', onMsg);
      if (loadTimer.current) clearTimeout(loadTimer.current);
    };
  }, [url, startTimer]);

  // นับถอยหลัง (คำนวณจากเวลาจริง ไม่เพี้ยนแม้แท็บถูกพัก)
  useEffect(() => {
    if (phase !== 'playing' || !startedAt.current) return;
    const tick = () => {
      const remain = total * 1000 - (Date.now() - (startedAt.current as number));
      setLeft(remain);
      if (remain <= 0) setPhase('ended');
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [phase, total]);

  // หมดเวลา: จอเกมจางลง แล้วปิดเกมจริง (หยุดเสียงและการเล่น)
  useEffect(() => {
    if (phase !== 'ended') return;
    cleanup();
    const t = setTimeout(() => setFrameGone(true), 1500);
    return () => clearTimeout(t);
  }, [phase, cleanup]);

  // Esc ปิด + ล็อก scroll พื้นหลัง
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-5 bg-indigo-950/75 backdrop-blur-md animate-fade-in"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`ทดลองเล่น ${media.title}`}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative flex flex-col w-[min(98vw,1280px)] h-[min(94vh,860px)] rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden bg-gray-950 border-2 border-indigo-300/60 dark:border-indigo-700 shadow-toy-lg animate-pop-in"
      >
        {/* แถบหัว */}
        <div className="shrink-0 flex items-center gap-3 px-3 sm:px-5 py-2.5 bg-gray-900 text-white border-b border-white/10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sun-400 text-indigo-950 text-sm font-bold">
            <Play className="w-3.5 h-3.5 fill-current" /> ทดลองเล่น
          </span>
          <p className="flex-1 min-w-0 truncate font-display text-sm sm:text-base">{media.title}</p>
      {/* ตัวจับเวลา อยู่ข้างปุ่มปิด ไม่บังจอเกม */}
  {phase !== 'error' && (
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
      <span className="font-mono text-base font-bold tabular-nums">{left === null ? '2:00' : fmt(left)}</span>
    </div>
  )}
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดจอทดลองเล่น"
            className="btn-jelly inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold"
          >
            <X className="w-4 h-4" /> <span className="hidden sm:inline">ปิด</span>
          </button>
        </div>

        {/* จอเกม */}
        <div className="relative flex-1 min-h-0 bg-black">
          {url && !frameGone && (
            <iframe
              src={url}
              title={`ทดลองเล่น ${media.title}`}
              onLoad={() => {
                // เกมที่ไม่ได้ส่งสัญญาณ: เริ่มนับหลังโหลดเสร็จเล็กน้อย
                setTimeout(startTimer, 1500);
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
                <Loader2 className="w-5 h-5 animate-spin" /> กำลังเตรียมเกมให้ลองเล่น...
              </p>
            </div>
          )}

          {phase === 'error' && (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center text-white">
              <div className="max-w-sm">
                <p className="font-display text-xl mb-2">เปิดโหมดทดลองไม่ได้</p>
                <p className="text-white/80 mb-5">{error}</p>
                <button onClick={onClose} className="btn-primary-grad btn-jelly px-6 py-3 rounded-2xl font-display">ปิด</button>
              </div>
            </div>
          )}

          {/* หมดเวลา: โปรโมทสมัครสมาชิก */}
          {ended && (
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
                      <Link href="/membership" onClick={onClose} className="btn-primary-grad btn-jelly inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-display text-lg">
                        <Crown className="w-5 h-5" /> ดูแพลนสมาชิก เริ่ม 39 บาท
                      </Link>
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
                  <button type="button" onClick={onClose} className="btn-jelly px-6 py-2.5 rounded-2xl text-gray-600 dark:text-gray-300 font-semibold">
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
