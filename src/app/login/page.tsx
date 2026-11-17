'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { redirectTarget } from '@/lib/utils/redirect';
import { LiquidGlassShell, glassInput, glassLabel } from '@/components/ui/sign-in-water-effect-glass';

export default function LoginPage() {
  const { signIn, user, isLoading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const r = redirectTarget('');
    if (r) setQuery(`?redirect=${encodeURIComponent(r)}`);
  }, []);

  useEffect(() => {
    if (!isLoading && user && !busy) router.replace(redirectTarget());
  }, [user, isLoading, busy, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr('');
    if (!username.trim()) return setErr('กรอกชื่อผู้ใช้');
    if (!password) return setErr('กรอกรหัสผ่าน');
    if (Date.now() < lockUntil) return setErr(`ลองผิดหลายครั้ง รอ ${Math.ceil((lockUntil - Date.now()) / 1000)} วินาทีแล้วลองใหม่`);
    setBusy(true);
    try {
      const res = await signIn(username, password);
      if (!res.success) {
        const n = fails + 1;
        setFails(n);
        if (n >= 5) setLockUntil(Date.now() + Math.min(300, 30 * 2 ** (n - 5)) * 1000);
        setErr(res.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        setBusy(false);
        return;
      }
      router.push(redirectTarget());
    } catch {
      setErr('เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง');
      setBusy(false);
    }
  };

  return (
    <LiquidGlassShell
      title="ยินดีต้อนรับกลับมา"
      subtitle="เข้าสู่ระบบเพื่อสร้างสื่อและเกมต่อ"
      footer={
        <>
          ยังไม่มีบัญชี?{' '}
          <Link href={`/signup${query}`} className="font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-white">
            สมัครฟรี
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="li-user" className={glassLabel}>
            ชื่อผู้ใช้
          </label>
          <input id="li-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus placeholder="username" className={glassInput} />
        </div>
        <div>
          <label htmlFor="li-pass" className={glassLabel}>
            รหัสผ่าน
          </label>
          <div className="relative">
            <input
              id="li-pass"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="รหัสผ่าน"
              className={`${glassInput} pr-11`}
            />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {err && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 text-sm font-semibold text-white transition-all hover:bg-neutral-700 active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-black dark:shadow-[0_4px_25px_rgba(255,255,255,0.2)] dark:hover:bg-neutral-200"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>เข้าสู่ระบบ <ArrowRight className="h-4 w-4" /></>}
        </button>
        <p className="pt-1 text-center text-xs text-neutral-500 dark:text-neutral-400">ลืมรหัสผ่าน ติดต่อแอดมินทางเพจเพื่อรีเซ็ต</p>
      </form>
    </LiquidGlassShell>
  );
}
