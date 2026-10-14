'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Save, Wallet } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { planById } from '@/lib/plans';
import { cn } from '@/lib/utils/cn';

interface Settings {
  enabled: boolean;
  promptpay_id: string | null;
  account_name: string | null;
  bank_name: string | null;
  bank_account: string | null;
}
interface Order {
  id: string;
  username: string | null;
  plan: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  trans_ref: string | null;
  sender_name: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
  paid_at: string | null;
  premium_until: string | null;
}

const field =
  'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const dt = (s: string | null) => (s ? new Date(s).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-');

/** ตั้งค่าบัญชีรับเงิน + ดูคำสั่งซื้อสมาชิก */
export function PaymentsAdmin() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [easySlip, setEasySlip] = useState(false);
  const [form, setForm] = useState<Settings>({ enabled: false, promptpay_id: '', account_name: '', bank_name: '', bank_account: '' });
  const [orders, setOrders] = useState<Order[]>([]);
  const [totals, setTotals] = useState({ paidCount: 0, revenue: 0, monthRevenue: 0 });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'paid' | 'all'>('paid');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dev/payments', { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'โหลดไม่สำเร็จ');
      setEasySlip(!!j.easySlip);
      if (j.missing) {
        setMissing(true);
        return;
      }
      setMissing(false);
      if (j.settings) setForm({ ...j.settings, promptpay_id: j.settings.promptpay_id || '', account_name: j.settings.account_name || '', bank_name: j.settings.bank_name || '', bank_account: j.settings.bank_account || '' });
      setOrders(j.orders || []);
      setTotals(j.totals);
    } catch (e) {
      error(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/dev/payments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'บันทึกไม่สำเร็จ');
      success('บันทึกการตั้งค่าแล้ว');
      load();
    } catch (err) {
      error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !orders.length && !missing) {
    return <div className="p-10 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin inline" /></div>;
  }

  if (missing) {
    return (
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-sm text-amber-900 dark:text-amber-200">
        ยังไม่มีตารางระบบชำระเงิน เปิดไฟล์ <code className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-gray-800">supabase/migrations/009_payments.sql</code> แล้วรันใน Supabase SQL Editor 1 ครั้ง จากนั้นรีเฟรชหน้านี้
      </div>
    );
  }

  const shown = filter === 'paid' ? orders.filter((o) => o.status === 'paid') : orders;

  return (
    <div className="space-y-6">
      {/* ยอดรวม */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { t: 'รายได้เดือนนี้', v: `${totals.monthRevenue.toLocaleString('th-TH')} บาท` },
          { t: 'รายได้ทั้งหมด (200 รายการล่าสุด)', v: `${totals.revenue.toLocaleString('th-TH')} บาท` },
          { t: 'สมัครสำเร็จ', v: `${totals.paidCount} รายการ` },
        ].map((x) => (
          <div key={x.t} className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500">{x.t}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{x.v}</p>
          </div>
        ))}
      </div>

      {/* ตั้งค่าบัญชีรับเงิน */}
      <form onSubmit={save} className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-gray-900 dark:text-white">บัญชีรับเงิน</h3>
        </div>

        <div className={cn('flex items-start gap-2 p-3 rounded-xl text-sm', easySlip ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200')}>
          {easySlip ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>
            {easySlip
              ? 'เชื่อมต่อ EasySlip แล้ว (EASYSLIP_API_KEY)'
              : 'ยังไม่ได้ตั้งค่า EASYSLIP_API_KEY ในตัวแปรสภาพแวดล้อมของเซิร์ฟเวอร์ ระบบจะยังเปิดรับชำระไม่ได้'}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">เลขพร้อมเพย์ (สร้าง QR) *</span>
            <input value={form.promptpay_id || ''} onChange={(e) => setForm({ ...form, promptpay_id: e.target.value })} inputMode="numeric" placeholder="เบอร์มือถือ 10 หลัก หรือเลขบัตร 13 หลัก" className={field} />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">ชื่อบัญชี (ตรงกับในแอปธนาคาร) *</span>
            <input value={form.account_name || ''} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder="เช่น นาย สมชาย ใจดี" className={field} />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">ธนาคาร</span>
            <input value={form.bank_name || ''} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="เช่น กสิกรไทย" className={field} />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">เลขบัญชีธนาคาร (ใช้เทียบกับสลิป)</span>
            <input value={form.bank_account || ''} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} inputMode="numeric" placeholder="เช่น 123-4-56789-0" className={field} />
          </label>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          QR พร้อมเพย์ใช้ได้กับเบอร์มือถือหรือเลขบัตรที่ผูกพร้อมเพย์กับบัญชีนี้เท่านั้น (ใช้เลขบัญชีธนาคารสร้าง QR โดยตรงไม่ได้) ระบบเทียบผู้รับในสลิปกับเลขบัญชี/เลขพร้อมเพย์/ชื่อบัญชีนี้ ถ้าไม่ตรงจะไม่เปิดสิทธิ์
        </p>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="w-5 h-5 accent-indigo-600" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">เปิดรับสมัครสมาชิกออนไลน์</span>
        </label>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} บันทึก
          </button>
        </div>
      </form>

      {/* คำสั่งซื้อ */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">คำสั่งซื้อ</h3>
          <div className="ml-auto flex gap-1.5">
            {(['paid', 'all'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold', filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200')}>
                {f === 'paid' ? 'ชำระแล้ว' : 'ทั้งหมด'}
              </button>
            ))}
            <button type="button" onClick={load} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 inline-flex items-center gap-1">
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> รีเฟรช
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-x-auto">
          {shown.length === 0 ? (
            <p className="p-8 text-center text-gray-500 dark:text-gray-400">ยังไม่มีรายการ</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">เวลา</th>
                  <th className="py-3 px-4">บัญชี</th>
                  <th className="py-3 px-4">แพลน</th>
                  <th className="py-3 px-4">ยอด</th>
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4 hidden md:table-cell">ผู้โอน / เลขอ้างอิง</th>
                  <th className="py-3 px-4 hidden md:table-cell">ใช้ได้ถึง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {shown.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 px-4 whitespace-nowrap text-gray-600 dark:text-gray-300">{dt(o.paid_at || o.created_at)}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{o.username || <span className="text-gray-400">ผู้สมัครใหม่</span>}</td>
                    <td className="py-3 px-4">{planById(o.plan)?.name || o.plan}</td>
                    <td className="py-3 px-4 font-semibold">{Number(o.amount)} บาท</td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-xs font-semibold',
                          o.status === 'paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                        )}
                        title={o.last_error || ''}
                      >
                        {o.status === 'paid' ? 'ชำระแล้ว' : o.attempts > 0 ? `รอ (ส่งผิด ${o.attempts})` : 'รอชำระ'}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-xs text-gray-500 dark:text-gray-400">
                      {o.sender_name || '-'}
                      <br />
                      <span className="font-mono">{o.trans_ref || ''}</span>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-600 dark:text-gray-300">{dt(o.premium_until)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
