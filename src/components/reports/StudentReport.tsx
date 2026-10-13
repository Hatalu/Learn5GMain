'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2, Printer, Target, TrendingUp } from 'lucide-react';
import { api, errMsg } from '@/lib/client/api';
import { Avatar } from '@/components/kids/Avatar';
import { StarRow } from '@/components/kids/Stars';
import { cn } from '@/lib/utils/cn';

interface Report {
  student: { id: string; name: string; grade: string | null; avatar: string };
  days: number;
  summary: {
    plays: number;
    minutes: number;
    starsInPeriod: number;
    activeDays: number;
    starsTotal: number;
    streak: number;
    bestStreak: number;
    buddyStage: string;
  };
  perDay: { date: string; minutes: number; plays: number; stars: number }[];
  perGame: {
    mediaId: string;
    media: { title: string; subject: string; icon_url: string } | null;
    plays: number;
    bestStars: number;
    accuracy: number | null;
    lastPlayed: string;
  }[];
  weakTopics: { topic: string; count: number }[];
}

const thDate = (s: string) => new Date(`${s}T00:00:00+07:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

/** กราฟแท่งนาทีที่เล่นต่อวัน (SVG) */
function MinutesChart({ data }: { data: Report['perDay'] }) {
  const max = Math.max(10, ...data.map((d) => d.minutes));
  const w = 100 / data.length;
  return (
    <svg viewBox="0 0 100 46" className="w-full h-40" role="img" aria-label="กราฟนาทีที่เล่นต่อวัน" preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = (d.minutes / max) * 34;
        return (
          <g key={d.date}>
            <rect x={i * w + w * 0.18} y={38 - h} width={w * 0.64} height={Math.max(h, d.minutes > 0 ? 1 : 0)} rx="1.2" className="fill-indigo-500" />
            {d.minutes > 0 && data.length <= 14 && (
              <text x={i * w + w / 2} y={36 - h} textAnchor="middle" fontSize="3" className="fill-gray-600 dark:fill-gray-300">{d.minutes}</text>
            )}
            {(data.length <= 10 || i % Math.ceil(data.length / 8) === 0) && (
              <text x={i * w + w / 2} y="44" textAnchor="middle" fontSize="2.8" className="fill-gray-500">{thDate(d.date)}</text>
            )}
          </g>
        );
      })}
      <line x1="0" y1="38" x2="100" y2="38" className="stroke-gray-300 dark:stroke-gray-600" strokeWidth="0.3" />
    </svg>
  );
}

/** รายงานความก้าวหน้ารายบุคคล (พิมพ์ได้) */
export function StudentReport({ studentId }: { studentId: string }) {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off = false;
    setLoading(true);
    api<Report>(`/api/reports/student/${studentId}?days=${days}`)
      .then((r) => !off && (setData(r), setError('')))
      .catch((e) => !off && setError(errMsg(e)))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [studentId, days]);

  if (loading && !data) {
    return (
      <div className="py-16 flex justify-center text-indigo-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  if (error || !data) return <p className="py-8 text-center text-rose-600">{error || 'โหลดรายงานไม่ได้'}</p>;

  const s = data.summary;
  const empty = s.plays === 0;

  return (
    <div className="print-area-wrap">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="inline-flex rounded-2xl bg-gray-100 dark:bg-gray-800 p-1" role="group" aria-label="ช่วงเวลา">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} aria-pressed={days === d} className={cn('px-4 py-2 rounded-xl text-sm font-semibold transition-colors', days === d ? 'bg-white dark:bg-gray-700 shadow text-indigo-700 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-300')}>
              {d} วัน
            </button>
          ))}
        </div>
        <button onClick={() => window.print()} className="btn-jelly inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <Printer className="w-4 h-4" /> พิมพ์รายงาน
        </button>
      </div>

      <div className="print-area">
        <div className="flex items-center gap-3 mb-4">
          <Avatar name={data.student.avatar} size={56} ring />
          <div>
            <p className="font-display text-xl text-gray-900 dark:text-white">{data.student.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data.student.grade ? `${data.student.grade} · ` : ''}รายงานย้อนหลัง {data.days} วัน · คู่หู: {s.buddyStage}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'เวลาที่เล่น', value: `${s.minutes} นาที` },
            { label: 'จำนวนรอบ', value: `${s.plays} รอบ` },
            { label: 'วันที่เข้าเล่น', value: `${s.activeDays}/${data.days} วัน` },
            { label: 'ดาวที่ได้', value: `${s.starsInPeriod} ดวง` },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 p-3 text-center">
              <p className="font-display text-xl text-indigo-800 dark:text-indigo-200">{c.value}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{c.label}</p>
            </div>
          ))}
        </div>

        {empty ? (
          <p className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-6 text-center text-gray-600 dark:text-gray-300">ช่วงนี้ยังไม่มีการเล่น ลองชวนเล่นสัก 10 นาทีต่อวันนะ</p>
        ) : (
          <>
            <h3 className="flex items-center gap-2 font-display text-lg text-gray-900 dark:text-white mb-1"><TrendingUp className="w-5 h-5 text-indigo-500" /> นาทีที่เล่นต่อวัน</h3>
            <MinutesChart data={data.perDay} />

            <h3 className="font-display text-lg text-gray-900 dark:text-white mt-5 mb-2">เกมที่เล่น</h3>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {data.perGame.map((g) => (
                <li key={g.mediaId} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900">
                  {g.media && <Image src={g.media.icon_url} alt="" width={44} height={44} className="rounded-xl object-cover w-11 h-11" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{g.media?.title || 'สื่อ'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{g.media?.subject} · เล่น {g.plays} รอบ{g.accuracy !== null ? ` · ตอบถูก ${g.accuracy}%` : ''}</p>
                  </div>
                  <StarRow count={g.bestStars} />
                </li>
              ))}
            </ul>

            <h3 className="flex items-center gap-2 font-display text-lg text-gray-900 dark:text-white mt-5 mb-2"><Target className="w-5 h-5 text-rose-500" /> จุดที่ควรช่วยเสริม</h3>
            {data.weakTopics.length ? (
              <ul className="flex flex-wrap gap-2">
                {data.weakTopics.map((w) => (
                  <li key={w.topic} className="px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm font-semibold border border-rose-200 dark:border-rose-900">
                    {w.topic} <span className="text-rose-400">x{w.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">ยังไม่พบจุดที่ผิดซ้ำบ่อย (ขึ้นอยู่กับข้อมูลที่เกมรายงานมา)</p>
            )}
          </>
        )}
        <p className="mt-6 text-xs text-gray-400">ออกโดย สื่อการสอน 5G · {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
      </div>
    </div>
  );
}
