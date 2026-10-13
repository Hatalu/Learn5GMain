'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BookOpen, Clock, ExternalLink, Loader2, Lock, Maximize2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { api, ApiError, errMsg } from '@/lib/client/api';
import { StarRow } from '@/components/kids/Stars';
import { Buddy } from '@/components/kids/Buddy';

interface StartResult {
  title: string;
  url: string;
  sessionId: string | null;
  tracked: boolean;
}
interface Celebration {
  stars: number;
  newBadges: { key: string; title: string }[];
  buddyEvolved: boolean;
  buddyStage: string;
}
interface MediaInfo {
  title: string;
  learning_goal: string | null;
  standards: string[] | null;
}

const BREAK_AFTER_MIN = 20;

function PlayInner() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { profile, isStudent, isLoading } = useAuth();
  const teach = search.get('mode') === 'teach' && !isStudent;

  const [state, setState] = useState<{ phase: 'loading' | 'ready' | 'blocked'; message?: string; premium?: boolean }>({ phase: 'loading' });
  const [game, setGame] = useState<StartResult | null>(null);
  const [info, setInfo] = useState<MediaInfo | null>(null);
  const [showInfo, setShowInfo] = useState(teach);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [breakNow, setBreakNow] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const frameWrap = useRef<HTMLDivElement>(null);
  const startedAt = useRef(Date.now());
  const breakShown = useRef(false);

  const supabase = useMemo(() => createClient(), []);

  // เริ่มรอบการเล่น (ตรวจสิทธิ์ + เวลาที่เหลือที่เซิร์ฟเวอร์)
  useEffect(() => {
    if (isLoading || !profile || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await api<StartResult>('/api/play/start', { method: 'POST', body: { mediaId: id, mode: teach ? 'teach' : 'play' } });
        if (cancelled) return;
        setGame(r);
        setState({ phase: 'ready' });
        startedAt.current = Date.now();
      } catch (e) {
        if (cancelled) return;
        const ae = e instanceof ApiError ? e : null;
        setState({ phase: 'blocked', message: errMsg(e), premium: !!ae?.data?.needPremium });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isLoading, profile, teach]);

  // ข้อมูลหลักสูตรสำหรับคุณครู
  useEffect(() => {
    if (!id || isStudent) return;
    supabase
      .from('media')
      .select('title, learning_goal, standards')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => setInfo((data as MediaInfo) || null));
  }, [id, isStudent, supabase]);

  // จับเวลาเล่น (เฉพาะนักเรียน) + เตือนพักสายตา
  useEffect(() => {
    if (state.phase !== 'ready' || !game?.sessionId) return;
    const sessionId = game.sessionId;
    const beat = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const r = await api<{ limitReached?: boolean }>('/api/play/heartbeat', { method: 'POST', body: { sessionId } });
        if (r.limitReached) setLimitHit(true);
      } catch {
        /* เงียบไว้ ไม่รบกวนการเล่น */
      }
      if (!breakShown.current && (Date.now() - startedAt.current) / 60000 >= BREAK_AFTER_MIN) {
        breakShown.current = true;
        setBreakNow(true);
      }
    };
    const t = setInterval(beat, 30000);
    return () => clearInterval(t);
  }, [state.phase, game?.sessionId]);

  // เกมส่งผลมาให้ฉลอง (postMessage จาก SDK)
  const onMessage = useCallback(
    (ev: MessageEvent) => {
      if (!game) return;
      let origin = '';
      try {
        origin = new URL(game.url).origin;
      } catch {
        return;
      }
      if (ev.origin !== origin) return; // รับเฉพาะจากเกมที่เราเปิดเอง
      const d = ev.data as { type?: string; result?: Celebration };
      if (d?.type === 'l5g:result' && d.result && typeof d.result.stars === 'number') {
        setCelebration(d.result);
      }
    },
    [game]
  );
  useEffect(() => {
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onMessage]);

  const goBack = () => router.push(isStudent ? '/me' : '/home');

  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Buddy stage={1} size={110} />
        <p className="inline-flex items-center gap-2 font-display text-lg text-indigo-600 dark:text-indigo-300">
          <Loader2 className="w-5 h-5 animate-spin" /> กำลังเปิดเกม...
        </p>
      </div>
    );
  }

  if (state.phase === 'blocked' || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="surface max-w-md p-8 text-center shadow-toy-lg">
          <span className="mx-auto w-16 h-16 rounded-2xl bg-sun-400/25 text-amber-600 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8" />
          </span>
          <p className="font-display text-xl text-gray-900 dark:text-white mb-2">{state.premium ? 'ด่านนี้สำหรับสมาชิก Premium' : 'ยังเล่นไม่ได้ตอนนี้'}</p>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{state.message}</p>
          <button onClick={goBack} className="btn-primary-grad btn-jelly px-6 py-3 rounded-2xl font-display">
            กลับไปเลือกเกม
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-950">
      {/* แถบด้านบน */}
      <div className="h-12 shrink-0 flex items-center gap-2 px-2 sm:px-3 bg-gray-900 border-b border-gray-800 text-white">
        <button onClick={goBack} className="btn-jelly inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">{isStudent ? 'กลับห้องผจญภัย' : 'กลับ'}</span>
        </button>
        <p className="flex-1 min-w-0 truncate text-center font-display text-sm sm:text-base">{game.title}</p>
        {!isStudent && (
          <button onClick={() => setShowInfo((v) => !v)} className="btn-jelly inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold">
            <BookOpen className="w-4 h-4" /> <span className="hidden sm:inline">ข้อมูลบทเรียน</span>
          </button>
        )}
        <button
          onClick={() => frameWrap.current?.requestFullscreen?.().catch(() => undefined)}
          className="btn-jelly p-2 rounded-xl bg-white/10 hover:bg-white/20"
          aria-label="เต็มจอ"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <a href={game.url} target="_blank" rel="noopener noreferrer" className="btn-jelly p-2 rounded-xl bg-white/10 hover:bg-white/20 hidden sm:block" aria-label="เปิดในแท็บใหม่" title="เปิดในแท็บใหม่ (ถ้าเกมแสดงผลไม่ปกติ)">
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="relative flex-1 min-h-0 flex">
        <div ref={frameWrap} className="flex-1 min-w-0 bg-black">
          <iframe
            src={game.url}
            title={game.title}
            className="w-full h-full border-0"
            allow="fullscreen; autoplay; clipboard-write; gamepad"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-pointer-lock"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* แผงข้อมูลบทเรียนสำหรับครู */}
        {showInfo && !isStudent && (
          <aside className="absolute sm:static right-0 top-0 bottom-0 w-[min(22rem,90vw)] bg-white dark:bg-gray-900 border-l-2 border-indigo-200 dark:border-indigo-900 p-5 overflow-y-auto z-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg text-gray-900 dark:text-white">ข้อมูลบทเรียน</h2>
              <button onClick={() => setShowInfo(false)} aria-label="ปิด" className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            <p className="font-display text-gray-900 dark:text-white">{info?.title || game.title}</p>
            <h3 className="mt-4 text-sm font-semibold text-gray-500 dark:text-gray-400">จุดประสงค์การเรียนรู้</h3>
            <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">{info?.learning_goal || 'ยังไม่ได้ระบุ (ผู้ดูแลระบบเพิ่มได้ที่หน้า Dev)'}</p>
            <h3 className="mt-4 text-sm font-semibold text-gray-500 dark:text-gray-400">ตัวชี้วัด / มาตรฐาน</h3>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(info?.standards || []).length ? (
                info!.standards!.map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">{s}</span>
                ))
              ) : (
                <span className="text-sm text-gray-500">ยังไม่ได้ระบุ</span>
              )}
            </div>
            <h3 className="mt-5 text-sm font-semibold text-gray-500 dark:text-gray-400">แนวทางใช้สอนหน้าชั้น</h3>
            <ol className="mt-1 text-sm text-gray-800 dark:text-gray-200 list-decimal ml-5 space-y-1.5">
              <li>นำเข้าสู่บทเรียน: ให้นักเรียนทายว่าเกมนี้ฝึกเรื่องอะไร (3 นาที)</li>
              <li>เล่นร่วมกัน: ให้นักเรียนผลัดกันออกมาตอบ อีกครึ่งห้องช่วยคิด (10 นาที)</li>
              <li>สรุป: ถามว่าข้อไหนยากและเพราะอะไร จดสรุปบนกระดาน (5 นาที)</li>
            </ol>
            <Link href={`/teacher/plan/${id}`} target="_blank" className="btn-primary-grad btn-jelly mt-6 block text-center py-3 rounded-2xl font-display">
              พิมพ์แผนการสอน
            </Link>
          </aside>
        )}

        {/* ฉลองผลลัพธ์ */}
        {celebration && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-indigo-950/70 backdrop-blur-sm p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label="สรุปผลการเล่น">
            <div className="surface max-w-sm w-full p-7 text-center shadow-toy-lg animate-pop-in">
              <Buddy stage={celebration.buddyEvolved ? 2 : 1} size={120} className="mx-auto" />
              <p className="font-display text-2xl text-gray-900 dark:text-white mt-2">{celebration.stars >= 3 ? 'เก่งสุดๆ!' : celebration.stars >= 1 ? 'ทำได้ดีมาก!' : 'ลองอีกครั้งนะ!'}</p>
              <StarRow count={celebration.stars} className="my-3 [&_svg]:w-9 [&_svg]:h-9" />
              {celebration.buddyEvolved && <p className="text-indigo-600 dark:text-indigo-300 font-semibold">คู่หูโตขึ้นเป็น {celebration.buddyStage}!</p>}
              {celebration.newBadges.map((b) => (
                <p key={b.key} className="text-amber-600 dark:text-sun-300 font-semibold">ได้ตราใหม่: {b.title}</p>
              ))}
              <button onClick={() => setCelebration(null)} className="btn-primary-grad btn-jelly mt-5 px-8 py-3 rounded-2xl font-display">เล่นต่อ</button>
            </div>
          </div>
        )}

        {/* พักสายตา */}
        {breakNow && !limitHit && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-indigo-950/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
            <div className="surface max-w-sm w-full p-7 text-center shadow-toy-lg animate-pop-in">
              <Buddy stage={1} size={110} className="mx-auto" />
              <p className="font-display text-2xl text-gray-900 dark:text-white mt-2">พักสายตาหน่อยนะ</p>
              <p className="text-gray-600 dark:text-gray-300 mt-2">มองไกลๆ นอกหน้าต่าง 20 วินาที แล้วค่อยเล่นต่อ</p>
              <button onClick={() => setBreakNow(false)} className="btn-primary-grad btn-jelly mt-5 px-8 py-3 rounded-2xl font-display">พักแล้ว เล่นต่อ</button>
            </div>
          </div>
        )}

        {/* ครบเวลาเล่นประจำวัน */}
        {limitHit && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-indigo-950/90 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
            <div className="surface max-w-sm w-full p-7 text-center shadow-toy-lg animate-pop-in">
              <Clock className="w-12 h-12 mx-auto text-indigo-500" />
              <p className="font-display text-2xl text-gray-900 dark:text-white mt-3">ครบเวลาเล่นวันนี้แล้ว</p>
              <p className="text-gray-600 dark:text-gray-300 mt-2">เก่งมาก! พักผ่อนและมาผจญภัยต่อพรุ่งนี้นะ</p>
              <button onClick={() => router.push('/me')} className="btn-primary-grad btn-jelly mt-5 px-8 py-3 rounded-2xl font-display">กลับห้องผจญภัย</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={null}>
      <PlayInner />
    </Suspense>
  );
}
