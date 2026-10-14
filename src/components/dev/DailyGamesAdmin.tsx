'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { CalendarCheck2, CalendarX2, Gift, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { MediaItem } from '@/types/database';
import { WEEKDAY_TH, bkkParts, shiftDate } from '@/lib/companion';
import { AddMediaModal } from '@/components/dev/AddMediaModal';
import { EditMediaModal } from '@/components/dev/EditMediaModal';
import { DeleteConfirmModal } from '@/components/dev/DeleteConfirmModal';

interface Row {
  id: string;
  day: string;
  media_id: string;
  unlock: boolean;
  note: string | null;
}

const DAYS_AHEAD = 30;

const thDate = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  return `${WEEKDAY_TH[dt.getUTCDay()]} ${dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
};

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const label = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5';

/**
 * เกมประจำวัน (ฟังก์ชันของ Dev)
 * - คลังเกมประจำวันแยกจากสื่อปกติ (เกมในคลังนี้ไม่ขึ้นในหน้าหลักของเกมปกติ)
 * - Dev ตั้งเกมลงวันเอง 1 วัน = 1 เกม ซ้ำวันไม่ได้ วันไหนไม่ตั้ง หน้าแรกจะขึ้นว่ายังไม่มีเกมประจำวัน
 */
export function DailyGamesAdmin({ library, onMediaChanged }: { library: MediaItem[]; onMediaChanged: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const { success, error } = useToast();

  const today = bkkParts().date;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [day, setDay] = useState(today);
  const [mediaId, setMediaId] = useState('');
  const [unlock, setUnlock] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editMedia, setEditMedia] = useState<MediaItem | null>(null);
  const [deleteMedia, setDeleteMedia] = useState<MediaItem | null>(null);

  const byId = useMemo(() => new Map(library.map((m) => [m.id, m])), [library]);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from('daily_games')
      .select('id, day, media_id, unlock, note')
      .gte('day', today)
      .order('day', { ascending: true })
      .limit(400);
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
    if (!mediaId && library.length) setMediaId(library[0].id);
    if (mediaId && !library.some((m) => m.id === mediaId)) setMediaId(library[0]?.id || '');
  }, [library, mediaId]);

  const resetForm = () => {
    setEditingId(null);
    setNote('');
    setUnlock(false);
  };

  const dayTaken = (d: string, exceptId?: string | null) => rows.some((r) => r.day === d && r.id !== exceptId);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaId || !day) return;
    if (day < today) return error('เลือกวันนี้หรือวันในอนาคตเท่านั้น');
    if (dayTaken(day, editingId)) return error(`${thDate(day)} มีเกมประจำวันอยู่แล้ว ตั้งซ้ำวันเดียวกันไม่ได้ (ลบหรือแก้ของเดิมก่อน)`);
    setSaving(true);
    const body = { media_id: mediaId, unlock, note: note.trim() || null };
    const { error: err } = editingId
      ? await supabase.from('daily_games').update(body).eq('id', editingId)
      : await supabase.from('daily_games').insert({ day, ...body, created_by: user?.id ?? null });
    setSaving(false);
    if (err) {
      error((err as { code?: string }).code === '23505' ? `${thDate(day)} มีเกมประจำวันอยู่แล้ว` : err.message);
      load();
      return;
    }
    success(editingId ? 'แก้ไขแล้ว' : `ตั้งเกมประจำวันที่ ${thDate(day)} แล้ว`);
    resetForm();
    load();
  };

  const startEdit = (r: Row) => {
    setEditingId(r.id);
    setDay(r.day);
    setMediaId(r.media_id);
    setUnlock(r.unlock);
    setNote(r.note || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (r: Row) => {
    if (!confirm(`ลบเกมประจำวันของ ${thDate(r.day)} ไหม? วันนั้นจะขึ้นว่ายังไม่มีเกมประจำวัน`)) return;
    const { error: err } = await supabase.from('daily_games').delete().eq('id', r.id);
    if (err) return error(err.message);
    success('ลบแล้ว');
    if (editingId === r.id) resetForm();
    load();
  };

  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const d = shiftDate(today, i);
    const set = rows.find((r) => r.day === d) || null;
    return { d, set, media: set ? byId.get(set.media_id) : undefined };
  });

  const afterMediaChange = () => {
    onMediaChanged();
    load();
  };

  if (loading) return <div className="py-12 flex justify-center text-indigo-500"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  if (missingTable) {
    return (
      <div className="surface p-6 text-center">
        <p className="font-bold text-gray-900 dark:text-white mb-1">ยังไม่ได้สร้างตารางเกมประจำวัน</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          เปิดไฟล์ <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">supabase/migrations/005_daily_games.sql</code> และ{' '}
          <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">011_daily_library.sql</code> แล้วรันใน Supabase SQL Editor จากนั้นรีเฟรชหน้านี้
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-sm text-amber-900 dark:text-amber-200">
        <CalendarCheck2 className="w-5 h-5 shrink-0 mt-0.5" />
        <p>
          เกมประจำวันเป็นเกมเล่นง่ายจบไว แยกจากสื่อปกติ: เพิ่มเกมเข้า <b>คลังเกมประจำวัน</b> ก่อน แล้วค่อยเลือกวันที่จะลง 1 วันลงได้ 1 เกม ซ้ำวันกันไม่ได้
          วันที่ไม่ได้ตั้ง หน้าแรกจะขึ้นว่า &quot;วันนี้ยังไม่มีเกมประจำวัน&quot; ระบบไม่เลือกเกมให้เอง
        </p>
      </div>

      {/* ---------- 1) คลังเกมประจำวัน ---------- */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">1. คลังเกมประจำวัน ({library.length})</h3>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="ml-auto px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> เพิ่มเกมประจำวัน
          </button>
        </div>
        {library.length === 0 ? (
          <p className="p-8 text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400">
            ยังไม่มีเกมในคลัง กด &quot;เพิ่มเกมประจำวัน&quot; เพื่อเพิ่มเกมแรก
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {library.map((m) => {
              const scheduled = rows.filter((r) => r.media_id === m.id);
              return (
                <li key={m.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                  <Image src={m.icon_url} alt="" width={56} height={56} className="rounded-xl object-cover w-14 h-14 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{m.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {m.subject} · {m.grade_level?.join(' ')} · {scheduled.length ? `ตั้งไว้ ${scheduled.length} วัน` : 'ยังไม่ได้ตั้งวัน'}
                    </p>
                  </div>
                  <button type="button" onClick={() => setEditMedia(m)} aria-label="แก้ไขเกม" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setDeleteMedia(m)} aria-label="ลบเกม" className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------- 2) ตั้งวัน ---------- */}
      <section>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">2. {editingId ? `แก้ไขเกมประจำวัน ${thDate(day)}` : 'ลงเกมประจำวัน'}</h3>
        <form onSubmit={save} className="surface p-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>วันที่</label>
            <input type="date" min={today} value={day} disabled={!!editingId} onChange={(e) => setDay(e.target.value)} required className={inputCls + (editingId ? ' opacity-60' : '')} />
            {!editingId && dayTaken(day) && <p className="mt-1 text-xs font-semibold text-rose-600">วันนี้มีเกมประจำวันอยู่แล้ว เลือกวันอื่น หรือแก้/ลบของเดิมในตารางด้านล่าง</p>}
          </div>
          <div>
            <label className={label}>เกมจากคลังเกมประจำวัน</label>
            <select value={mediaId} onChange={(e) => setMediaId(e.target.value)} required className={inputCls} disabled={library.length === 0}>
              {library.length === 0 && <option value="">ยังไม่มีเกมในคลัง</option>}
              {library.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={label}>ข้อความโปรย (ไม่บังคับ ไม่เกิน 200 ตัวอักษร)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="เช่น วันนี้มาฝึกอ่านนาฬิกากันเถอะ" className={inputCls} />
          </div>
          <label className="sm:col-span-2 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 cursor-pointer select-none">
            <input type="checkbox" checked={unlock} onChange={(e) => setUnlock(e.target.checked)} className="w-5 h-5 accent-indigo-600" />
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Gift className="w-4 h-4 text-emerald-600" /> แจกเล่นฟรีเฉพาะวันนั้น (ทุกคนเล่นเกมนี้ได้เต็มรูปแบบ)
            </span>
          </label>
          <div className="sm:col-span-2 flex justify-end gap-2">
            {editingId && (
              <button type="button" onClick={resetForm} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 inline-flex items-center gap-2">
                <X className="w-4 h-4" /> ยกเลิกการแก้ไข
              </button>
            )}
            <button
              type="submit"
              disabled={saving || !mediaId || (!editingId && dayTaken(day))}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingId ? 'บันทึกการแก้ไข' : 'ลงเกมประจำวัน'}
            </button>
          </div>
        </form>
      </section>

      {/* ---------- 3) ตารางล่วงหน้า ---------- */}
      <section>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">3. ตารางล่วงหน้า {DAYS_AHEAD} วัน</h3>
        <ul className="rounded-2xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden bg-white dark:bg-gray-900">
          {days.map(({ d, set, media }) => (
            <li key={d} className="flex items-center gap-3 p-3">
              <div className="w-28 shrink-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{thDate(d)}</p>
                {d === today && <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">วันนี้</span>}
              </div>
              {set ? (
                <>
                  {media ? (
                    <Image src={media.icon_url} alt="" width={40} height={40} className="rounded-lg object-cover w-10 h-10 shrink-0" />
                  ) : (
                    <span className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{media?.title || 'เกมถูกลบจากคลังแล้ว'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {set.unlock ? 'แจกเล่นฟรีวันนั้น' : 'สำหรับสมาชิก (คนทั่วไปทดลองเล่นได้)'}
                      {set.note ? ` · ${set.note}` : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => startEdit(set)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 inline-flex items-center gap-1">
                    <Pencil className="w-3.5 h-3.5" /> แก้ไข
                  </button>
                  <button type="button" onClick={() => remove(set)} aria-label="ลบ" className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="w-10 h-10 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-400 shrink-0">
                    <CalendarX2 className="w-4 h-4" />
                  </span>
                  <p className="flex-1 text-sm text-gray-500 dark:text-gray-400">ยังไม่ได้ตั้ง (หน้าแรกขึ้นว่ายังไม่มีเกมประจำวัน)</p>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setDay(d);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100"
                  >
                    ตั้งวันนี้
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <AddMediaModal isOpen={addOpen} isDaily onClose={() => setAddOpen(false)} onSuccess={afterMediaChange} />
      <EditMediaModal media={editMedia} isOpen={!!editMedia} onClose={() => setEditMedia(null)} onSuccess={afterMediaChange} />
      <DeleteConfirmModal media={deleteMedia} isOpen={!!deleteMedia} onClose={() => setDeleteMedia(null)} onSuccess={afterMediaChange} />
    </div>
  );
}
