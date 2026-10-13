'use client';

import React, { useEffect, useState } from 'react';
import { Crown, Loader2, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { api, errMsg } from '@/lib/client/api';
import { cn } from '@/lib/utils/cn';

interface Req {
  id: string;
  plan: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const PLANS = [
  { v: 'family', label: 'ครอบครัว', desc: 'สำหรับลูกที่บ้าน' },
  { v: 'classroom', label: 'ห้องเรียน', desc: 'สำหรับครูหนึ่งห้อง' },
  { v: 'school', label: 'โรงเรียน', desc: 'หลายห้อง/หลายครู' },
] as const;

const STATUS: Record<Req['status'], { label: string; cls: string }> = {
  pending: { label: 'รอแอดมินติดต่อกลับ', cls: 'bg-sun-400/25 text-amber-800 dark:text-sun-300' },
  approved: { label: 'อนุมัติแล้ว', cls: 'bg-mint-500/20 text-emerald-700 dark:text-mint-400' },
  rejected: { label: 'ไม่อนุมัติ', cls: 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300' },
};

/** สถานะ Premium + ขอใช้งาน Premium (ยังไม่มีระบบชำระเงินอัตโนมัติ: แอดมินติดต่อและอนุมัติให้) */
export function PremiumPanel({ defaultPlan = 'family' }: { defaultPlan?: 'family' | 'classroom' | 'school' }) {
  const { profile, refreshProfile } = useAuth();
  const { success, error } = useToast();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [plan, setPlan] = useState<string>(defaultPlan);
  const [contact, setContact] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const r = await api<{ requests: Req[] }>('/api/premium/requests');
      setReqs(r.requests);
    } catch {
      /* ยังไม่ได้รัน migration ก็ไม่แสดงประวัติ */
    }
  };
  useEffect(() => {
    load();
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const until = profile?.premium_until ? new Date(profile.premium_until) : null;
  const active = !!until && until.getTime() > Date.now();
  const pending = reqs.find((r) => r.status === 'pending');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/premium/requests', { method: 'POST', body: { plan, contact, note } });
      success('ส่งคำขอแล้ว แอดมินจะติดต่อกลับทางช่องทางที่ให้ไว้');
      setContact('');
      setNote('');
      await load();
    } catch (err) {
      error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="premium-h" className="surface p-5 sm:p-6 shadow-toy">
      <h2 id="premium-h" className="text-2xl font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
        <Crown className="w-6 h-6 text-sun-500" /> สมาชิก Premium
      </h2>

      <p className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold', active ? 'bg-mint-500/20 text-emerald-700 dark:text-mint-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300')}>
        {active ? `ใช้ได้ถึง ${until!.toLocaleDateString('th-TH', { dateStyle: 'long' })} (รวมนักเรียนทุกคนที่ดูแล)` : 'ตอนนี้ใช้ได้เฉพาะสื่อเล่นฟรี'}
      </p>

      {reqs.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm">
          {reqs.slice(0, 3).map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <span className={cn('px-2.5 py-0.5 rounded-full font-semibold', STATUS[r.status].cls)}>{STATUS[r.status].label}</span>
              <span className="text-gray-500 dark:text-gray-400">แพ็กเกจ{PLANS.find((p) => p.v === r.plan)?.label} · {new Date(r.created_at).toLocaleDateString('th-TH')}</span>
            </li>
          ))}
        </ul>
      )}

      {!pending && (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{active ? 'ต่ออายุ / ขยายสิทธิ์' : 'ขอใช้งาน Premium'}</legend>
            <div className="grid grid-cols-3 gap-2">
              {PLANS.map((p) => (
                <button key={p.v} type="button" onClick={() => setPlan(p.v)} aria-pressed={plan === p.v} className={cn('btn-jelly p-3 rounded-2xl border-2 text-left', plan === p.v ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50' : 'border-gray-200 dark:border-gray-700')}>
                  <span className="block font-display text-gray-900 dark:text-white">{p.label}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{p.desc}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="pcontact" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">ช่องทางติดต่อกลับ (LINE ID / เบอร์โทร)</label>
            <input id="pcontact" value={contact} onChange={(e) => setContact(e.target.value)} required minLength={3} maxLength={120} className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label htmlFor="pnote" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">หมายเหตุ (ถ้ามี)</label>
            <textarea id="pnote" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 resize-none" />
          </div>
          <button type="submit" disabled={busy} className="btn-primary-grad btn-jelly inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-display disabled:opacity-60">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} ส่งคำขอ
          </button>
        </form>
      )}
    </section>
  );
}
