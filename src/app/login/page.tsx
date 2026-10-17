'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AlertTriangle, Check, Crown, Eye, EyeOff, Gamepad2, Loader2, Lock, PlayCircle, Sparkles, User, Wand2 } from 'lucide-react';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { AuthShell, authStyles as s, type Mood } from '@/components/auth/AuthShell';

/** หน้าที่ขอไว้ก่อนมาล็อกอิน (?redirect=/dev) รับเฉพาะ path ภายในเว็บเรา */
function redirectTarget(): string {
  if (typeof window === 'undefined') return '/home';
  const r = new URLSearchParams(window.location.search).get('redirect');
  return r && r.startsWith('/') && !r.startsWith('//') ? r : '/home';
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [focus, setFocus] = useState<'user' | 'pass' | null>(null);
  const [errAt, setErrAt] = useState(0);
  const [query, setQuery] = useState('');
  // กันเดารหัสรัวๆ จากหน้าเว็บ: ผิดหลายครั้งต้องรอ (ด่านจริงอยู่ที่ Supabase Auth rate limit)
  const [fails, setFails] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);

  const { signIn, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('redirect');
    if (r && r.startsWith('/') && !r.startsWith('//')) setQuery(`?redirect=${encodeURIComponent(r)}`);
  }, []);

  // ล็อกอินอยู่แล้ว: ไปหน้าที่ขอไว้
  useEffect(() => {
    if (!isLoading && user && !done) router.replace(redirectTarget());
  }, [user, isLoading, done, router]);

  // ผิดแล้วน้องไฟว์จีส่ายหัวแป๊บหนึ่ง
  useEffect(() => {
    if (!errAt) return;
    const t = setTimeout(() => setErrAt(0), 1400);
    return () => clearTimeout(t);
  }, [errAt]);

  const fail = (m: string) => {
    setErrorMsg(m);
    setErrAt(Date.now());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || done) return;
    setErrorMsg('');

    if (!username.trim()) return fail('กรุณากรอกชื่อผู้ใช้');
    if (!password) return fail('กรุณากรอกรหัสผ่าน');
    if (Date.now() < lockUntil) return fail(`ลองผิดหลายครั้ง กรุณารอ ${Math.ceil((lockUntil - Date.now()) / 1000)} วินาทีแล้วลองใหม่`);

    setIsSubmitting(true);
    try {
      const res = await signIn(username, password);
      if (!res.success) {
        const n = fails + 1;
        setFails(n);
        if (n >= 5) setLockUntil(Date.now() + Math.min(300, 30 * 2 ** (n - 5)) * 1000);
        fail(res.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        setIsSubmitting(false);
      } else {
        setFails(0);
        setDone(true);
        // ฉลองสั้นๆ แล้วค่อยไป
        setTimeout(() => router.push(redirectTarget()), 900);
      }
    } catch {
      fail('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
      setIsSubmitting(false);
    }
  };

  const mood: Mood = done ? 'happy' : errAt ? 'error' : focus === 'pass' && !showPassword ? 'secret' : focus ? 'focus' : 'idle';

  const panel = (
    <>
      <p className="font-display text-lg">ยังไม่มีบัญชี? เริ่มได้ 3 ขั้น</p>
      <div className={`${s.steps} mt-3`}>
        <div className={s.step}>
          <span className={s.stepNum} style={{ background: '#3fd6a8' }}>
            <Sparkles className="w-4 h-4" strokeWidth={2.6} />
          </span>
          <span>
            <b>สมัครบัญชีฟรี</b> ลองสร้างชุดคำถามของตัวเอง 2 ชุด แล้วเปิดห้องให้เพื่อนเล่น
          </span>
        </div>
        <div className={s.step}>
          <span className={s.stepNum} style={{ background: '#ffcf3f' }}>
            <PlayCircle className="w-4 h-4" strokeWidth={2.6} />
          </span>
          <span>
            <b>ลองเล่นเกมในคลัง</b> กด &quot;ทดลองเล่น&quot; ได้ทุกเกม ครั้งละ 5 นาที
          </span>
        </div>
        <div className={s.step}>
          <span className={s.stepNum} style={{ background: '#ff8fc4' }}>
            <Crown className="w-4 h-4" strokeWidth={2.6} />
          </span>
          <span>
            <b>ชอบแล้วสมัครสมาชิก</b> เริ่มวันละ 19 บาท สแกนพร้อมเพย์ รับสิทธิ์ทันที บัญชีใหม่ลด 30% ใน 24 ชม.แรก
          </span>
        </div>
      </div>
      <div className={s.cta}>
        <Link href="/home" className={s.ctaBtn} style={{ background: '#bfe8ff' }}>
          <PlayCircle className="w-5 h-5" /> เปิดเว็บทดลอง
        </Link>
        <Link href="/membership" className={s.ctaBtn} style={{ background: 'linear-gradient(135deg,#ffd75e,#ff9a3d)' }}>
          <Crown className="w-5 h-5" /> ดูแพลนสมาชิก
        </Link>
      </div>
    </>
  );

  return (
    <AuthShell
      mode="login"
      mood={mood}
      celebrate={done}
      query={query}
      backHref="/home"
      backLabel="หน้าหลัก"
      headline={
        <>
          กลับมาแล้ว!
          <br />
          <span>ไปผจญภัยต่อกัน</span>
        </>
      }
      lead="เกมการเรียนรู้ ป.1-ป.6 คณิต วิทย์ อังกฤษ และระบบสร้างเกมของคุณเอง"
      perks={[
        { icon: <Gamepad2 className="w-4 h-4" />, text: 'เกมทุกวิชา' },
        { icon: <Wand2 className="w-4 h-4" />, text: 'สร้างเกมเองได้' },
        { icon: <Sparkles className="w-4 h-4" />, text: 'ไม่มีโฆษณา' },
      ]}
      panel={panel}
    >
      <div className={s.stagger}>
        <h2 className={s.title} style={{ ['--i' as string]: 0 }}>
          เข้าสู่ระบบ
        </h2>
        <p className={s.subtitle} style={{ ['--i' as string]: 1 }}>
          ใช้ชื่อผู้ใช้และรหัสผ่านของคุณ
        </p>

        <form onSubmit={handleSubmit} className={s.form} style={{ ['--i' as string]: 2 }} noValidate>
          {errorMsg && (
            <div role="alert" className={s.alert} key={errAt}>
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label htmlFor="username" className={s.label}>
              ชื่อผู้ใช้
            </label>
            <div className={s.field}>
              <span className={s.fieldIcon}>
                <User className="w-5 h-5" strokeWidth={2.6} />
              </span>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={username}
                onFocus={() => setFocus('user')}
                onBlur={() => setFocus(null)}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ชื่อผู้ใช้ของคุณ"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className={s.label}>
              รหัสผ่าน
            </label>
            <div className={s.field}>
              <span className={s.fieldIcon}>
                <Lock className="w-5 h-5" strokeWidth={2.6} />
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onFocus={() => setFocus('pass')}
                onBlur={() => setFocus(null)}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="รหัสผ่าน"
              />
              <button type="button" className={s.eye} onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting || done} className={s.submit} data-done={done}>
            {done ? (
              <>
                <Check className="w-6 h-6" strokeWidth={3.5} /> เข้าสู่ระบบแล้ว
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> กำลังเข้าสู่ระบบ
              </>
            ) : (
              'เข้าสู่ระบบ'
            )}
          </button>
        </form>

        <div className={s.foot} style={{ ['--i' as string]: 3 }}>
          ยังไม่มีบัญชี?{' '}
          <Link href={`/signup${query}`}>สมัครบัญชีฟรี</Link>
          <div className="mt-2 inline-flex items-center gap-1.5 justify-center w-full">
            ลืมรหัสผ่าน?
            <a href="https://www.facebook.com/profile.php?id=61594556657667" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
              <FacebookIcon className="w-3.5 h-3.5" /> ติดต่อแอดมินทางเพจ
            </a>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
