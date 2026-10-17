'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Sparkles, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/navbar/ThemeToggle';
import { getTurnstileToken } from '@/lib/turnstile';
import { signupSchema } from '@/lib/validations/signup';
import { TierCompare } from '@/components/creator/TierCompare';

/** หน้าที่ขอไว้ก่อนมาสมัคร (?redirect=/create) รับเฉพาะ path ภายในเว็บเรา */
function redirectTarget(): string {
  if (typeof window === 'undefined') return '/create';
  const r = new URLSearchParams(window.location.search).get('redirect');
  return r && r.startsWith('/') && !r.startsWith('//') ? r : '/create';
}

type Field = 'username' | 'email' | 'password' | 'confirm';

const INPUT =
  'w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/80 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all';
const LABEL = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5';

function SignupInner() {
  const { signIn, user, isLoading } = useAuth();
  const router = useRouter();
  const [v, setV] = useState({ username: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && user && !busy) router.replace(redirectTarget());
  }, [isLoading, user, busy, router]);

  const set = (k: Field, val: string) => {
    setV((o) => ({ ...o, [k]: val }));
    if (errors[k]) setErrors((o) => ({ ...o, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setMsg('');
    const parsed = signupSchema.safeParse(v);
    if (!parsed.success) {
      const out: Partial<Record<Field, string>> = {};
      for (const is of parsed.error.issues) {
        const k = is.path[0] as Field;
        if (!out[k]) out[k] = is.message;
      }
      setErrors(out);
      return;
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
        else setMsg(j.error || 'สมัครไม่สำเร็จ ลองใหม่อีกครั้งนะ');
        setBusy(false);
        return;
      }
      const si = await signIn(v.username, v.password);
      if (!si.success) {
        // สมัครสำเร็จแล้วแต่เข้าอัตโนมัติไม่ได้: ส่งไปหน้าเข้าสู่ระบบ
        router.push('/login');
        return;
      }
      router.push(redirectTarget());
    } catch {
      setMsg('เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่นะ');
      setBusy(false);
    }
  };

  const rows: { k: Field; label: string; icon: React.ReactNode; type: string; auto: string; ph: string }[] = [
    { k: 'username', label: 'ชื่อผู้ใช้', icon: <User className="w-4 h-4" />, type: 'text', auto: 'username', ph: 'ภาษาอังกฤษ ตัวเลข _ หรือ - (3-20 ตัว)' },
    { k: 'email', label: 'อีเมล', icon: <Mail className="w-4 h-4" />, type: 'email', auto: 'email', ph: 'name@example.com' },
    { k: 'password', label: 'รหัสผ่าน', icon: <Lock className="w-4 h-4" />, type: show ? 'text' : 'password', auto: 'new-password', ph: 'อย่างน้อย 8 ตัวอักษร' },
    { k: 'confirm', label: 'ยืนยันรหัสผ่าน', icon: <Lock className="w-4 h-4" />, type: show ? 'text' : 'password', auto: 'new-password', ph: 'พิมพ์รหัสผ่านอีกครั้ง' },
  ];

  return (
    <main className="min-h-screen relative flex flex-col justify-center items-center p-4 sm:p-6 bg-gradient-to-br from-indigo-50/70 via-background to-violet-50/50 dark:from-slate-950 dark:via-background dark:to-indigo-950/40">
      <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-violet-500/10 dark:bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-5 left-5 sm:top-8 sm:left-8 z-10">
        <Link
          href="/create"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 hover:bg-white dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm backdrop-blur-md transition-all active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>กลับ</span>
        </Link>
      </div>
      <div className="absolute top-5 right-5 sm:top-8 sm:right-8 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md lg:max-w-4xl relative z-10 pt-12 sm:pt-0">
        <div className="text-center mb-7">
          <h1 className="text-3xl sm:text-4xl font-medium text-gradient-brand">สมัครบัญชีใหม่</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">ฟรี ใช้เวลาไม่ถึงนาที แล้วลองสร้างชุดคำถามของคุณเองได้เลย</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:justify-center">
          <div className="bg-white/85 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-indigo-100 dark:border-indigo-900 rounded-[2rem] p-6 sm:p-8 shadow-toy-lg">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">ข้อมูลบัญชี</h2>
            </div>

            {msg && (
              <div role="alert" className="mb-4 p-3.5 rounded-xl text-sm bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/80 text-rose-700 dark:text-rose-300">
                {msg}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4" noValidate>
              {rows.map((r) => (
                <div key={r.k}>
                  <label htmlFor={`su-${r.k}`} className={LABEL}>
                    {r.label}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">{r.icon}</div>
                    <input
                      id={`su-${r.k}`}
                      type={r.type}
                      autoComplete={r.auto}
                      value={v[r.k]}
                      onChange={(e) => set(r.k, e.target.value)}
                      placeholder={r.ph}
                      aria-invalid={!!errors[r.k]}
                      className={`${INPUT} ${r.k === 'password' ? 'pr-11' : ''} ${errors[r.k] ? '!border-rose-400 focus:!ring-rose-400' : ''}`}
                    />
                    {r.k === 'password' && (
                      <button
                        type="button"
                        onClick={() => setShow(!show)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      >
                        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                  {errors[r.k] && <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400">{errors[r.k]}</p>}
                </div>
              ))}

              <p className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>เราเก็บอีเมลไว้ติดต่อเรื่องบัญชีเท่านั้น ไม่ส่งโฆษณา และไม่เปิดเผยให้ใคร ล็อกอินด้วยชื่อผู้ใช้ตามเดิม</span>
              </p>

              <button
                type="submit"
                disabled={busy}
                className="btn-primary-grad w-full py-3.5 px-4 rounded-2xl font-display font-medium text-base flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังสมัคร...</span>
                  </>
                ) : (
                  <span>สมัครบัญชีฟรี</span>
                )}
              </button>
            </form>

            <p className="mt-5 pt-4 border-t border-gray-200/80 dark:border-gray-800 text-center text-xs text-gray-500 dark:text-gray-400">
              มีบัญชีอยู่แล้ว?{' '}
              <Link href="/login" className="font-bold text-indigo-600 dark:text-indigo-300 hover:underline">
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>

          <aside className="rounded-[2rem] border-2 border-amber-200/80 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/90 to-pink-50/80 dark:from-amber-950/30 dark:to-pink-950/20 backdrop-blur-xl p-5 sm:p-7 shadow-toy">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">บัญชีฟรี กับ สมาชิก ต่างกันยังไง</p>
            <TierCompare className="mt-3" />
            <p className="mt-4 text-xs text-gray-600 dark:text-gray-300">
              ลองสร้างและเปิดห้องด้วยบัญชีฟรีก่อน ชอบแล้วค่อยสมัครสมาชิกตั้งแต่ 39 บาท ชุดคำถามที่สร้างไว้ไม่หาย{' '}
              <Link href="/membership" className="font-bold text-indigo-600 dark:text-indigo-300 hover:underline">
                ดูแพลนสมาชิก
              </Link>
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}
