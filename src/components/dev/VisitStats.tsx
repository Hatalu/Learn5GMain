'use client';

import React, { useEffect, useState } from 'react';
import { Globe2, Loader2, UserCheck, UserRound } from 'lucide-react';

interface Data {
  total: number;
  today: number;
  d7: number;
  d30: number;
  members30: number;
  guests30: number;
  series: { day: string; guests: number; members: number }[];
}

const n = (v: number) => v.toLocaleString('th-TH');
const shortDay = (d: string) => {
  const [, m, day] = d.split('-').map(Number);
  return `${day}/${m}`;
};

/** สถิติการเข้าเว็บไซต์ (1 IP นับ 1 ครั้งต่อ 30 นาที) */
export function VisitStats() {
  const [data, setData] = useState<Data | null>(null);
  const [missing, setMissing] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/dev/visits', { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'โหลดไม่สำเร็จ');
        if (j.missing) setMissing(true);
        else setData(j);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ'));
  }, []);

  const max = data ? Math.max(1, ...data.series.map((s) => s.guests + s.members)) : 1;
  const mPct = data && data.d30 > 0 ? Math.round((data.members30 / data.d30) * 100) : 0;

  return (
    <section className="mb-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 shadow-sm p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white flex items-center justify-center shadow-md">
          <Globe2 className="w-5 h-5" />
        </span>
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white leading-tight">สถิติการเข้าเว็บไซต์</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">นับทั้งผู้ที่มีบัญชีและไม่มีบัญชี 1 IP นับ 1 ครั้งต่อ 30 นาที (ไม่นับบอทและบัญชี Dev)</p>
        </div>
      </div>

      {err ? (
        <p className="text-sm text-rose-600">{err}</p>
      ) : missing ? (
        <p className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-sm text-amber-900 dark:text-amber-200">
          ยังไม่มีตารางสถิติ เปิดไฟล์ <code className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-gray-800">supabase/migrations/014_site_visits.sql</code> แล้วรันใน Supabase SQL Editor 1 ครั้ง (ต้องรัน 013 ก่อน)
        </p>
      ) : !data ? (
        <div className="py-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin inline" /></div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['วันนี้', data.today, 'from-emerald-400/20 to-teal-400/10'],
              ['7 วันล่าสุด', data.d7, 'from-sky-400/20 to-indigo-400/10'],
              ['30 วันล่าสุด', data.d30, 'from-violet-400/20 to-fuchsia-400/10'],
              ['ทั้งหมด', data.total, 'from-amber-400/20 to-orange-400/10'],
            ].map(([l, v, g]) => (
              <div key={l as string} className={`p-3.5 rounded-2xl bg-gradient-to-br ${g} border border-gray-100 dark:border-gray-800`}>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">เข้าเว็บ{l}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{n(v as number)}</p>
              </div>
            ))}
          </div>

          {/* กราฟรายวัน */}
          <div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
              <span>14 วันล่าสุด (เวลาไทย)</span>
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> สมาชิก</span>
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-sky-300" /> ไม่มีบัญชี</span>
            </div>
            <div className="flex items-end gap-1.5 h-36">
              {data.series.map((s) => {
                const total = s.guests + s.members;
                return (
                  <div key={s.day} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1" title={`${shortDay(s.day)}: ${n(total)} ครั้ง (สมาชิก ${n(s.members)} / ไม่มีบัญชี ${n(s.guests)})`}>
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 tabular-nums">{total > 0 ? n(total) : ''}</span>
                    <div className="w-full flex flex-col justify-end rounded-t-lg overflow-hidden bg-gray-100 dark:bg-gray-800/60" style={{ height: `${Math.max(4, (total / max) * 100)}%` }}>
                      <div className="bg-sky-300" style={{ height: total ? `${(s.guests / total) * 100}%` : 0 }} />
                      <div className="bg-indigo-500" style={{ height: total ? `${(s.members / total) * 100}%` : 0 }} />
                    </div>
                    <span className="text-[10px] text-gray-400 tabular-nums">{shortDay(s.day)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* สัดส่วน 30 วัน */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">สัดส่วน 30 วันล่าสุด</p>
            <div className="h-3 rounded-full overflow-hidden bg-sky-300/60 flex">
              <div className="bg-indigo-500 h-full transition-all" style={{ width: `${mPct}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-700 dark:text-gray-200">
              <span className="inline-flex items-center gap-1.5"><UserCheck className="w-4 h-4 text-indigo-500" /> สมาชิก {n(data.members30)} ({mPct}%)</span>
              <span className="inline-flex items-center gap-1.5"><UserRound className="w-4 h-4 text-sky-500" /> ไม่มีบัญชี {n(data.guests30)} ({data.d30 ? 100 - mPct : 0}%)</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
