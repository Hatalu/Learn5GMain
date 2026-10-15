'use client';

import React, { useEffect, useState } from 'react';
import { Heart, Loader2, MousePointerClick, PlayCircle, X } from 'lucide-react';
import { MediaItem } from '@/types/database';

interface Stats {
  title: string;
  plays: number;
  favorites: number;
  trials: { total: number; today: number; d7: number; d30: number };
  trialsReady: boolean;
}

const n = (v: number) => v.toLocaleString('th-TH');

/** สถิติของสื่อ/เกมแต่ละอัน (หน้า Dev) */
export function MediaStatsModal({ media, onClose }: { media: MediaItem | null; onClose: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!media) return;
    setStats(null);
    setErr('');
    fetch(`/api/dev/media-stats?id=${media.id}`, { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'โหลดไม่สำเร็จ');
        setStats(j);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ'));
  }, [media]);

  if (!media) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-5 sm:p-6"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-500">สถิติสื่อ</p>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-snug">{media.title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {err ? (
          <p className="text-sm text-rose-600">{err}</p>
        ) : !stats ? (
          <div className="py-10 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin inline" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
                <MousePointerClick className="w-5 h-5 text-emerald-600" />
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{n(stats.plays)}</p>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">กดเล่น (ครั้ง)</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
                <PlayCircle className="w-5 h-5 text-amber-600" />
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{n(stats.trials.total)}</p>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">กดทดลองเล่น (ครั้ง)</p>
              </div>
            </div>
            {stats.trialsReady ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                {(
                  [
                    ['วันนี้', stats.trials.today],
                    ['7 วัน', stats.trials.d7],
                    ['30 วัน', stats.trials.d30],
                  ] as [string, number][]
                ).map(([l, v]) => (
                  <div key={l} className="py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{n(v)}</p>
                    <p className="text-xs text-gray-500">ทดลองเล่น{l}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-300">ยังไม่ได้รัน 012_trial_plays.sql จึงยังไม่มียอดทดลองเล่น</p>
            )}
            <p className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
              <Heart className="w-4 h-4 text-rose-500" /> ถูกใจ {n(stats.favorites)} คน
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              &quot;กดเล่น&quot; นับเมื่อกดเปิดเกมเต็มรูปแบบ (กันปั่นยอด 1 ครั้งต่อ IP ต่อ 10 นาที) ส่วนยอดทดลองเล่นนับทุกครั้งที่กดปุ่มทดลองเล่น
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
