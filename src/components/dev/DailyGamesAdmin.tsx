'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { CalendarCheck2, Gift, Loader2, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { MediaItem } from '@/types/database';
import { WEEKDAY_TH, autoPickDaily, bkkParts, shiftDate } from '@/lib/companion';
import { cn } from '@/lib/utils/cn';

interface Row {
  id: string;
  day: string;
  media_id: string;
  unlock: boolean;
  note: string | null;
}

const DAYS_AHEAD = 14;

const thDate = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  return `${WEEKDAY_TH[dt.getUTCDay()]} ${dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
};

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

/**
 * ตั้ง "เกมประจำวัน" ล่วงหน้า (ฟังก์ชันของ Dev)
 * วันที่ไม่ได้ตั้ง = ระบบเลือกอัตโนมัติ จากเกมที่เผยแพร่อยู่
 */
export function DailyGamesAdmin({ mediaList }: { mediaList: MediaItem[] }) {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const { success, error } = useToast();

  const today = bkkParts().date;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);

  const [day, setDay] = useState(today);
  const [mediaId, setMediaId] = useState('');
  const [unlock, setUnlock] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const published = useMemo(() => mediaList.filter((m) => m.is_public !== false), [mediaList]);
  const byId = useMemo(() => new Map(mediaList.map((m) => [m.id, m])), [mediaList]);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from('daily_games')
      .select('id, day, media_id, unlock, note')
      .gte('day', today)
      .order('day', { ascending: true })
      .limit(200);
    if (e) {
      if (/daily_games|schema cache|does not exist/i.test(e.message) || (e as { code?: string }).code === '42P01' || (e as { code?: string }).code === 'PGRST205') {
        setMissingTable(true);
      } else {
        error(e.message);
      }
    } else {
      setMissingTable(false);
      setRows((data || []) as Row[]);
    }
    setLoading(false);
  }, [supabase, today, error]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!mediaId && published.length) setMediaId(published[0].id);
  }, [published, mediaId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaId || !day) return;
    if (day < today) {
      error('เลือกวันนี้หรือวันในอนาคตเท่านั้น');
      return;
    }
    setSaving(true);
    const { error: err } = await supabase
      .from('daily_games')
      .upsert({ day, media_id: mediaId, unlock, note: note.trim() || null, created_by: user?.id ?? null }, { onConflict: 'day' });
    setSaving(false);
    if (err) {
      error(err.message);
      return;
    }
    success(`ตั้งเกมประจำวันที่ ${thDate(day)} แล้ว`);
    setNote('');
    load();
  };

  const remove = async (id: string) => {
    const { error: err } = await supabase.from('daily_games').delete().eq('id', id);
    if (err) {
      error(err.message);
      return;
    }
    success('ยกเลิกการตั้งแล้ว วันนั้นจะกลับไปเลือกอัตโนมัติ');
    load();
  };

  const upcoming = Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const d = shiftDate(today, i);
    const set = rows.find((r) => r.day === d) || null;
    const auto = set ? null : autoPickDaily(published, d);
    return { d, set, auto, media: set ? byId.get(set.media_id) : auto };
  });

  if (loading) return <div className="py-12 flex justify-center text-indigo-500"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  if (missingTable) {
    return (
      <div className="surface p-6 text-center">
        <p className="font-bold text-gray-900 dark:text-white mb-1">ยังไม่ได้สร้างตารางเกมประจำวัน</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          เปิดไฟล์ <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">supabase/migrations/005_daily_games.sql</code> แล้วรันใน Supabase SQL Editor 1 ครั้ง จากนั้นรีเฟรชหน้านี้
        </p>
        <p className="text-xs text-gray-500 mt-2">ระหว่างนี้ หน้าแรกยังแสดงเกมประจำวันแบบอัตโนมัติอยู่</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-sm text-amber-900 dark:text-amber-200">
        <CalendarCheck2 className="w-5 h-5 shrink-0 mt-0.5" />
        <p>
          เกมประจำวันจะขึ้นบนหน้าแรกของทุกคน พร้อมนับถอยหลังถึงเที่ยงคืน (เวลาไทย) วันไหนไม่ได้ตั้งไว้ ระบบเลือกให้อัตโนมัติจากเกมที่เผยแพร่อยู่ (ไม่ซ้ำกับเมื่อวาน)
          ปกติทุกเกมเล่นเต็มได้เฉพาะสมาชิก (คนทั่วไปกดทดลองเล่น 2 นาทีได้) ถ้าติ๊ก &quot;แจกเล่นฟรีเฉพาะวันนั้น&quot; เกมนี้จะเล่นได้ทุกคนเฉพาะวันนั้น เป็นโปรโมชันพิเศษ ส่วนเกมที่ตั้งอัตโนมัติจะไม่แจกฟรี
        </p>
      </div>

      <form onSubmit={save} className="surface p-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">วันที่</label>
          <input type="date" min={today} value={day} onChange={(e) => setDay(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">เกมที่จะเป็นเกมประจำวัน</label>
          <select value={mediaId} onChange={(e) => setMediaId(e.target.value)} required className={inputCls}>
            {published.length === 0 && <option value="">ยังไม่มีสื่อที่เผยแพร่</option>}
            {published.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">ข้อความโปรย (ไม่บังคับ ไม่เกิน 200 ตัวอักษร)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="เช่น วันนี้มาฝึกอ่านนาฬิกากันเถอะ" className={inputCls} />
        </div>
        <label className="sm:col-span-2 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 cursor-pointer select-none">
          <input type="checkbox" checked={unlock} onChange={(e) => setUnlock(e.target.checked)} className="w-5 h-5 accent-indigo-600" />
          <span className="inline-flex items-center gap-1.5 font-semibold"><Gift className="w-4 h-4 text-emerald-600" /> แจกเล่นฟรีเฉพาะวันนั้น (โปรโมชัน ทุกคนเล่นเกมนี้ได้เต็มรูปแบบ)</span>
        </label>
        <div className="sm:col-span-2 flex justify-end">
          <button type="submit" disabled={saving || !mediaId} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-50 inline-flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} บันทึกเกมประจำวัน
          </button>
        </div>
      </form>

      <div>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">ตารางล่วงหน้า {DAYS_AHEAD} วัน</h3>
        <ul className="rounded-2xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden bg-white dark:bg-gray-900">
          {upcoming.map(({ d, set, media, auto }) => (
            <li key={d} className="flex items-center gap-3 p-3">
              <div className="w-28 shrink-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{thDate(d)}</p>
                {d === today && <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">วันนี้</span>}
              </div>
              {media ? (
                <>
                  <Image src={media.icon_url} alt="" width={40} height={40} className="rounded-lg object-cover w-10 h-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{media.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {set ? (
                        <>
                          <span className="text-indigo-600 dark:text-indigo-300 font-semibold">แอดมินตั้งไว้</span>
                          {set.unlock ? ' · แจกเล่นฟรีวันนั้น' : ''}
                          {set.note ? ` · ${set.note}` : ''}
                        </>
                      ) : (
                        <span>อัตโนมัติ{auto ? '' : ''}</span>
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <p className="flex-1 text-sm text-gray-400">ยังไม่มีเกมให้เลือก</p>
              )}
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => { setDay(d); if (set) { setMediaId(set.media_id); setUnlock(set.unlock); setNote(set.note || ''); } }} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700">
                  {set ? 'แก้ไข' : 'กำหนดเอง'}
                </button>
                {set && (
                  <button type="button" onClick={() => remove(set.id)} aria-label="ยกเลิกการตั้ง" className={cn('p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40')}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
