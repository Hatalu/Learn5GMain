'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Check, Download, ImagePlus, Loader2, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PLANS, PLAN_DAYS, type Plan, nextTerm } from '@/lib/plans';
import { CONTACT_PAGE_URL } from '@/lib/membership';
import { getTurnstileToken } from '@/lib/turnstile';
import { cn } from '@/lib/utils/cn';

interface Order {
  orderId: string;
  amount: number;
  qr: string;
  expiresAt: string;
  accountName: string;
  bankName: string | null;
  promptpay: string;
  forUsername: string | null;
}

type Step = 'login' | 'loading' | 'pay' | 'verifying' | 'done' | 'error';

const fmt = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
const thDate = (iso: string) => new Date(iso).toLocaleDateString('th-TH', { dateStyle: 'long' });

interface Props {
  plan: Plan;
  onPick: (p: Plan) => void;
  onClose: () => void;
  onPaid?: () => void;
}

/** หน้าต่างจ่ายเงินแพ็กเกจ: QR พร้อมเพย์ระบุยอด แล้วส่งสลิปให้ระบบตรวจอัตโนมัติ (ต้องเข้าสู่ระบบก่อน) */
export function CheckoutModal({ plan, onPick, onClose, onPaid }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>(user ? 'loading' : 'login');
  const [order, setOrder] = useState<Order | null>(null);
  const [fatal, setFatal] = useState('');
  const [err, setErr] = useState('');
  const [left, setLeft] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [until, setUntil] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const createOrder = useCallback(async () => {
    if (!user) return setStep('login');
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
        return setStep('error');
      }
      setOrder(j);
      setStep('pay');
    } catch {
      setFatal('เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่');
      setStep('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id, user?.id]); // ผูกกับ id เท่านั้น: ออบเจกต์ user เปลี่ยนทุกครั้งที่ต่ออายุโทเคน (จะสร้าง QR ใหม่กลางการจ่าย)

  useEffect(() => {
    createOrder();
  }, [createOrder]);

  useEffect(() => {
    if (!order) return;
    const tick = () => setLeft(new Date(order.expiresAt).getTime() - Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [order]);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && step !== 'verifying' && onClose();
    document.addEventListener('keydown', k);
    const o = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', k);
      document.body.style.overflow = o;
    };
  }, [onClose, step]);

  const pickFile = (f: File | null) => {
    setErr('');
    if (!f) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) return setErr('รองรับเฉพาะรูป JPG PNG WEBP');
    if (f.size > 4 * 1024 * 1024) return setErr('รูปใหญ่เกิน 4MB');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!order) return;
    setErr('');
    if (!file) return setErr('แนบรูปสลิปก่อน');
    setStep('verifying');
    const fd = new FormData();
    fd.append('orderId', order.orderId);
    fd.append('slip', file);
    fd.append('cf', (await getTurnstileToken('verify')) || '');
    try {
      const res = await fetch('/api/membership/verify', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setErr(j.error || 'ตรวจสลิปไม่สำเร็จ ลองใหม่อีกครั้ง');
        return setStep('pay');
      }
      await refreshProfile();
      setUntil(j.premiumUntil);
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
    a.download = `learn5g-${plan.id}-${order.amount}.png`;
    a.click();
  };

  const expired = !!order && left <= 0;
  // คาดการณ์วันหมดอายุหลังจ่าย (เซิร์ฟเวอร์คิดจริงอีกครั้ง)
  const preview2 = profile ? nextTerm({ plan: profile.plan, until: profile.premium_until }, plan.id) : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`สมัครแพ็กเกจ ${plan.name}`}>
      <div className="absolute inset-0" onClick={() => step !== 'verifying' && onClose()} />
      <div className="relative max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border bg-background sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-5 py-4 sm:px-7">
          <div>
            <p className="ui-kicker">แพ็กเกจ</p>
            <p className="font-display text-xl font-medium">
              {plan.name} <span className="ui-muted text-base font-normal">{plan.price} บาท / {PLAN_DAYS} วัน</span>
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={step === 'verifying'} aria-label="ปิด" className="ui-btn ui-btn-ghost h-9 w-9 px-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-7">
          {step !== 'done' && step !== 'verifying' && (
            <div role="radiogroup" aria-label="เลือกแพ็กเกจ" className="mb-6 grid grid-cols-3 gap-1 rounded-full border p-1">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={p.id === plan.id}
                  onClick={() => p.id !== plan.id && onPick(p)}
                  className={cn('h-9 rounded-full text-sm transition-colors', p.id === plan.id ? 'bg-foreground text-background' : 'ui-muted hover:text-foreground')}
                >
                  {p.name} · {p.price}
                </button>
              ))}
            </div>
          )}

          {step === 'login' && (
            <div className="py-10 text-center">
              <p className="font-display text-2xl font-light">เข้าสู่ระบบก่อนสมัครแพ็กเกจ</p>
              <p className="mt-2 text-sm ui-muted">สิทธิ์ของแพ็กเกจผูกกับบัญชีของคุณ ยังไม่มีบัญชี สมัครฟรีได้ในไม่กี่วินาที</p>
              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                <Link href={`/signup?redirect=${encodeURIComponent('/pricing')}`} onClick={onClose} className="ui-btn ui-btn-ink">
                  สมัครบัญชีฟรี
                </Link>
                <Link href={`/login?redirect=${encodeURIComponent('/pricing')}`} onClick={onClose} className="ui-btn ui-btn-line">
                  เข้าสู่ระบบ
                </Link>
              </div>
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-20 text-sm ui-muted">
              <Loader2 className="h-6 w-6 animate-spin" />
              กำลังสร้าง QR พร้อมเพย์
            </div>
          )}

          {step === 'error' && (
            <div className="py-10 text-center">
              <AlertCircle className="mx-auto h-8 w-8" />
              <p className="mt-3 text-lg">{fatal}</p>
              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                <button type="button" onClick={createOrder} className="ui-btn ui-btn-ink">
                  <RefreshCw className="h-4 w-4" /> ลองใหม่
                </button>
                <a href={CONTACT_PAGE_URL} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-line">
                  ติดต่อทางเพจ
                </a>
              </div>
            </div>
          )}

          {(step === 'pay' || step === 'verifying') && order && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="ui-card p-5 text-center">
                <p className="ui-kicker">PromptPay</p>
                <div className="relative mx-auto mt-3 aspect-square w-full max-w-[250px] rounded-2xl border bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={order.qr} alt={`QR พร้อมเพย์ ยอด ${order.amount} บาท`} className={cn('h-full w-full', expired && 'opacity-10')} />
                  {expired && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-black">
                      <p className="text-sm">QR หมดอายุแล้ว</p>
                      <button type="button" onClick={createOrder} className="ui-btn h-9 bg-black text-white">
                        <RefreshCw className="h-4 w-4" /> สร้างใหม่
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-4 font-display text-4xl font-light tabular-nums">
                  {order.amount.toFixed(2)} <span className="text-base ui-muted">บาท</span>
                </p>
                <p className="mt-1 text-xs ui-muted">โอนยอดนี้ให้ตรงทุกสตางค์ · {expired ? 'QR หมดอายุ' : `ใช้ได้อีก ${fmt(left)}`}</p>
                <dl className="mt-4 space-y-1 border-t pt-4 text-left text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="ui-muted">ชื่อบัญชี</dt>
                    <dd className="text-right">{order.accountName}</dd>
                  </div>
                  {order.bankName && (
                    <div className="flex justify-between gap-3">
                      <dt className="ui-muted">ธนาคาร</dt>
                      <dd>{order.bankName}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt className="ui-muted">พร้อมเพย์</dt>
                    <dd>{order.promptpay}</dd>
                  </div>
                </dl>
                <button type="button" onClick={downloadQr} disabled={expired} className="ui-btn ui-btn-line mt-4 h-10 w-full">
                  <Download className="h-4 w-4" /> บันทึกรูป QR
                </button>
                <p className="mt-2 text-[11px] ui-muted">บนมือถือ บันทึกรูปแล้วเปิดแอปธนาคาร เลือกสแกนจากรูปภาพ</p>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <p className="ui-label">สลิปการโอน</p>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] || null)} />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      pickFile(e.dataTransfer.files?.[0] || null);
                    }}
                    className="flex min-h-[180px] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed transition-colors hover:border-foreground/50"
                  >
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt="สลิปที่เลือก" className="max-h-[240px] object-contain" />
                    ) : (
                      <span className="flex flex-col items-center gap-2 py-8 text-sm ui-muted">
                        <ImagePlus className="h-6 w-6" />
                        แตะเพื่อเลือกรูปสลิป
                        <span className="text-xs">JPG PNG WEBP ไม่เกิน 4MB</span>
                      </span>
                    )}
                  </button>
                </div>

                <div className="rounded-2xl bg-muted px-4 py-3 text-sm">
                  บัญชี <b className="font-medium">{order.forUsername}</b>
                  {preview2 && (
                    <span className="block text-xs ui-muted">
                      ใช้ได้ถึงประมาณ {thDate(preview2.until)}
                      {preview2.carriedDays > 0 && ` (รวมวันที่เหลือของแพ็กเกจเดิม ${preview2.carriedDays} วัน)`}
                    </span>
                  )}
                </div>

                {err && (
                  <p role="alert" className="flex items-start gap-2 rounded-2xl border border-red-500/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {err}
                  </p>
                )}

                <button type="button" onClick={submit} disabled={step === 'verifying'} className="ui-btn ui-btn-ink h-12 w-full">
                  {step === 'verifying' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {step === 'verifying' ? 'กำลังตรวจสลิป' : 'ตรวจสลิปและเปิดสิทธิ์'}
                </button>
                <p className="text-center text-xs ui-muted">ตรวจกับธนาคารอัตโนมัติ สลิป 1 ใบใช้ได้ครั้งเดียว</p>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="py-10 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-foreground text-background">
                <Check className="h-7 w-7" strokeWidth={2.5} />
              </span>
              <p className="mt-5 font-display text-3xl font-light">เปิดแพ็กเกจ {plan.name} แล้ว</p>
              {until && <p className="mt-2 text-sm ui-muted">ใช้ได้ถึง {thDate(until)}</p>}
              <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
                <Link href="/create" onClick={onClose} className="ui-btn ui-btn-ink">
                  เริ่มสร้างเกม
                </Link>
                <Link href="/studio" onClick={onClose} className="ui-btn ui-btn-line">
                  สร้างสื่อการสอน
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
