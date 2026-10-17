'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, ChevronDown, Crown, Eye, EyeOff, FolderHeart, Loader2, Lock, Mail, ShieldCheck, Sparkles, User, Wand2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getTurnstileToken } from '@/lib/turnstile';
import { RESERVED_NAMES, normalizeGmail, signupSchema } from '@/lib/validations/signup';
import { TierCompare } from '@/components/creator/TierCompare';
import { FREE_SET_LIMIT, FREE_UPLOAD_MB } from '@/lib/game-creator/quota';
import { AuthShell, authStyles as s, type Mood } from '@/components/auth/AuthShell';
import { useTour } from '@/components/tour/TourProvider';

/** หน้าที่ขอไว้ก่อนมาสมัคร (?redirect=/create) รับเฉพาะ path ภายในเว็บเรา */
function redirectTarget(): string {
  if (typeof window === 'undefined') return '/create';
  const r = new URLSearchParams(window.location.search).get('redirect');
  return r && r.startsWith('/') && !r.startsWith('//') ? r : '/create';
}

type Field = 'username' | 'email' | 'password' | 'confirm';

/** ช่องนี้กรอกถูกรูปแบบแล้วหรือยัง (โชว์เครื่องหมายถูก) */
function fieldOk(k: Field, v: Record<Field, string>): boolean {
  const u = v.username.trim();
  if (k === 'username') return /^[a-zA-Z0-9_-]{3,20}$/.test(u) && !u.toLowerCase().startsWith('trial_') && !RESERVED_NAMES.includes(u.toLowerCase());
  if (k === 'email') return normalizeGmail(v.email) !== null;
  if (k === 'password') return v.password.length >= 8 && v.password.length <= 72;
  return v.confirm.length > 0 && v.confirm === v.password && v.password.length >= 8;
}

/** ความแข็งแรงของรหัสผ่าน 0-4 */
function strength(pw: string): number {
  if (!pw) return 0;
  let n = 0;
  if (pw.length >= 8) n++;
  if (pw.length >= 12) n++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) n++;
  if (/\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) n++;
  else if (/\d/.test(pw) && n < 4) n += 0.5;
  return Math.min(4, Math.max(1, Math.round(n)));
}
const STRENGTH = [
  { t: '', c: 'transparent' },
  { t: 'อ่อน', c: '#ff6b7a' },
  { t: 'พอใช้', c: '#ff9a3d' },
  { t: 'ดี', c: '#4a7bf0' },
  { t: 'แข็งแรงมาก', c: '#2fd196' },
];

function SignupInner() {
  const { signIn, user, isLoading } = useAuth();
  const router = useRouter();
  const tour = useTour();
  const [v, setV] = useState<Record<Field, string>>({ username: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [focus, setFocus] = useState<Field | null>(null);
  const [errAt, setErrAt] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('redirect');
    if (r && r.startsWith('/') && !r.startsWith('//')) setQuery(`?redirect=${encodeURIComponent(r)}`);
  }, []);

  useEffect(() => {
    if (!isLoading && user && !busy && !done) router.replace(redirectTarget());
  }, [isLoading, user, busy, done, router]);

  useEffect(() => {
    if (!errAt) return;
    const t = setTimeout(() => setErrAt(0), 1400);
    return () => clearTimeout(t);
  }, [errAt]);

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
      setErrors(out);
      setErrAt(Date.now());
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
        setErrAt(Date.now());
        setBusy(false);
        return;
      }
      // สมัครเสร็จ: เข้าสู่ระบบให้เลย ไม่ต้องกรอกซ้ำ
      const si = await signIn(v.username, v.password);
      if (!si.success) {
        router.push('/login');
        return;
      }
      setDone(true);
      // บัญชีใหม่: พาเที่ยวรอบเว็บก่อน (ทัวร์พาไปหน้าหลักเอง กดข้ามได้)
      setTimeout(() => tour.start(), 1100);
    } catch {
      setMsg('เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่นะ');
      setErrAt(Date.now());
      setBusy(false);
    }
  };

  const okCount = (['username', 'email', 'password', 'confirm'] as Field[]).filter((k) => fieldOk(k, v)).length;
  const mood: Mood = done ? 'happy' : errAt ? 'error' : (focus === 'password' || focus === 'confirm') && !show ? 'secret' : focus ? 'focus' : 'idle';
  const st = strength(v.password);

  const rows: { k: Field; label: string; icon: React.ReactNode; type: string; auto: string; ph: string }[] = [
    { k: 'username', label: 'ชื่อผู้ใช้', icon: <User className="w-5 h-5" strokeWidth={2.6} />, type: 'text', auto: 'username', ph: 'a-z ตัวเลข _ หรือ - (3-20 ตัว)' },
    { k: 'email', label: 'อีเมล', icon: <Mail className="w-5 h-5" strokeWidth={2.6} />, type: 'email', auto: 'email', ph: 'ชื่อคุณ@gmail.com' },
    { k: 'password', label: 'รหัสผ่าน', icon: <Lock className="w-5 h-5" strokeWidth={2.6} />, type: show ? 'text' : 'password', auto: 'new-password', ph: 'อย่างน้อย 8 ตัวอักษร' },
    { k: 'confirm', label: 'ยืนยันรหัสผ่าน', icon: <ShieldCheck className="w-5 h-5" strokeWidth={2.6} />, type: show ? 'text' : 'password', auto: 'new-password', ph: 'พิมพ์รหัสผ่านอีกครั้ง' },
  ];

  const panel = (
    <details className={s.details}>
      <summary>
        <Crown className="w-5 h-5 text-orange-500" />
        บัญชีฟรี กับ สมาชิก ต่างกันยังไง
        <ChevronDown className="w-5 h-5" />
      </summary>
      <div className="mt-3">
        <TierCompare />
        <p className="mt-3 text-sm font-semibold opacity-80">
          สมัครบัญชีวันนี้ รับส่วนลดสมาชิก 30% ภายใน 24 ชม.แรก ชุดคำถามที่สร้างไว้ไม่หาย{' '}
          <Link href="/membership" className="font-extrabold underline decoration-2 underline-offset-2">
            ดูแพลนสมาชิก
          </Link>
        </p>
      </div>
    </details>
  );

  return (
    <AuthShell
      mode="signup"
      mood={mood}
      celebrate={done}
      query={query}
      backHref="/create"
      backLabel="กลับ"
      headline={
        <>
          สร้างบัญชีฟรี
          <br />
          <span>แล้วสร้างเกมเองเลย</span>
        </>
      }
      lead="ใช้เวลาไม่ถึงนาที ลองสร้างชุดคำถามแล้วเปิดห้องให้เพื่อนเล่นได้ทันที"
      perks={[
        { icon: <Wand2 className="w-4 h-4" />, text: `สร้างชุดคำถามได้ ${FREE_SET_LIMIT} ชุดตลอดอายุบัญชี` },
        { icon: <FolderHeart className="w-4 h-4" />, text: `พื้นที่รูปและคลิป ${FREE_UPLOAD_MB} MB` },
        { icon: <Sparkles className="w-4 h-4" />, text: 'ไม่มีโฆษณา' },
      ]}
      panel={panel}
    >
      <div className={s.stagger}>
        <div className="flex items-end justify-between gap-3" style={{ ['--i' as string]: 0 }}>
          <div>
            <h2 className={s.title}>สมัครบัญชีใหม่</h2>
            <p className={s.subtitle}>ฟรี ไม่ต้องใช้บัตร ไม่ต้องยืนยันอีเมล</p>
          </div>
          <span className="flex gap-1.5 pb-1" aria-label={`กรอกครบ ${okCount} จาก 4 ช่อง`}>
            {[0, 1, 2, 3].map((i) => (
              <i
                key={i}
                className="block w-3 h-3 rounded-full border-2 border-[#2a2350] transition-all duration-300"
                style={{ background: i < okCount ? '#3fd6a8' : 'transparent', transform: i < okCount ? 'scale(1.2)' : 'scale(1)' }}
              />
            ))}
          </span>
        </div>

        <form onSubmit={submit} className={s.form} style={{ ['--i' as string]: 1 }} noValidate>
          {msg && (
            <div role="alert" className={s.alert} key={errAt}>
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{msg}</span>
            </div>
          )}

          {rows.map((r) => {
            const ok = fieldOk(r.k, v);
            return (
              <div key={r.k}>
                <label htmlFor={`su-${r.k}`} className={s.label}>
                  {r.label}
                  {r.k === 'password' && v.password && (
                    <span className={s.meterText} style={{ color: STRENGTH[st].c }}>
                      {STRENGTH[st].t}
                    </span>
                  )}
                </label>
                <div className={s.field} data-bad={!!errors[r.k]} key={errors[r.k] ? `bad-${errAt}` : 'ok'}>
                  <span className={s.fieldIcon}>{r.icon}</span>
                  <input
                    id={`su-${r.k}`}
                    type={r.type}
                    autoComplete={r.auto}
                    autoCapitalize="none"
                    spellCheck={false}
                    value={v[r.k]}
                    onFocus={() => setFocus(r.k)}
                    onBlur={() => setFocus(null)}
                    onChange={(e) => set(r.k, e.target.value)}
                    placeholder={r.ph}
                    aria-invalid={!!errors[r.k]}
                  />
                  {ok && (
                    <span className={s.ok} aria-hidden="true">
                      <Check className="w-4 h-4" strokeWidth={4} />
                    </span>
                  )}
                  {r.k === 'password' && (
                    <button type="button" className={s.eye} onClick={() => setShow(!show)} aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>
                      {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  )}
                </div>
                {r.k === 'password' && v.password && (
                  <div className={s.meter} aria-hidden="true">
                    {[1, 2, 3, 4].map((n) => (
                      <i key={n} data-on={n <= st} style={{ background: n <= st ? STRENGTH[st].c : undefined }} />
                    ))}
                  </div>
                )}
                {errors[r.k] && <p className={s.hint}>{errors[r.k]}</p>}
                {r.k === 'email' && !errors.email && (
                  <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                    ใช้ได้เฉพาะอีเมล Gmail และ 1 อีเมลสมัครได้ 1 บัญชี
                  </p>
                )}
              </div>
            );
          })}

          <p className="flex gap-2 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>เราเก็บอีเมลไว้ติดต่อเรื่องบัญชีและแจ้งเตือนสมาชิก ไม่เปิดเผยให้ใคร ยกเลิกรับอีเมลได้ทุกเมื่อ ล็อกอินด้วยชื่อผู้ใช้</span>
          </p>

          <button type="submit" disabled={busy || done} className={s.submit} data-done={done}>
            {done ? (
              <>
                <Check className="w-6 h-6" strokeWidth={3.5} /> สมัครสำเร็จ!
              </>
            ) : busy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> กำลังสมัคร
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" /> สมัครบัญชีฟรี
              </>
            )}
          </button>
        </form>

        <div className={s.foot} style={{ ['--i' as string]: 2 }}>
          มีบัญชีอยู่แล้ว? <Link href={`/login${query}`}>เข้าสู่ระบบ</Link>
        </div>
      </div>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}
