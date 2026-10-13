'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api, errMsg } from '@/lib/client/api';
import { createClient } from '@/lib/supabase/client';

/** ความเป็นส่วนตัว + ลบบัญชีและข้อมูลทั้งหมด (ต้องยืนยันรหัสผ่าน) */
export function DangerZone() {
  const router = useRouter();
  const { error } = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const del = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/account/delete', { method: 'POST', body: { password } });
      await createClient().auth.signOut();
      router.replace('/home');
    } catch (err) {
      error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="surface p-5 sm:p-6" aria-labelledby="privacy-h">
      <h2 id="privacy-h" className="text-xl font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-2">
        <ShieldCheck className="w-5 h-5 text-mint-600" /> ความเป็นส่วนตัวและข้อมูล
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        เราเก็บข้อมูลเด็กเท่าที่จำเป็น (ชื่อเล่น ชั้น และผลการเล่น) อ่านรายละเอียดได้ที่{' '}
        <Link href="/privacy" className="font-semibold text-indigo-600 dark:text-indigo-400 underline">นโยบายความเป็นส่วนตัว</Link>
      </p>
      <button onClick={() => setOpen(true)} className="btn-jelly mt-4 px-4 py-2.5 rounded-xl border-2 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm font-semibold">
        ลบบัญชีและข้อมูลทั้งหมด
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="ลบบัญชีถาวร">
        <form onSubmit={del} className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            บัญชีของคุณ นักเรียนทุกคนที่ดูแล และประวัติการเล่นทั้งหมดจะถูกลบ <b className="text-rose-600">และกู้คืนไม่ได้</b> พิมพ์รหัสผ่านเพื่อยืนยัน
          </p>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="รหัสผ่านของคุณ" className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 text-gray-900 dark:text-white focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20" />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setOpen(false)} className="btn-jelly px-5 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200">ยกเลิก</button>
            <button type="submit" disabled={busy || !password} className="btn-jelly px-5 py-3 rounded-2xl bg-rose-600 text-white font-semibold flex items-center gap-2 disabled:opacity-60">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} ลบถาวร
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
