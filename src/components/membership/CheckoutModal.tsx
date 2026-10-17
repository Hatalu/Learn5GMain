'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Download, Eye, EyeOff, Gift, ImagePlus, Loader2, QrCode, RefreshCw, ShieldCheck, Timer, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Offer, Plan, WELCOME_PCT, planLength } from '@/lib/plans';
import { CONTACT_PAGE_URL } from '@/lib/membership';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { getTurnstileToken } from '@/lib/turnstile';
import s from '@/app/membership/membership.module.css';
import { PriceBlock, fmtLeft, useCountdown } from './Pricing';

interface Order {
  orderId: string;
  amount: number;
  listAmount?: number;
  days?: number;
  bonusDays?: number;
  welcome?: boolean;
  qr: string;
  expiresAt: string;
  accountName: string;
  bankName: string | null;
  promptpay: string;
  forUsername: string | null;
}

type Step = 'loading' | 'pay' | 'verifying' | 'done' | 'error';

const fmt = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

const CONFETTI = ['#ff6b7a', '#ffcf3f', '#3fd6a8', '#4a7bf0', '#9b6cf0', '#ff9a3d'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Props {
  plan: Plan | null;
  plans: Plan[];
  offer: Offer;
  skew: number;
  onPick: (p: Plan | null) => void;
  onClose: () => void;
  onPaid?: () => void;
}

/**
 * หน้าต่างจ่ายเงินสมาชิก เปิดได้จากทุกหน้า (ผ่าน MembershipProvider)
 * ไม่ระบุแพลน = ให้เลือกแพลนในหน้าต่างก่อน แล้วค่อยสร้าง QR
 */
export function CheckoutModal(props: Props) {
  if (!props.plan) return <PlanPicker {...props} />;
  return <Checkout key={props.plan.id} {...props} plan={props.plan} />;
}

function Shell({
  title,
  sub,
  image,
  onClose,
  closable = true,
  wide = false,
  children,
}: {
  title: string;
  sub: React.ReactNode;
  image: string;
  onClose: () => void;
  closable?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  // Esc ปิด + ล็อก scroll
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closable && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, closable]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-5 bg-[#1d1a3a]/75 backdrop-blur-sm animate-fade-in" onMouseDown={() => closable && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ overflowY: 'auto' }}
        className={`${s.world} w-full ${wide ? 'max-w-4xl' : 'max-w-3xl'} max-h-[96vh] rounded-[2rem] border-[3px] border-[#2a2350] shadow-[0_10px_0_#2a2350] animate-pop-in text-[#2a2350]`}
      >
        <div className={s.dots} />
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 sm:px-6 py-3 bg-[#fff8ec] border-b-[3px] border-[#2a2350]">
          <div className="relative w-11 h-11 shrink-0">
            <Image src={image} alt="" fill sizes="44px" className="object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-lg leading-tight truncate">{title}</p>
            <p className="text-sm font-bold opacity-75">{sub}</p>
          </div>
          {closable && (
            <button type="button" onClick={onClose} aria-label="ปิด" className="p-2 rounded-xl border-[3px] border-[#2a2350] bg-white hover:bg-[#ffeccb]">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="relative p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

/** ขั้นเลือกแพลน (เมื่อเปิดหน้าต่างจากปุ่มทั่วไป) */
function PlanPicker({ plans, offer, skew, onPick, onClose }: Props) {
  const welcomeLeft = useCountdown(offer.welcomeEndsAt, skew);
  return (
    <Shell title="สมัครสมาชิก" sub="เลือกแพลน แล้วสแกนจ่ายพร้อมเพย์ได้ทันที" image="/plans/fiveg-kid.webp" onClose={onClose} wide>
      {welcomeLeft > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-center gap-2 rounded-2xl border-[3px] border-[#2a2350] px-3 py-2 font-bold text-center" style={{ background: 'linear-gradient(100deg,#ffd75e,#ff9ad5)' }}>
          <Gift className="w-5 h-5" /> ส่วนลด {WELCOME_PCT}% บัญชีใหม่ เหลือเวลา
          <span className="px-2 py-0.5 rounded-lg bg-[#2a2350] text-white font-display tabular-nums">{fmtLeft(welcomeLeft)}</span>
        </div>
      )}
      <div className={`grid gap-x-4 gap-y-6 grid-cols-1 sm:grid-cols-2 ${plans.length > 3 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {plans.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p)}
            className="relative flex flex-col items-center px-3 pt-5 pb-4 text-center rounded-3xl border-[3px] border-[#2a2350] shadow-[0_5px_0_#2a2350] hover:-translate-y-1 transition-transform"
            style={{ background: p.color.soft }}
          >
            {p.badge && (
              <span
                className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-0.5 rounded-full border-2 border-[#2a2350] text-xs font-bold"
                style={{ background: p.id === 'grown' ? '#ff6b7a' : '#ffcf3f', color: p.id === 'grown' ? '#fff' : '#2a2350' }}
              >
                {p.badge}
              </span>
            )}
            <div className="relative w-20 h-24">
              <Image src={p.image} alt="" fill sizes="80px" className="object-contain" />
            </div>
            <p className="mt-1 font-display text-lg leading-tight">{p.name}</p>
            <div className="mt-2">
              <PriceBlock plan={p} offer={offer} compact />
            </div>
            <span className={`${s.btn} mt-3 w-full py-2 text-sm`} style={{ background: p.color.main }}>
              <QrCode className="w-4 h-4" /> เลือกแพลนนี้
            </span>
          </button>
        ))}
      </div>
      <p className="mt-5 text-center text-sm font-bold">
        <Link href="/membership" onClick={onClose} className="underline decoration-2 underline-offset-4">
          ดูรายละเอียดว่าสมาชิกได้อะไรบ้าง
        </Link>
      </p>
    </Shell>
  );
}

function Checkout({ plan, plans, onClose, onPick, onPaid }: Props & { plan: Plan }) {
  const { user, signIn, refreshProfile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>('loading');
  const [order, setOrder] = useState<Order | null>(null);
  const [fatal, setFatal] = useState('');
  const [err, setErr] = useState('');
  const [left, setLeft] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [email, setEmail] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [result, setResult] = useState<{ username: string; premiumUntil: string; bonusDays: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const guest = !user;

  const createOrder = useCallback(async () => {
    setStep('loading');
    setErr('');
    try {
      const res = await fetch('/api/membership/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id, cf: await getTurnstileToken('order') }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFatal(j.error || 'สร้างคำสั่งซื้อไม่สำเร็จ');
        setStep('error');
        return;
      }
      setOrder(j);
      setStep('pay');
    } catch {
      setFatal('เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่');
      setStep('error');
    }
  }, [plan.id]);

  useEffect(() => {
    createOrder();
  }, [createOrder]);

  // นับถอยหลังอายุ QR
  useEffect(() => {
    if (!order) return;
    const tick = () => setLeft(new Date(order.expiresAt).getTime() - Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [order]);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  const pickFile = (f: File | null) => {
    setErr('');
    if (!f) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) {
      setErr('รองรับเฉพาะรูป JPG PNG WEBP');
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      setErr('รูปใหญ่เกิน 4MB');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!order) return;
    setErr('');
    if (!file) return setErr('แนบรูปสลิปก่อนนะ');
    if (guest) {
      if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username.trim())) return setErr('ชื่อผู้ใช้ใช้ภาษาอังกฤษ ตัวเลข _ หรือ - ยาว 3-30 ตัว');
      if (password.length < 8) return setErr('รหัสผ่านต้องยาวอย่างน้อย 8 ตัว');
      if (password !== password2) return setErr('รหัสผ่านสองช่องไม่ตรงกัน');
      if (email.trim() && !EMAIL.test(email.trim())) return setErr('อีเมลไม่ถูกต้อง');
    }
    setStep('verifying');
    const fd = new FormData();
    fd.append('orderId', order.orderId);
    fd.append('slip', file);
    fd.append('cf', (await getTurnstileToken('verify')) || '');
    if (guest) {
      fd.append('username', username.trim());
      fd.append('password', password);
      if (email.trim()) fd.append('email', email.trim());
    }
    try {
      const res = await fetch('/api/membership/verify', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setErr(j.error || 'ตรวจสลิปไม่สำเร็จ ลองใหม่อีกครั้ง');
        setStep('pay');
        return;
      }
      if (guest) await signIn(username.trim(), password);
      else await refreshProfile();
      setResult({ username: j.username, premiumUntil: j.premiumUntil, bonusDays: Number(j.bonusDays || 0) });
      setStep('done');
      onPaid?.();
    } catch {
      setErr('เชื่อมต่อไม่ได้ ลองส่งใหม่อีกครั้ง');
      setStep('pay');
    }
  };

  const downloadQr = () => {
    if (!order) return;
    const a = document.createElement('a');
    a.href = order.qr;
    a.download = `qr-5g-${order.amount}baht.png`;
    a.click();
  };

  const expired = !!order && left <= 0;
  const inputCls =
    'w-full px-3.5 py-2.5 rounded-2xl border-[3px] border-[#2a2350] bg-white text-[#2a2350] font-semibold focus:outline-none focus:ring-4 focus:ring-[#ffcf3f]/60';
  const amount = order?.amount ?? plan.price;
  const bonus = order?.bonusDays ?? 0;

  return (
    <Shell
      title={plan.name}
      image={plan.image}
      closable={step !== 'verifying'}
      onClose={onClose}
      sub={
        <>
          {order?.welcome && <s className="mr-1 opacity-70">{plan.price}</s>}
          {amount} บาท · {planLength(plan)}
          {bonus > 0 && <span className="ml-1 text-emerald-700">+{bonus} วันฟรี</span>}
        </>
      }
    >
      {step === 'loading' && (
        <div className="py-20 flex flex-col items-center gap-3 font-bold">
          <Loader2 className="w-10 h-10 animate-spin" />
          กำลังสร้าง QR พร้อมเพย์...
        </div>
      )}

      {step === 'error' && (
        <div className={`${s.paper} p-6 text-center`}>
          <AlertCircle className="w-12 h-12 mx-auto text-[#ff6b7a]" />
          <p className="mt-3 font-display text-xl">{fatal}</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
            <button type="button" onClick={createOrder} className={`${s.btn} px-5 py-3 bg-[#ffcf3f]`}>
              <RefreshCw className="w-5 h-5" /> ลองใหม่
            </button>
            <a href={CONTACT_PAGE_URL} target="_blank" rel="noopener noreferrer" className={`${s.btn} px-5 py-3 bg-white`}>
              <FacebookIcon className="w-5 h-5" /> สมัครผ่านเพจ
            </a>
          </div>
        </div>
      )}

      {(step === 'pay' || step === 'verifying') && order && (
        <>
          {plans.length > 1 && step === 'pay' && (
            <button type="button" onClick={() => onPick(null)} className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold underline decoration-2 underline-offset-4">
              <ArrowLeft className="w-4 h-4" /> เปลี่ยนแพลน
            </button>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            {/* ฝั่ง QR */}
            <div className={`${s.paper} p-4 sm:p-5 text-center`}>
              <div className="rounded-2xl bg-[#113566] text-white py-2 font-bold tracking-wide">พร้อมเพย์ PromptPay</div>
              <div className="relative mt-3 mx-auto w-full max-w-[260px] aspect-square rounded-2xl border-[3px] border-[#2a2350] bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={order.qr} alt={`QR พร้อมเพย์ ยอด ${order.amount} บาท`} className={`w-full h-full ${expired ? 'opacity-15 blur-[2px]' : ''}`} />
                {expired && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <p className="font-display text-lg">QR หมดอายุแล้ว</p>
                    <button type="button" onClick={createOrder} className={`${s.btn} px-4 py-2 bg-[#ffcf3f] text-sm`}>
                      <RefreshCw className="w-4 h-4" /> สร้าง QR ใหม่
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-3 font-display text-4xl">
                {order.amount.toFixed(2)} <span className="text-lg">บาท</span>
              </p>
              {order.welcome && (
                <p className="text-sm font-bold text-[#e0344a]">
                  ส่วนลดบัญชีใหม่ {WELCOME_PCT}% จากราคาปกติ <s>{order.listAmount ?? plan.price}</s> บาท
                </p>
              )}
              {bonus > 0 && <p className="text-sm font-bold text-emerald-700">โบนัสต่ออายุ ได้เพิ่ม {bonus} วันฟรี</p>}
              <p className="text-sm font-bold">โอนยอดนี้ให้ตรงเป๊ะ</p>
              <div className="mt-3 rounded-2xl bg-[#ffeccb] border-2 border-[#2a2350] px-3 py-2 text-sm font-semibold text-left">
                <p>
                  ชื่อบัญชี: <b>{order.accountName}</b>
                </p>
                {order.bankName && <p>ธนาคาร: {order.bankName}</p>}
                <p>พร้อมเพย์: {order.promptpay}</p>
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 text-sm font-bold">
                <Timer className="w-4 h-4" />
                {expired ? 'QR หมดอายุ' : `QR ใช้ได้อีก ${fmt(left)}`}
              </div>
              <button type="button" onClick={downloadQr} disabled={expired} className={`${s.btn} mt-3 w-full py-2.5 bg-white text-sm`}>
                <Download className="w-4 h-4" /> บันทึกรูป QR
              </button>
              <p className="mt-2 text-xs font-semibold opacity-70">บนมือถือ: บันทึกรูป แล้วเปิดแอปธนาคาร เลือกสแกนจากรูปภาพ</p>
            </div>

            {/* ฝั่งส่งสลิป */}
            <div className="flex flex-col gap-4">
              <div className={`${s.paper} p-4 sm:p-5`}>
                <p className="font-display text-lg">โอนแล้ว ส่งสลิปที่นี่</p>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] || null)} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    pickFile(e.dataTransfer.files?.[0] || null);
                  }}
                  className="mt-2 w-full min-h-[150px] rounded-2xl border-[3px] border-dashed border-[#2a2350] bg-white hover:bg-[#fffbf3] flex items-center justify-center overflow-hidden"
                >
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="สลิปที่เลือก" className="max-h-[220px] object-contain" />
                  ) : (
                    <span className="flex flex-col items-center gap-1 py-6 font-bold">
                      <ImagePlus className="w-9 h-9" />
                      แตะเพื่อเลือกรูปสลิป
                      <span className="text-xs font-semibold opacity-60">JPG PNG WEBP ไม่เกิน 4MB</span>
                    </span>
                  )}
                </button>
              </div>

              {guest ? (
                <div className={`${s.paper} p-4 sm:p-5 space-y-2.5`}>
                  <p className="font-display text-lg">ตั้งชื่อผู้ใช้สำหรับเข้าเล่น</p>
                  <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ชื่อผู้ใช้ (ภาษาอังกฤษ)" autoComplete="username" maxLength={30} className={inputCls} />
                  <div className="relative">
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPw ? 'text' : 'password'}
                      placeholder="รหัสผ่าน อย่างน้อย 8 ตัว"
                      autoComplete="new-password"
                      className={inputCls + ' pr-11'}
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)} aria-label="แสดงรหัสผ่าน" className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <input value={password2} onChange={(e) => setPassword2(e.target.value)} type={showPw ? 'text' : 'password'} placeholder="ยืนยันรหัสผ่าน" autoComplete="new-password" className={inputCls} />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    inputMode="email"
                    placeholder="อีเมล (ไม่บังคับ) ไว้แจ้งเตือนก่อนหมดอายุ"
                    autoComplete="email"
                    maxLength={254}
                    className={inputCls}
                  />
                  <p className="text-xs font-semibold opacity-75">
                    มีบัญชีอยู่แล้ว?{' '}
                    <Link href="/login?redirect=%2Fmembership" onClick={onClose} className="underline font-bold">
                      เข้าสู่ระบบก่อน
                    </Link>{' '}
                    ระบบจะต่ออายุให้บัญชีเดิม
                  </p>
                </div>
              ) : (
                <div className={`${s.paper} px-4 py-3 text-sm font-semibold`}>
                  ต่ออายุให้บัญชี <b>{order.forUsername}</b> วันจะต่อจากวันหมดอายุเดิม
                </div>
              )}

              {err && (
                <div className="flex items-start gap-2 rounded-2xl border-[3px] border-[#2a2350] bg-[#ffe1e5] px-3.5 py-2.5 text-sm font-bold" role="alert">
                  <AlertCircle className="w-5 h-5 shrink-0 text-[#e0344a]" />
                  <span>{err}</span>
                </div>
              )}

              <button type="button" onClick={submit} disabled={step === 'verifying'} className={`${s.btn} w-full py-3.5 font-display text-lg bg-[#3fd6a8]`}>
                <ShieldCheck className="w-5 h-5" /> ตรวจสลิปและเปิดสิทธิ์
              </button>
              <p className="text-xs text-center font-semibold opacity-70">ตรวจสลิปกับธนาคารอัตโนมัติ สลิป 1 ใบใช้ได้ครั้งเดียว</p>
            </div>
          </div>
        </>
      )}

      {/* กำลังตรวจ */}
      {step === 'verifying' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#fff8ec]/90 backdrop-blur-sm rounded-b-[2rem]">
          <div className={`relative w-28 h-36 ${s.wobble}`}>
            <Image src="/plans/fiveg-egg.webp" alt="" fill sizes="112px" className="object-contain" />
          </div>
          <p className="font-display text-xl">กำลังตรวจสลิป...</p>
          <p className="text-sm font-semibold opacity-70">ใช้เวลาไม่เกินครึ่งนาที อย่าเพิ่งปิดหน้านี้นะ</p>
        </div>
      )}

      {/* สำเร็จ */}
      {step === 'done' && result && (
        <div className="relative py-6 text-center overflow-hidden">
          {Array.from({ length: 36 }).map((_, i) => (
            <span key={i} className={s.confetti} style={{ left: `${(i * 37) % 100}%`, background: CONFETTI[i % CONFETTI.length], animationDelay: `${(i % 9) * 0.12}s` }} />
          ))}
          <div className="relative mx-auto w-52 h-56">
            <span className={s.burst} />
            <div className={`absolute inset-0 ${s.bob}`}>
              <Image src={plan.image} alt={plan.name} fill sizes="208px" className="object-contain" />
            </div>
          </div>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl text-white" style={{ textShadow: '0 3px 0 #2a2350' }}>
            ยินดีต้อนรับสมาชิก!
          </h2>
          <div className={`${s.paper} mt-4 inline-block px-5 py-3 font-semibold`}>
            บัญชี <b>{result.username}</b> ใช้ได้ถึง <b>{new Date(result.premiumUntil).toLocaleDateString('th-TH', { dateStyle: 'long' })}</b>
            {result.bonusDays > 0 && <span className="block text-sm text-emerald-700">รวมโบนัสต่ออายุ {result.bonusDays} วันแล้ว</span>}
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push('/home');
              }}
              className={`${s.btn} px-6 py-3.5 font-display text-lg bg-[#ffcf3f]`}
            >
              ไปเล่นเกมเลย
            </button>
            <button type="button" onClick={onClose} className={`${s.btn} px-6 py-3.5 bg-white`}>
              <X className="w-5 h-5" /> ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}
