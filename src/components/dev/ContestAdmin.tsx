'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useCallback, useEffect, useState } from 'react';
import { Award, Check, Heart, Loader2, Plus, RefreshCw, Save, Trash2, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { PLACE_LABEL, phaseOf, type Contest } from '@/lib/worksheet/contest';
import { subjectOf } from '@/lib/worksheet/options';

interface Entry {
  id: string;
  title: string;
  subject: string;
  owner_name: string;
  username: string;
  image_url: string;
  like_count: number;
  fresh: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const PH: Record<string, string> = { soon: 'ยังไม่เริ่ม', open: 'กำลังจัด', ended: 'จบแล้ว รอมอบรางวัล', awarded: 'มอบรางวัลแล้ว' };
const ST: Record<Entry['status'], string> = { pending: 'รอตรวจ', approved: 'อนุมัติ', rejected: 'ไม่ผ่าน' };

/** ค่าเวลาเครื่อง (datetime-local) <-> ISO */
const toLocal = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const blank = () => {
  const s = new Date();
  s.setMinutes(0, 0, 0);
  const e = new Date(s.getTime() + 14 * 86400000);
  return { id: '', title: 'ประกวดออกแบบใบงาน AI', starts_at: toLocal(s.toISOString()), ends_at: toLocal(e.toISOString()), prize_days: [90, 60, 30], join_days: 3, count_new: true };
};

async function call(body: unknown) {
  const r = await fetch('/api/dev/contest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'ไม่สำเร็จ');
  return j;
}

/** Dev: สร้าง/แก้กิจกรรม ตรวจผลงาน (อนุมัติ/ไม่ผ่าน) ดูใจจากบัญชีใหม่ ปิดกิจกรรมและมอบรางวัล */
export function ContestAdmin() {
  const [list, setList] = useState<Contest[] | null>(null);
  const [sel, setSel] = useState<string>('');
  const [form, setForm] = useState(blank);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<'all' | Entry['status']>('pending');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const loadList = useCallback(async () => {
    setErr('');
    try {
      const r = await fetch('/api/dev/contest', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setList(j.contests);
      setSel((s) => s || j.contests[0]?.id || '');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ');
      setList([]);
    }
  }, []);

  const loadEntries = useCallback(async (id: string) => {
    if (!id) return setEntries([]);
    const r = await fetch(`/api/dev/contest?id=${id}`, { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setEntries(j.entries || []);
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);
  useEffect(() => {
    const c = list?.find((x) => x.id === sel);
    if (c) setForm({ id: c.id, title: c.title, starts_at: toLocal(c.starts_at), ends_at: toLocal(c.ends_at), prize_days: c.prize_days, join_days: c.join_days, count_new: c.count_new });
    loadEntries(sel);
  }, [sel, list, loadEntries]);

  const cur = list?.find((x) => x.id === sel) || null;
  const phase = cur ? phaseOf(cur) : null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      const j = await call({ action: 'save', ...form, starts_at: new Date(form.starts_at).toISOString(), ends_at: new Date(form.ends_at).toISOString() });
      setMsg('บันทึกแล้ว');
      await loadList();
      setSel(j.id);
    });

  const setStatus = (e: Entry, status: Entry['status']) =>
    run(async () => {
      await call({ action: 'status', entry: e.id, status });
      setEntries((l) => l.map((x) => (x.id === e.id ? { ...x, status } : x)));
    });

  const delEntry = (e: Entry) =>
    confirm(`ลบผลงาน "${e.title}" ถาวร?`) &&
    run(async () => {
      await call({ action: 'delete_entry', entry: e.id });
      setEntries((l) => l.filter((x) => x.id !== e.id));
    });

  const award = () =>
    cur &&
    confirm('ปิดกิจกรรมและเพิ่มวันสมาชิกให้ผู้ชนะทันที? ทำได้ครั้งเดียว ย้อนกลับไม่ได้') &&
    run(async () => {
      const j = await call({ action: 'award', id: cur.id });
      setMsg(`มอบรางวัลแล้ว ผู้ชนะ ${j.winners.length} คน เพิ่มวันให้ ${j.gifted} บัญชี${j.failed ? ` (ไม่สำเร็จ ${j.failed})` : ''}`);
      await loadList();
    });

  const delContest = () =>
    cur &&
    confirm(`ลบกิจกรรม "${cur.title}" พร้อมผลงานและใจทั้งหมด? ย้อนกลับไม่ได้`) &&
    run(async () => {
      await call({ action: 'delete', id: cur.id });
      setSel('');
      await loadList();
    });

  const shown = entries.filter((e) => filter === 'all' || e.status === filter);
  const count = (s: Entry['status']) => entries.filter((e) => e.status === s).length;
  const ranked = entries.filter((e) => e.status === 'approved').sort((a, b) => b.like_count - a.like_count || a.created_at.localeCompare(b.created_at));
  const input = 'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mr-auto">กิจกรรมประกวดใบงาน AI</h2>
        <select value={sel} onChange={(e) => setSel(e.target.value)} className={cn(input, 'w-auto')} aria-label="เลือกกิจกรรม">
          <option value="">+ กิจกรรมใหม่</option>
          {list?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({PH[phaseOf(c)]})
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setSel('')} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold">
          <Plus className="w-4 h-4" /> ใหม่
        </button>
        <button type="button" onClick={loadList} aria-label="โหลดใหม่" className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {err && <p className="text-sm text-rose-600">{err}</p>}
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}

      {/* ตั้งค่ากิจกรรม */}
      <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 grid sm:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-200">
        {sel === '' && <p className="sm:col-span-2 text-xs text-gray-500">สร้างกิจกรรมใหม่ (หน้าเว็บโชว์กิจกรรมที่กำลังจัดก่อน ถ้าไม่มีโชว์อันที่จะเริ่ม)</p>}
        <label className="sm:col-span-2">
          ชื่อกิจกรรม
          <input value={form.title} maxLength={80} onChange={(e) => setForm({ ...form, title: e.target.value })} className={input} disabled={!!cur?.awarded_at} />
        </label>
        <label>
          เริ่ม
          <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={input} disabled={!!cur?.awarded_at} />
        </label>
        <label>
          จบ
          <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className={input} disabled={!!cur?.awarded_at} />
        </label>
        <div className="sm:col-span-2 grid grid-cols-4 gap-2">
          {[0, 1, 2].map((i) => (
            <label key={i}>
              วันสมาชิก อันดับ {i + 1}
              <input type="number" min={0} max={365} value={form.prize_days[i]} onChange={(e) => setForm({ ...form, prize_days: form.prize_days.map((d, k) => (k === i ? Number(e.target.value) : d)) })} className={input} disabled={!!cur?.awarded_at} />
            </label>
          ))}
          <label>
            ทุกผลงานที่ผ่าน
            <input type="number" min={0} max={30} value={form.join_days} onChange={(e) => setForm({ ...form, join_days: Number(e.target.value) })} className={input} disabled={!!cur?.awarded_at} />
          </label>
        </div>
        <label className="sm:col-span-2 flex items-center gap-2">
          <input type="checkbox" checked={form.count_new} onChange={(e) => setForm({ ...form, count_new: e.target.checked })} disabled={!!cur?.awarded_at} />
          นับใจจากบัญชีที่สมัครหลังกิจกรรมเริ่ม (ได้ยอดสมัครใหม่ แต่ต้องคอยดูคอลัมน์ "ใจบัญชีใหม่")
        </label>
        <div className="sm:col-span-2 flex flex-wrap gap-2">
          {!cur?.awarded_at && (
            <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} บันทึก
            </button>
          )}
          {phase === 'ended' && (
            <button type="button" onClick={award} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white font-bold disabled:opacity-50">
              <Award className="w-4 h-4" /> ปิดกิจกรรม + มอบรางวัล
            </button>
          )}
          {cur && (
            <button type="button" onClick={delContest} disabled={busy} className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 text-sm">
              <Trash2 className="w-4 h-4" /> ลบกิจกรรม
            </button>
          )}
        </div>
        {cur?.winners?.length ? (
          <div className="sm:col-span-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
            {cur.winners.map((w) => (
              <p key={w.entry}>
                {PLACE_LABEL[w.rank - 1]}: {w.name} · {w.likes} ใจ · +{w.days} วัน
              </p>
            ))}
          </div>
        ) : null}
      </div>

      {/* ผลงาน */}
      {cur && (
        <div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={cn('px-3 py-1.5 rounded-xl text-sm font-bold border', filter === f ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300')}>
                {f === 'all' ? `ทั้งหมด ${entries.length}` : `${ST[f]} ${count(f)}`}
              </button>
            ))}
          </div>
          {ranked.length > 0 && (
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              อันดับตอนนี้: {ranked.slice(0, 3).map((e, i) => `${i + 1}. ${e.owner_name} (${e.like_count})`).join(' · ')}
            </p>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shown.map((e) => (
              <div key={e.id} className="flex gap-3 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <a href={e.image_url} target="_blank" rel="noreferrer" className="shrink-0">
                  <img src={e.image_url} alt="" className="w-20 h-28 object-cover object-top rounded-lg border border-gray-200" />
                </a>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{e.title}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {e.owner_name} @{e.username} · {subjectOf(e.subject).th}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <Heart className="w-3.5 h-3.5 text-rose-500" /> {e.like_count}
                    <span className={cn('inline-flex items-center gap-1', e.fresh > e.like_count / 2 && e.like_count >= 4 ? 'text-rose-600 font-bold' : '')} title="ใจจากบัญชีที่สมัครหลังกิจกรรมเริ่ม">
                      <UserPlus className="w-3.5 h-3.5" /> {e.fresh}
                    </span>
                    <span>{ST[e.status]}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {e.status !== 'approved' && (
                      <button type="button" onClick={() => setStatus(e, 'approved')} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500 text-white text-xs font-bold">
                        <Check className="w-3.5 h-3.5" /> อนุมัติ
                      </button>
                    )}
                    {e.status !== 'rejected' && (
                      <button type="button" onClick={() => setStatus(e, 'rejected')} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-xs font-bold">
                        <X className="w-3.5 h-3.5" /> ไม่ผ่าน
                      </button>
                    )}
                    <button type="button" onClick={() => delEntry(e)} aria-label="ลบผลงาน" className="px-2 py-1 rounded-lg border border-rose-200 text-rose-600 text-xs">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!shown.length && <p className="text-sm text-gray-400">ไม่มีรายการ</p>}
          </div>
        </div>
      )}
    </div>
  );
}
