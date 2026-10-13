'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Award,
  CalendarClock,
  CheckCircle2,
  Clock,
  Compass,
  Crosshair,
  Flame,
  Lock,
  Palette,
  Play,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Navbar } from '@/components/navbar/Navbar';
import { Avatar } from '@/components/kids/Avatar';
import { Buddy } from '@/components/kids/Buddy';
import { StarIcon, StarRow } from '@/components/kids/Stars';
import { createClient } from '@/lib/supabase/client';
import { api, errMsg } from '@/lib/client/api';
import { BUDDY_COLORS, BUDDY_COLOR_HEX, BUDDY_STAGES, HATS, HAT_INFO, Hat } from '@/lib/gamify';
import { cn } from '@/lib/utils/cn';

interface Mission {
  key: string;
  title: string;
  target: number;
  reward: number;
  progress: number;
  done: boolean;
  claimed: boolean;
}
interface HomeData {
  profile: { name: string; grade: string | null; avatar: string };
  stats: { starsTotal: number; playsTotal: number; streak: number; bestStreak: number };
  buddy: { stage: number; stageName: string; nextAt: number | null; color: string; hat: Hat; unlockedHats: Hat[] };
  missions: Mission[];
  badges: { key: string; title: string; desc: string; tone: string; icon: string; earnedAt: string | null }[];
  stickers: Record<string, number>;
  assignments: {
    id: string;
    mediaId: string;
    note: string | null;
    dueAt: string | null;
    className: string;
    media: { id: string; title: string; icon_url: string; subject: string } | null;
    bestStars: number | null;
  }[];
  limit: { minutes: number | null; used: number };
}
interface MediaLite {
  id: string;
  title: string;
  icon_url: string;
  subject: string;
  access_tier: string;
  media_type: string;
}

const TONE: Record<string, string> = {
  violet: 'from-indigo-400 to-violet-500',
  pink: 'from-pink-400 to-rose-500',
  mint: 'from-mint-400 to-emerald-500',
  sky: 'from-sky-400 to-blue-500',
  sun: 'from-sun-400 to-orange-500',
};
const BADGE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  play: Play,
  flame: Flame,
  star: Sparkles,
  compass: Compass,
  target: Crosshair,
  palette: Palette,
};

export default function StudentHomePage() {
  const { profile, isLoading: authLoading } = useAuth();
  const { success, error } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<HomeData | null>(null);
  const [media, setMedia] = useState<MediaLite[]>([]);
  const [loadError, setLoadError] = useState('');
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<HomeData>('/api/me/home');
      setData(d);
      setLoadError('');
    } catch (e) {
      setLoadError(errMsg(e));
    }
  }, []);

  useEffect(() => {
    if (authLoading || !profile) return;
    load();
    supabase
      .from('media')
      .select('id, title, icon_url, subject, access_tier, media_type')
      .order('created_at', { ascending: true })
      .then(({ data: rows }) => setMedia(((rows || []) as MediaLite[]).filter((m) => (m as { is_public?: boolean }).is_public !== false)));
  }, [authLoading, profile, load, supabase]);

  const premiumActive = !!profile?.premium_until && new Date(profile.premium_until).getTime() > Date.now();

  const claim = async (key: string) => {
    setClaiming(key);
    try {
      const r = await api<{ reward: number }>('/api/me/missions/claim', { method: 'POST', body: { missionKey: key } });
      success(`ได้ดาวโบนัส +${r.reward} ดวง!`);
      await load();
    } catch (e) {
      error(errMsg(e));
    } finally {
      setClaiming(null);
    }
  };

  const setBuddy = async (patch: { color?: string; hat?: string }) => {
    if (!data) return;
    // อัปเดตทันทีให้รู้สึกไว แล้วค่อยบันทึก
    setData({
      ...data,
      buddy: { ...data.buddy, color: patch.color ?? data.buddy.color, hat: (patch.hat as Hat) ?? data.buddy.hat },
    });
    try {
      await api('/api/me/buddy', { method: 'POST', body: patch });
    } catch (e) {
      error(errMsg(e));
      load();
    }
  };

  if (authLoading || (!data && !loadError)) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-5xl mx-auto p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-3xl bg-gray-200/70 dark:bg-gray-800/70 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-xl mx-auto p-6 text-center">
          <div className="surface p-8">
            <p className="font-display text-xl text-gray-900 dark:text-white mb-2">ยังเปิดห้องผจญภัยไม่ได้</p>
            <p className="text-gray-600 dark:text-gray-300">{loadError}</p>
            <button onClick={load} className="btn-primary-grad btn-jelly mt-5 px-6 py-3 rounded-2xl font-display">
              ลองอีกครั้ง
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { buddy, stats } = data;
  const nextAt = buddy.nextAt;
  const prevAt = BUDDY_STAGES[buddy.stage].min;
  const pct = nextAt ? Math.min(100, Math.round(((stats.starsTotal - prevAt) / (nextAt - prevAt)) * 100)) : 100;
  const limitPct = data.limit.minutes ? Math.min(100, Math.round((data.limit.used / data.limit.minutes) * 100)) : 0;
  const bySubject = ['คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาอังกฤษ']
    .map((s) => ({ subject: s, items: media.filter((m) => m.subject === s) }))
    .filter((g) => g.items.length);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* ส่วนหัว + ตัวละคร */}
        <section className="relative overflow-hidden rounded-[2rem] border-2 border-white/20 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-600 dark:from-indigo-800 dark:via-indigo-900 dark:to-violet-800 shadow-toy-lg p-5 sm:p-8 text-white">
          <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1.2px, transparent 0)', backgroundSize: '26px 26px' }} />
          <div className="relative grid sm:grid-cols-[auto_1fr] gap-6 items-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-white/10 p-4">
                <Buddy stage={buddy.stage} color={buddy.color} hat={buddy.hat} size={180} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <Avatar name={data.profile.avatar} size={52} ring />
                <div>
                  <h1 className="text-2xl sm:text-3xl font-medium leading-tight">สวัสดี {data.profile.name}!</h1>
                  <p className="text-white/80 text-sm">{data.profile.grade ? `${data.profile.grade} · ` : ''}วันนี้เล่นอะไรดี</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/15 border border-white/15">
                  <StarIcon className="w-6 h-6" />
                  <div className="leading-tight"><span className="block font-display text-xl">{stats.starsTotal}</span><span className="text-xs text-white/75">ดาวสะสม</span></div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/15 border border-white/15">
                  <Flame className="w-6 h-6 text-orange-300" />
                  <div className="leading-tight"><span className="block font-display text-xl">{stats.streak}</span><span className="text-xs text-white/75">วันติดต่อกัน</span></div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/15 border border-white/15">
                  <Award className="w-6 h-6 text-mint-400" />
                  <div className="leading-tight"><span className="block font-display text-xl">{data.badges.filter((b) => b.earnedAt).length}</span><span className="text-xs text-white/75">ตราที่ได้</span></div>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-semibold">{buddy.stageName}</span>
                  <span className="text-white/80">{nextAt ? `อีก ${Math.max(0, nextAt - stats.starsTotal)} ดาวจะโตขึ้น` : 'โตเต็มที่แล้ว!'}</span>
                </div>
                <div className="h-3.5 rounded-full bg-black/25 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="ความคืบหน้าของตัวละคร">
                  <div className="h-full rounded-full bg-gradient-to-r from-sun-300 to-sun-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
              </div>

              {data.limit.minutes && (
                <p className="mt-4 flex items-center gap-2 text-sm text-white/85">
                  <Clock className="w-4 h-4" />
                  วันนี้เล่นไปแล้ว {data.limit.used} จาก {data.limit.minutes} นาที
                  <span className="flex-1 h-1.5 rounded-full bg-black/25 overflow-hidden max-w-[8rem]"><span className="block h-full bg-mint-400" style={{ width: `${limitPct}%` }} /></span>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ภารกิจวันนี้ */}
        <section aria-labelledby="missions">
          <h2 id="missions" className="text-2xl font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-indigo-500" /> ภารกิจวันนี้
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {data.missions.map((m) => (
              <div key={m.key} className={cn('surface p-4 shadow-toy', m.claimed && 'opacity-70')}>
                <p className="font-display text-lg text-gray-900 dark:text-white leading-snug min-h-[3.2rem]">{m.title}</p>
                <div className="mt-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden" role="progressbar" aria-valuenow={m.progress} aria-valuemin={0} aria-valuemax={m.target}>
                  <div className="h-full rounded-full bg-gradient-to-r from-mint-400 to-mint-600 transition-all duration-500" style={{ width: `${(m.progress / m.target) * 100}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{m.progress}/{m.target}</span>
                  {m.claimed ? (
                    <span className="inline-flex items-center gap-1 text-mint-600 text-sm font-semibold"><CheckCircle2 className="w-4 h-4" /> รับแล้ว</span>
                  ) : (
                    <button
                      onClick={() => claim(m.key)}
                      disabled={!m.done || claiming === m.key}
                      className={cn('btn-jelly inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold', m.done ? 'bg-gradient-to-r from-sun-400 to-orange-500 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed')}
                    >
                      <StarIcon className="w-4 h-4" /> +{m.reward} ดาว
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* งานจากครู */}
        {data.assignments.length > 0 && (
          <section aria-labelledby="assigned">
            <h2 id="assigned" className="text-2xl font-medium text-gray-900 dark:text-white mb-3">งานจากคุณครู</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {data.assignments.map((a) => (
                <Link key={a.id} href={`/play/${a.mediaId}`} className="surface p-3 flex items-center gap-4 shadow-toy hover:-translate-y-1 transition-transform">
                  {a.media && <Image src={a.media.icon_url} alt="" width={72} height={72} className="rounded-2xl object-cover w-[72px] h-[72px]" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-gray-900 dark:text-white truncate">{a.media?.title || 'สื่อ'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{a.className}{a.note ? ` · ${a.note}` : ''}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StarRow count={a.bestStars} />
                      {a.dueAt && <span className="text-xs text-rose-600 dark:text-rose-300">ส่งภายใน {new Date(a.dueAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>}
                    </div>
                  </div>
                  <span className="btn-primary-grad w-11 h-11 rounded-full flex items-center justify-center shrink-0"><Play className="w-5 h-5 fill-current" /></span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* แผนที่ผจญภัย */}
        <section aria-labelledby="map">
          <h2 id="map" className="text-2xl font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Compass className="w-6 h-6 text-indigo-500" /> แผนที่ผจญภัย
          </h2>
          {bySubject.length === 0 ? (
            <p className="text-gray-500">กำลังเตรียมด่านให้หนู...</p>
          ) : (
            <div className="space-y-6">
              {bySubject.map(({ subject, items }) => (
                <div key={subject}>
                  <h3 className="text-lg font-display text-gray-700 dark:text-gray-200 mb-3">{subject}</h3>
                  <div className="relative">
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full border-t-4 border-dashed border-indigo-200 dark:border-indigo-900 pointer-events-none hidden sm:block" aria-hidden="true" />
                    <div className="relative flex gap-5 overflow-x-auto pb-4 pt-2 px-1 hide-scrollbar snap-x">
                      {items.map((m, idx) => {
                        const best = data.stickers[m.id];
                        const locked = m.access_tier !== 'free' && !premiumActive;
                        return (
                          <Link
                            key={m.id}
                            href={locked ? '#' : `/play/${m.id}`}
                            onClick={(e) => {
                              if (locked) {
                                e.preventDefault();
                                error('ด่านนี้สำหรับสมาชิก Premium ขอให้ผู้ปกครองหรือครูช่วยปลดล็อกนะ');
                              }
                            }}
                            className="group snap-start shrink-0 w-36 text-center"
                          >
                            <div className={cn('relative mx-auto w-28 h-28 rounded-[2rem] overflow-hidden border-4 shadow-toy transition-transform group-hover:-translate-y-1 group-hover:rotate-[-3deg]', best >= 3 ? 'border-sun-400' : best ? 'border-mint-400' : 'border-white dark:border-gray-700')}>
                              <Image src={m.icon_url} alt="" fill sizes="112px" className={cn('object-cover', locked && 'grayscale opacity-60')} />
                              {locked && <span className="absolute inset-0 flex items-center justify-center bg-black/30"><Lock className="w-8 h-8 text-white" /></span>}
                              <span className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-indigo-600 text-white text-sm font-display flex items-center justify-center ring-2 ring-white">{idx + 1}</span>
                            </div>
                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug">{m.title}</p>
                            <StarRow count={best ?? 0} className="mt-1 justify-center" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ตกแต่งตัวละคร */}
        <section aria-labelledby="dress" className="surface p-5 sm:p-6 shadow-toy">
          <h2 id="dress" className="text-2xl font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Palette className="w-6 h-6 text-indigo-500" /> แต่งตัวคู่หู
          </h2>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">สี</p>
          <div className="flex flex-wrap gap-3 mb-5">
            {BUDDY_COLORS.map((c) => (
              <button key={c} onClick={() => setBuddy({ color: c })} aria-label={`สี ${c}`} aria-pressed={buddy.color === c} className={cn('btn-jelly w-11 h-11 rounded-full border-4', buddy.color === c ? 'border-gray-900 dark:border-white scale-110' : 'border-white dark:border-gray-700')} style={{ background: BUDDY_COLOR_HEX[c].body }} />
            ))}
          </div>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">เครื่องแต่งตัว</p>
          <div className="flex flex-wrap gap-3">
            {HATS.map((h) => {
              const open = buddy.unlockedHats.includes(h);
              return (
                <button key={h} disabled={!open} onClick={() => setBuddy({ hat: h })} aria-pressed={buddy.hat === h} title={open ? '' : HAT_INFO[h].hint} className={cn('btn-jelly px-4 py-2.5 rounded-2xl border-2 text-sm font-semibold text-left', buddy.hat === h ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200', !open && 'opacity-60 cursor-not-allowed')}>
                  <span className="flex items-center gap-1.5">{!open && <Lock className="w-3.5 h-3.5" />}{HAT_INFO[h].label}</span>
                  {!open && <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">{HAT_INFO[h].hint}</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* ตรา */}
        <section aria-labelledby="badges">
          <h2 id="badges" className="text-2xl font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-500" /> ตราของหนู
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {data.badges.map((b) => {
              const Icon = BADGE_ICON[b.icon] || Award;
              const got = !!b.earnedAt;
              return (
                <div key={b.key} className={cn('surface p-3 text-center', !got && 'opacity-55')}>
                  <span className={cn('mx-auto w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md bg-gradient-to-br', got ? TONE[b.tone] : 'from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700')}>
                    {got ? <Icon className="w-7 h-7" /> : <Lock className="w-6 h-6" />}
                  </span>
                  <p className="mt-2 font-display text-sm text-gray-900 dark:text-white leading-tight">{b.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* สมุดสติกเกอร์ */}
        {media.length > 0 && (
          <section aria-labelledby="stickers">
            <h2 id="stickers" className="text-2xl font-medium text-gray-900 dark:text-white mb-1">สมุดสติกเกอร์</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">เล่นเกมให้ได้ดาวเพื่อสะสมสติกเกอร์ประจำเกม (3 ดาว = สติกเกอร์ทอง)</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
              {media.map((m) => {
                const best = data.stickers[m.id] || 0;
                return (
                  <div key={m.id} className="text-center">
                    <div className={cn('relative aspect-square rounded-3xl overflow-hidden border-4', best >= 3 ? 'border-sun-400 shadow-[0_0_0_3px_rgba(255,197,58,0.35)]' : best ? 'border-gray-300 dark:border-gray-500' : 'border-dashed border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800')}>
                      {best > 0 ? <Image src={m.icon_url} alt={m.title} fill sizes="120px" className="object-cover" /> : <span className="absolute inset-0 flex items-center justify-center"><StarIcon filled={false} className="w-8 h-8" /></span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
