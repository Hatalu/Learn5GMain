'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Crown, Loader2, X } from 'lucide-react';
import { api, errMsg } from '@/lib/client/api';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils/cn';

interface Row {
  id: string;
  plan: string;
  contact: string;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user: { username: string; display_name: string | null; role: string; premium_until: string | null } | null;
}

const PLAN: Record<string, string> = { family: 'ครอบครัว', classroom: 'ห้องเรียน', school: 'โรงเรียน' };
const DAYS = [30, 90, 180, 365];

/** คำขอ Premium จากผู้ปกครอง/ครู: อนุมัติแล้วต่ออายุให้ผู้ขอและนักเรียนทุกคนที่ดูแล */
export function PremiumRequests() {
  const { success, error } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ requests: Row[] }>('/api/dev/premium');
      setRows(r.requests);
    } catch (e) {
      error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    setBusy(id);
    try {
      await api('/api/dev/premium', { method: 'POST', body: { id, decision, days: days[id] ?? 365 } });
      success(decision === 'approve' ? 'อนุมัติและต่ออายุ Premium แล้ว' : 'ปฏิเสธคำขอแล้ว');
      await load();
    } catch (e) {
      error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="py-12 flex justify-center text-indigo-500"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  const pending = rows.filter((r) => r.status === 'pending');
  const done = rows.filter((r) => r.status !== 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white mb-3"><Crown className="w-5 h-5 text-amber-500" /> รอดำเนินการ ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="surface p-6 text-center text-gray-500">ไม่มีคำขอที่รออยู่</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((r) => (
              <li key={r.id} className="surface p-4 flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {r.user?.display_name || r.user?.username || 'ไม่ทราบ'} <span className="text-xs text-gray-500">({r.user?.role})</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">แพ็กเกจ{PLAN[r.plan]} · ติดต่อ: <b>{r.contact}</b></p>
                  {r.note && <p className="text-sm text-gray-500">&quot;{r.note}&quot;</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{r.user?.username} · ส่งเมื่อ {new Date(r.created_at).toLocaleString('th-TH')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={days[r.id] ?? 365} onChange={(e) => setDays({ ...days, [r.id]: Number(e.target.value) })} aria-label="จำนวนวัน" className="px-3 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                    {DAYS.map((d) => <option key={d} value={d}>{d} วัน</option>)}
                  </select>
                  <button disabled={busy === r.id} onClick={() => decide(r.id, 'approve')} className="btn-jelly inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"><Check className="w-4 h-4" /> อนุมัติ</button>
                  <button disabled={busy === r.id} onClick={() => decide(r.id, 'reject')} className="btn-jelly inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm font-semibold disabled:opacity-60"><X className="w-4 h-4" /> ปฏิเสธ</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {done.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-2">ประวัติ</h3>
          <ul className="space-y-1.5 text-sm">
            {done.slice(0, 20).map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', r.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300')}>{r.status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}</span>
                <span className="text-gray-700 dark:text-gray-300">{r.user?.display_name || r.user?.username} · {PLAN[r.plan]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
