'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Loader2, Plus, RefreshCw, Ticket, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { prettyCode } from '@/lib/redeem';

interface Row { code: string; days: number; created_at: string; used_username: string | null; used_at: string | null }
type Filter = 'all' | 'free' | 'used';

/** โค้ดรับสมาชิกฟรี: สร้างทีละหลายโค้ด เลือกจำนวนวัน ดูว่าโค้ดไหนถูกใช้แล้ว/ยังว่าง */
export function RedeemCodesAdmin() {
  const { success, error } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(10);
  const [days, setDays] = useState(7);
  const [filter, setFilter] = useState<Filter>('all');
  const [fresh, setFresh] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dev/codes');
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'โหลดไม่สำเร็จ');
      setRows(j.codes || []);
    } catch (e) {
      error(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => { load(); }, [load]);

  const post = async (body: object) => {
    const res = await fetch('/api/dev/codes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || 'ไม่สำเร็จ');
    return j;
  };

  const generate = async () => {
    setBusy(true);
    try {
      const j = await post({ count, days });
      setFresh(j.codes);
      success(`สร้างแล้ว ${j.codes.length} โค้ด (${j.days} วัน)`);
      load();
    } catch (e) {
      error(e instanceof Error ? e.message : 'ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (code: string) => {
    if (!confirm(`ลบโค้ด ${prettyCode(code)} ไหม?`)) return;
    try {
      await post({ action: 'delete', code });
      setRows((r) => r.filter((x) => x.code !== code));
    } catch (e) {
      error(e instanceof Error ? e.message : 'ไม่สำเร็จ');
    }
  };

  const copy = async (list: string[], what: string) => {
    if (!list.length) return;
    try {
      await navigator.clipboard.writeText(list.join('\n'));
      success(`คัดลอก ${list.length} โค้ด${what}แล้ว`);
    } catch {
      error('คัดลอกไม่สำเร็จ');
    }
  };

  const used = rows.filter((r) => r.used_at);
  const free = rows.filter((r) => !r.used_at);
  const shown = useMemo(() => (filter === 'free' ? free : filter === 'used' ? used : rows), [filter, rows, free, used]);
  const fmt = (s: string | null) => (s ? new Date(s).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-');
  const input = 'w-24 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold';

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-sm text-amber-900 dark:text-amber-200">
        <Ticket className="w-5 h-5 shrink-0 mt-0.5" />
        <p>โค้ด 10 หลักใช้ได้คนละครั้ง ผู้ใช้กรอกที่หน้าหลัก แล้วได้สมาชิกตามจำนวนวันของโค้ด (ต่อจากวันหมดอายุเดิม) ถ้ายังไม่มีบัญชีระบบจะพาไปสมัครแล้วใช้โค้ดให้เอง</p>
      </div>

      {/* สร้างโค้ด */}
      <div className="flex flex-wrap items-end gap-3 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <label className="text-xs font-bold text-gray-600 dark:text-gray-300 space-y-1">
          <span className="block">จำนวนโค้ด</span>
          <input type="number" min={1} max={200} value={count} onChange={(e) => setCount(+e.target.value)} className={input} />
        </label>
        <label className="text-xs font-bold text-gray-600 dark:text-gray-300 space-y-1">
          <span className="block">ได้สมาชิกกี่วัน</span>
          <input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(+e.target.value)} className={input} />
        </label>
        <div className="flex gap-1.5">
          {[1, 3, 7, 30, 365].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`px-2.5 py-2 rounded-xl text-xs font-bold ${days === d ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}>
              {d} วัน
            </button>
          ))}
        </div>
        <button onClick={generate} disabled={busy} className="ml-auto px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white inline-flex items-center gap-1.5 disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} สร้างโค้ด
        </button>
      </div>

      {fresh.length > 0 && (
        <div className="p-4 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-indigo-800 dark:text-indigo-200">โค้ดที่เพิ่งสร้าง ({fresh.length})</span>
            <button onClick={() => copy(fresh, 'ที่เพิ่งสร้าง')} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white inline-flex items-center gap-1">
              <Copy className="w-3.5 h-3.5" /> คัดลอกทั้งหมด
            </button>
          </div>
          <div className="flex flex-wrap gap-2 font-mono text-sm">
            {fresh.map((c) => <span key={c} className="px-2 py-1 rounded-lg bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800">{prettyCode(c)}</span>)}
          </div>
        </div>
      )}

      {/* สถิติ */}
      <div className="grid grid-cols-3 gap-3">
        {([['all', 'ทั้งหมด', rows.length, 'text-gray-900 dark:text-white'], ['free', 'ยังไม่มีคนใช้', free.length, 'text-emerald-600'], ['used', 'ใช้แล้ว', used.length, 'text-rose-600']] as const).map(([k, label, n, cls]) => (
          <button key={k} onClick={() => setFilter(k)} className={`p-3 rounded-2xl border text-left transition ${filter === k ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900' : 'border-gray-200 dark:border-gray-800'} bg-white dark:bg-gray-900`}>
            <div className="text-xs font-semibold text-gray-500">{label}</div>
            <div className={`text-2xl font-black ${cls}`}>{n}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => copy(free.map((r) => r.code), 'ที่ยังว่าง')} disabled={!free.length} className="px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white inline-flex items-center gap-1.5 disabled:opacity-50">
          <Copy className="w-4 h-4" /> คัดลอกโค้ดที่ยังว่าง
        </button>
        <button onClick={load} disabled={loading} className="ml-auto px-3 py-2 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 inline-flex items-center gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> รีเฟรช
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-x-auto bg-white dark:bg-gray-900">
        {loading ? (
          <div className="p-8 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
        ) : shown.length === 0 ? (
          <p className="p-8 text-center text-gray-500 dark:text-gray-400">ยังไม่มีโค้ดในหมวดนี้</p>
        ) : (
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="py-3 px-4">โค้ด</th>
                <th className="py-3 px-4">วัน</th>
                <th className="py-3 px-4">สถานะ</th>
                <th className="py-3 px-4 hidden sm:table-cell">สร้างเมื่อ</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.code} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="py-2.5 px-4 font-mono font-bold">{prettyCode(r.code)}</td>
                  <td className="py-2.5 px-4">{r.days}</td>
                  <td className="py-2.5 px-4">
                    {r.used_at ? (
                      <span className="text-rose-600 font-semibold">ใช้แล้ว · {r.used_username || 'บัญชีถูกลบ'} · {fmt(r.used_at)}</span>
                    ) : (
                      <span className="text-emerald-600 font-semibold">ยังว่าง</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-gray-500 hidden sm:table-cell">{fmt(r.created_at)}</td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    {!r.used_at && (
                      <>
                        <button onClick={() => copy([r.code], '')} title="คัดลอก" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><Copy className="w-4 h-4" /></button>
                        <button onClick={() => remove(r.code)} title="ลบ" className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
