'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { FlaskConical, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface Acc { id: string; username: string; premium_until: string | null; created_at: string }

/** บัญชีทดลองเล่น: ระบบสร้างให้อัตโนมัติตอนกดทดลองเล่น และลบเองเมื่อครบเวลา (แยกจากสมาชิกปกติ) */
export function TrialAccountsAdmin() {
  const { success, error } = useToast();
  const [rows, setRows] = useState<Acc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dev/trial');
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'โหลดไม่สำเร็จ');
      setRows(j.accounts || []);
    } catch (e) {
      error(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => { load(); }, [load]);

  const run = async (action: 'sweep' | 'purge') => {
    if (action === 'purge' && !confirm('ลบบัญชีทดลองเล่นทั้งหมดตอนนี้ไหม? (คนที่กำลังทดลองอยู่จะเล่นต่อได้ถึงหมดเวลา)')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/dev/trial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'ไม่สำเร็จ');
      success(`ลบแล้ว ${j.deleted} บัญชี`);
      load();
    } catch (e) {
      error(e instanceof Error ? e.message : 'ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const now = Date.now();
  const fmt = (s: string | null) => (s ? new Date(s).toLocaleTimeString('th-TH') : '-');

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 text-sm text-sky-900 dark:text-sky-200">
        <FlaskConical className="w-5 h-5 shrink-0 mt-0.5" />
        <p>
          ทุกครั้งที่มีคนกด &quot;ทดลองเล่น&quot; ระบบสร้างบัญชี trial_… ให้ใช้ 2 นาที 10 วินาที แล้วลบทิ้งเอง บัญชีเหล่านี้ไม่ปนกับรายชื่อสมาชิกปกติ
          ปกติหน้านี้ควรว่างหรือมีไม่กี่บัญชี ถ้ามีค้างหลายบัญชีกด &quot;ลบที่หมดอายุ&quot;
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">บัญชีทดลองเล่น ({rows.length})</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button onClick={load} disabled={loading} className="px-3 py-2 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 inline-flex items-center gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> รีเฟรช
          </button>
          <button onClick={() => run('sweep')} disabled={busy} className="px-3 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white inline-flex items-center gap-1.5 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} ลบที่หมดอายุ
          </button>
          <button onClick={() => run('purge')} disabled={busy || rows.length === 0} className="px-3 py-2 rounded-xl text-sm font-semibold bg-rose-600 text-white inline-flex items-center gap-1.5 disabled:opacity-50">
            <Trash2 className="w-4 h-4" /> ลบทั้งหมด
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
        {loading ? (
          <div className="p-8 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-gray-500 dark:text-gray-400">ตอนนี้ไม่มีบัญชีทดลองเล่นค้างอยู่</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 font-semibold">
              <tr><th className="py-3 px-4">ชื่อบัญชี</th><th className="py-3 px-4">สร้างเมื่อ</th><th className="py-3 px-4">หมดอายุ</th><th className="py-3 px-4">สถานะ</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((a) => {
                const live = !!a.premium_until && new Date(a.premium_until).getTime() > now;
                return (
                  <tr key={a.id}>
                    <td className="py-3 px-4 font-mono text-gray-900 dark:text-white">{a.username}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{fmt(a.created_at)}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{fmt(a.premium_until)}</td>
                    <td className="py-3 px-4">
                      <span className={live ? 'px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'}>
                        {live ? 'กำลังทดลอง' : 'หมดอายุ รอลบ'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
