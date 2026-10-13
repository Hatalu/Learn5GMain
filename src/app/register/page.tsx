'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, GraduationCap, HeartHandshake, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthShell } from '@/components/ui/AuthShell';
import { cn } from '@/lib/utils/cn';

type Role = 'parent' | 'teacher';

const inputCls =
  'w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 text-gray-900 dark:text-white placeholder-gray-400 text-base focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all';

export default function RegisterPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [role, setRole] = useState<Role>('parent');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const strong = password.length >= 8;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!accept) {
      setError('กรุณาติ๊กยอมรับข้อตกลงและนโยบายความเป็นส่วนตัวก่อน');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName, role, acceptTerms: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'สมัครไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        return;
      }
      const login = await signIn(email, password);
      if (!login.success) {
        router.push('/login');
        return;
      }
      router.replace(role === 'teacher' ? '/teacher' : '/parent');
    } catch {
      setError('เชื่อมต่อไม่ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="สมัครสมาชิก" subtitle="สำหรับผู้ปกครองและคุณครู (นักเรียนไม่ต้องสมัครเอง)" wide>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && (
          <div role="alert" className="p-3.5 rounded-2xl text-sm bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/80 text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <fieldset>
          <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">ฉันคือ</legend>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { v: 'parent', label: 'ผู้ปกครอง', desc: 'ดูแลลูกที่บ้าน', Icon: HeartHandshake, grad: 'from-pink-400 to-rose-500' },
                { v: 'teacher', label: 'คุณครู', desc: 'สร้างห้องเรียน', Icon: GraduationCap, grad: 'from-indigo-500 to-violet-500' },
              ] as const
            ).map(({ v, label, desc, Icon, grad }) => (
              <button
                key={v}
                type="button"
                onClick={() => setRole(v)}
                aria-pressed={role === v}
                className={cn(
                  'btn-jelly p-4 rounded-2xl border-2 text-left transition-colors',
                  role === v
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 shadow-toy'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60'
                )}
              >
                <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} text-white flex items-center justify-center mb-2`}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="block font-display text-lg text-gray-900 dark:text-white">{label}</span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">{desc}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            ชื่อที่ใช้แสดง
          </label>
          <input id="name" className={inputCls} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={role === 'teacher' ? 'เช่น ครูมิ้นท์' : 'เช่น แม่น้องบีม'} maxLength={40} autoComplete="nickname" required />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            อีเมล
          </label>
          <input id="email" type="email" inputMode="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" autoComplete="email" required />
        </div>

        <div>
          <label htmlFor="pw" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            รหัสผ่าน
          </label>
          <div className="relative">
            <input id="pw" type={show ? 'text' : 'password'} className={cn(inputCls, 'pr-12')} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 8 ตัวอักษร" autoComplete="new-password" required />
            <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 px-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>
              {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2" aria-live="polite">
            <span className={cn('h-1.5 flex-1 rounded-full transition-colors', password.length === 0 ? 'bg-gray-200 dark:bg-gray-700' : strong ? 'bg-mint-500' : 'bg-sun-500')} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{password.length === 0 ? '' : strong ? 'ใช้ได้' : `อีก ${8 - password.length} ตัวอักษร`}</span>
          </div>
        </div>

        <label className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-1 w-5 h-5 rounded accent-indigo-600" />
          <span>
            ฉันยอมรับ <Link href="/privacy" target="_blank" className="font-semibold text-indigo-600 dark:text-indigo-400 underline">ข้อตกลงและนโยบายความเป็นส่วนตัว</Link>{' '}
            และยืนยันว่ามีสิทธิ์ดูแลข้อมูลของเด็กที่จะเพิ่มในบัญชีนี้
          </span>
        </label>

        <button type="submit" disabled={busy} className="btn-primary-grad w-full py-3.5 rounded-2xl font-display text-lg flex items-center justify-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          <span>{busy ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}</span>
        </button>

        <p className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
          <ShieldCheck className="w-4 h-4 shrink-0 text-mint-600" />
          เราไม่เก็บชื่อจริง รูป หรือที่อยู่ของเด็ก และไม่มีโฆษณาหรือแชท
        </p>

        <p className="text-center text-sm text-gray-600 dark:text-gray-300">
          มีบัญชีแล้ว?{' '}
          <Link href="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
