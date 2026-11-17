'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getTurnstileToken } from '@/lib/turnstile';
import { signupSchema } from '@/lib/validations/signup';
import { redirectTarget } from '@/lib/utils/redirect';
import { LiquidGlassShell, STRENGTH_LABELS, glassInput, glassLabel, passwordStrength } from '@/components/ui/sign-in-water-effect-glass';

type Field = 'username' | 'email' | 'password' | 'confirm';

export default function SignupPage() {
  const { signIn, user, isLoading } = useAuth();
  const router = useRouter();
  const [v, setV] = useState<Record<Field, string>>({ username: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const r = redirectTarget('');
    if (r) setQuery(`?redirect=${encodeURIComponent(r)}`);
  }, []);

  useEffect(() => {
    if (!isLoading && user && !busy && !done) router.replace(redirectTarget());
  }, [isLoading, user, busy, done, router]);

  const set = (k: Field, val: string) => {
    setV((o) => ({ ...o, [k]: val }));
    if (errors[k]) setErrors((o) => ({ ...o, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || done) return;
    setMsg('');
    const parsed = signupSchema.safeParse(v);
    if (!parsed.success) {
      const out: Partial<Record<Field, string>> = {};
      for (const is of parsed.error.issues) {
        const k = is.path[0] as Field;
        if (!out[k]) out[k] = is.message;
      }
      return setErrors(out);
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v, cf: await getTurnstileToken('signup') }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; field?: Field };
      if (!res.ok) {
        if (j.field) setErrors({ [j.field]: j.error });
        else setMsg(j.error || 'สมัครไม่สำเร็จ ลองใหม่อีกครั้ง');
        setBusy(false);
        return;
      }
      // สมัครเสร็จ: เข้าสู่ระบบให้เลย
      const si = await signIn(v.username, v.password);
      if (!si.success) return router.push('/login');
      setDone(true);
      setTimeout(() => router.replace(redirectTarget('/create')), 1400);
    } catch {
      setMsg('เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่');
      setBusy(false);
    }
  };

  const st = passwordStrength(v.password);
  const err = (k: Field) =>
    errors[k] ? (
      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400" role="alert">
        {errors[k]}
      </p>
    ) : null;

  return (
    <LiquidGlassShell
      title={done ? 'สมัครเรียบร้อย' : 'สร้างบัญชีครู'}
      subtitle={done ? undefined : 'ฟรี ใช้เวลาไม่ถึงนาที แตะกระจกเพื่อดูคลื่นน้ำ'}
      footer={
        done ? undefined : (
          <>
            มีบัญชีอยู่แล้ว?{' '}
            <Link href={`/login${query}`} className="font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-white">
              เข้าสู่ระบบ
            </Link>
          </>
        )
      }
    >
      {done ? (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black dark:shadow-[0_0_25px_rgba(255,255,255,0.4)]">
            <Check className="h-7 w-7" strokeWidth={2.5} />
          </span>
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">ยินดีต้อนรับ {v.username} กำลังพาไปเริ่มสร้างเกม</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="su-user" className={glassLabel}>
              ชื่อผู้ใช้
            </label>
            <input id="su-user" value={v.username} onChange={(e) => set('username', e.target.value)} autoComplete="username" maxLength={20} placeholder="a-z ตัวเลข _ - (3-20 ตัว)" className={glassInput} />
            {err('username')}
          </div>
          <div>
            <label htmlFor="su-email" className={glassLabel}>
              อีเมล Gmail
            </label>
            <input id="su-email" type="email" inputMode="email" value={v.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" maxLength={254} placeholder="name@gmail.com" className={glassInput} />
            {err('email')}
          </div>
          <div>
            <label htmlFor="su-pass" className={glassLabel}>
              รหัสผ่าน
            </label>
            <div className="relative">
              <input
                id="su-pass"
                type={show ? 'text' : 'password'}
                value={v.password}
                onChange={(e) => set('password', e.target.value)}
                autoComplete="new-password"
                placeholder="อย่างน้อย 8 ตัว"
                className={`${glassInput} pr-11`}
              />
              <button type="button" onClick={() => setShow((x) => !x)} aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {v.password.length > 0 && (
              <div className="space-y-1 pt-2">
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < st ? 'bg-neutral-900 dark:bg-white' : 'bg-black/10 dark:bg-white/15'}`} />
                  ))}
                </div>
                <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400">
                  <span>ความแข็งแรงของรหัสผ่าน</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{STRENGTH_LABELS[st]}</span>
                </div>
              </div>
            )}
            {err('password')}
          </div>
          <div>
            <label htmlFor="su-confirm" className={glassLabel}>
              ยืนยันรหัสผ่าน
            </label>
            <input id="su-confirm" type={show ? 'text' : 'password'} value={v.confirm} onChange={(e) => set('confirm', e.target.value)} autoComplete="new-password" placeholder="พิมพ์รหัสผ่านอีกครั้ง" className={glassInput} />
            {err('confirm')}
          </div>

          {msg && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {msg}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 text-sm font-semibold text-white transition-all hover:bg-neutral-700 active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-black dark:shadow-[0_4px_25px_rgba(255,255,255,0.2)] dark:hover:bg-neutral-200"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>สร้างบัญชี <ArrowRight className="h-4 w-4" /></>}
          </button>
          <p className="text-center text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">บัญชีฟรีใช้ระบบสร้างเกมและสื่อได้ทันที อัปเกรดเป็น Plus Pro หรือ Master ได้ภายหลัง</p>
        </form>
      )}
    </LiquidGlassShell>
  );
}
