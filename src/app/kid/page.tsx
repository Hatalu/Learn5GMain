'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthShell } from '@/components/ui/AuthShell';
import { PinPad } from '@/components/kids/PinPad';

function KidLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const { signInKid } = useAuth();

  const [code, setCode] = useState('');
  const [step, setStep] = useState<'code' | 'pin'>('code');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const submitted = useRef('');

  // เปิดจาก QR/ลิงก์บนบัตรนักเรียน: มีรหัสมาให้แล้ว ข้ามไปใส่ PIN เลย
  useEffect(() => {
    const c = (params.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length >= 4) {
      setCode(c);
      setStep('pin');
    }
  }, [params]);

  // ครบ 4 หลักแล้วเข้าให้อัตโนมัติ
  useEffect(() => {
    if (step !== 'pin' || pin.length !== 4 || busy) return;
    const key = `${code}:${pin}`;
    if (submitted.current === key) return;
    submitted.current = key;

    (async () => {
      setBusy(true);
      setError('');
      const res = await signInKid(code, pin);
      if (res.success) {
        const wanted = params.get('redirect');
        const safe = wanted && wanted.startsWith('/') && !wanted.startsWith('//') ? wanted : '/me';
        router.replace(safe);
        return;
      }
      setError(res.error || 'เข้าไม่ได้ ลองใหม่อีกครั้งนะ');
      setShake(true);
      setTimeout(() => setShake(false), 700);
      setPin('');
      submitted.current = '';
      setBusy(false);
    })();
  }, [pin, step, code, busy, signInKid, router, params]);

  return (
    <AuthShell title="เข้าห้องผจญภัย" subtitle={step === 'code' ? 'ใส่รหัสนักเรียนของหนู' : 'ใส่เลข PIN 4 หลัก'}>
      {step === 'code' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length >= 4) setStep('pin');
          }}
          className="space-y-5"
        >
          <div>
            <label htmlFor="code" className="block text-center text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
              รหัสนักเรียน (อยู่บนบัตรที่ครูหรือผู้ปกครองให้)
            </label>
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="ABC123"
              className="w-full text-center tracking-[0.35em] font-display text-3xl px-4 py-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={code.length < 4}
            className="btn-primary-grad w-full py-4 rounded-2xl font-display text-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            ต่อไป <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      ) : (
        <div>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-5">
            รหัส <span className="font-display tracking-widest text-gray-900 dark:text-white">{code}</span>{' '}
            <button
              type="button"
              onClick={() => {
                setStep('code');
                setPin('');
                setError('');
              }}
              className="ml-1 text-indigo-600 dark:text-indigo-400 underline text-sm"
            >
              เปลี่ยน
            </button>
          </p>
          <PinPad value={pin} onChange={setPin} disabled={busy} shake={shake} />
          <div className="mt-5 min-h-[3rem] text-center" aria-live="assertive">
            {busy ? (
              <span className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-300 font-semibold">
                <Loader2 className="w-5 h-5 animate-spin" /> กำลังเข้า...
              </span>
            ) : error ? (
              <p role="alert" className="text-rose-600 dark:text-rose-300 text-sm font-medium">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      )}

      <div className="mt-6 pt-5 border-t border-gray-200/80 dark:border-gray-800 text-center text-sm text-gray-500 dark:text-gray-400 space-y-1.5">
        <p>ลืมรหัสหรือ PIN? บอกครูหรือผู้ปกครองให้ช่วยดูนะ</p>
        <p>
          <Link href="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            ผู้ปกครอง / คุณครู เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default function KidPage() {
  return (
    <Suspense fallback={null}>
      <KidLogin />
    </Suspense>
  );
}
