'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarPlus, Gift, Timer } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { hasMembership } from '@/lib/membership';
import { Offer, Plan, RENEW_BONUS_DAYS, WELCOME_HOURS, WELCOME_PCT, comparePrice, planLength, quote, saveBaht } from '@/lib/plans';
import { useMembership } from './MembershipProvider';

/** เวลาที่เหลือถึง endsAt (ms) อัปเดตทุกวินาที */
export function useCountdown(endsAt: string | null, skew = 0): number {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!endsAt) return setLeft(0);
    const end = new Date(endsAt).getTime();
    const tick = () => setLeft(Math.max(0, end - (Date.now() + skew)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt, skew]);
  return left;
}

/** 23:59:08 หรือ 3 วัน 04:10:00 */
export function fmtLeft(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(t / 86400);
  const hms = [Math.floor((t % 86400) / 3600), Math.floor((t % 3600) / 60), t % 60].map((n) => String(n).padStart(2, '0')).join(':');
  return d > 0 ? `${d} วัน ${hms}` : hms;
}

/**
 * ป้ายราคา: ราคาเทียบ (ซื้อรายวันต่อกัน ซึ่งเป็นราคาที่ขายจริง) ขีดฆ่า + ราคาจริง + ประหยัดกี่บาท
 * ถ้ามีส่วนลดบัญชีใหม่: ขีดฆ่าราคาปกติ แสดงราคาหลังลด
 */
export function PriceBlock({ plan, offer, compact = false }: { plan: Plan; offer: Offer; compact?: boolean }) {
  const { plans } = useMembership();
  const q = quote(plan, offer);
  // เทียบกับราคารายวันได้เฉพาะตอนที่แพลนรายวันเปิดขายจริง
  const cmp = plans.some((p) => p.id === 'day') ? comparePrice(plan) : null;
  // ยอดประหยัดต้องเทียบกับราคาที่ขีดฆ่าให้เห็นเท่านั้น
  const save = q.welcome ? plan.price - q.amount : cmp ? saveBaht(plan) : 0;
  const big = compact ? 'text-4xl' : 'text-6xl';
  return (
    <div className="flex flex-col items-center">
      {(q.welcome || cmp) && (
        <p className={`${compact ? 'text-xs' : 'text-sm'} font-bold opacity-80`}>
          {q.welcome ? 'ราคาปกติ ' : `ถ้าซื้อรายวัน ${plan.days} วัน `}
          <s className="decoration-[#e0344a] decoration-2">{q.welcome ? plan.price : cmp} บาท</s>
        </p>
      )}
      <div className="flex items-end justify-center gap-1.5">
        <span className={`font-display ${big} leading-none`} style={{ color: q.welcome ? '#e0344a' : '#2a2350' }}>
          {q.amount}
        </span>
        <span className="mb-1 font-bold whitespace-nowrap">บาท / {planLength(plan)}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5 text-xs sm:text-sm font-bold">
        {save > 0 && <span className="px-2.5 py-0.5 rounded-full border-2 border-[#2a2350] bg-[#ff6b7a] text-white">ประหยัด {save} บาท</span>}
        {q.welcome && <span className="px-2.5 py-0.5 rounded-full border-2 border-[#2a2350] bg-[#ffcf3f] text-[#2a2350]">ลด {WELCOME_PCT}% บัญชีใหม่</span>}
        {q.bonusDays > 0 && <span className="px-2.5 py-0.5 rounded-full border-2 border-[#2a2350] bg-[#3fd6a8] text-[#2a2350]">+{q.bonusDays} วันฟรี</span>}
      </div>
    </div>
  );
}

const bannerCls =
  'relative flex flex-col sm:flex-row items-center gap-3 sm:gap-4 rounded-2xl border-[3px] border-[#2a2350] shadow-[0_5px_0_#2a2350] px-4 py-3 text-[#2a2350] overflow-hidden';
const btnCls =
  'shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-[3px] border-[#2a2350] bg-white font-display shadow-[0_3px_0_#2a2350] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-transform';

/**
 * แถบข้อเสนอ: ส่วนลดบัญชีใหม่ (นับถอยหลัง) / โบนัสต่ออายุ / ชวนผู้เยี่ยมชมสมัครบัญชีฟรีเพื่อรับส่วนลด
 * ไม่มีข้อเสนออะไร = ไม่แสดง
 */
export function OfferBanner({ className = '', guestHook = true }: { className?: string; guestHook?: boolean }) {
  const { user, profile, isLoading } = useAuth();
  const { ready, offer, skew, openCheckout } = useMembership();
  const welcomeLeft = useCountdown(offer.welcomeEndsAt, skew);
  const renewLeft = useCountdown(offer.renewEndsAt, skew);

  if (isLoading || ready === null) return null;

  if (welcomeLeft > 0) {
    return (
      <div className={`${bannerCls} ${className}`} style={{ background: 'linear-gradient(100deg,#ffd75e,#ff9ad5)' }} role="region" aria-label="ส่วนลดบัญชีใหม่">
        <span className="w-11 h-11 shrink-0 rounded-full border-[3px] border-[#2a2350] bg-white flex items-center justify-center">
          <Gift className="w-6 h-6" />
        </span>
        <div className="flex-1 text-center sm:text-left">
          <p className="font-display text-lg leading-tight">ส่วนลด {WELCOME_PCT}% สำหรับบัญชีใหม่ ทุกแพลน</p>
          <p className="text-sm font-bold">ใช้ได้ครั้งแรกครั้งเดียว ภายใน {WELCOME_HOURS} ชั่วโมงหลังสมัครบัญชี</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[3px] border-[#2a2350] bg-[#2a2350] text-white font-display tabular-nums" aria-live="off">
          <Timer className="w-4 h-4" /> {fmtLeft(welcomeLeft)}
        </span>
        <button type="button" onClick={() => openCheckout()} className={btnCls}>
          ใช้ส่วนลดเลย
        </button>
      </div>
    );
  }

  if (renewLeft > 0) {
    const active = hasMembership(profile);
    const until = profile?.premium_until ? new Date(profile.premium_until).getTime() : 0;
    const daysLeft = Math.max(0, Math.ceil((until - Date.now() - skew) / 86400000));
    return (
      <div className={`${bannerCls} ${className}`} style={{ background: 'linear-gradient(100deg,#a8f0d4,#bfe8ff)' }} role="region" aria-label="โบนัสต่ออายุ">
        <span className="w-11 h-11 shrink-0 rounded-full border-[3px] border-[#2a2350] bg-white flex items-center justify-center">
          <CalendarPlus className="w-6 h-6" />
        </span>
        <div className="flex-1 text-center sm:text-left">
          <p className="font-display text-lg leading-tight">
            {active ? `สมาชิกเหลืออีก ${daysLeft} วัน` : 'สมาชิกหมดอายุแล้ว'} ต่ออายุตอนนี้ รับเพิ่ม {RENEW_BONUS_DAYS} วันฟรี
          </p>
          <p className="text-sm font-bold">แพลนตั้งแต่ 7 วันขึ้นไป วันใหม่ต่อจากวันหมดอายุเดิม หมดเขตใน {fmtLeft(renewLeft)}</p>
        </div>
        <button type="button" onClick={() => openCheckout()} className={btnCls}>
          ต่ออายุรับโบนัส
        </button>
      </div>
    );
  }

  if (!user && guestHook && ready) {
    return (
      <div className={`${bannerCls} ${className}`} style={{ background: 'linear-gradient(100deg,#fff3c4,#ffe3f1)' }} role="region" aria-label="สมัครบัญชีฟรี">
        <span className="w-11 h-11 shrink-0 rounded-full border-[3px] border-[#2a2350] bg-white flex items-center justify-center">
          <Gift className="w-6 h-6" />
        </span>
        <div className="flex-1 text-center sm:text-left">
          <p className="font-display text-lg leading-tight">สมัครบัญชีฟรีวันนี้ รับส่วนลดสมาชิก {WELCOME_PCT}%</p>
          <p className="text-sm font-bold">ใช้ได้ภายใน {WELCOME_HOURS} ชั่วโมงแรกหลังสมัคร ทุกแพลน</p>
        </div>
        <Link href="/signup" className={btnCls}>
          สมัครบัญชีฟรี
        </Link>
      </div>
    );
  }

  return null;
}
