'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CONTACT_PAGE_URL } from '@/lib/membership';
import { NO_OFFER, Offer, PLANS, Plan, PlanId, planById } from '@/lib/plans';
import { CheckoutModal } from './CheckoutModal';

interface Ctx {
  /** null = กำลังโหลด */
  ready: boolean | null;
  plans: Plan[];
  /** ราคาแพลนถูกสุดที่ซื้อได้ตอนนี้ (ข้อความ "เริ่ม X บาท") */
  fromPrice: number;
  offer: Offer;
  /** เวลาเซิร์ฟเวอร์ลบเวลาเครื่อง (ms) ใช้ให้นาฬิกานับถอยหลังตรงกับเซิร์ฟเวอร์ */
  skew: number;
  /** เปิดหน้าต่างจ่ายเงินได้จากทุกหน้า (ไม่ระบุแพลน = ให้เลือกในหน้าต่าง) */
  openCheckout: (plan?: PlanId) => void;
  refresh: () => void;
}

const MembershipCtx = createContext<Ctx | null>(null);

export function useMembership(): Ctx {
  const c = useContext(MembershipCtx);
  if (!c) throw new Error('useMembership ต้องอยู่ใน MembershipProvider');
  return c;
}

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [ready, setReady] = useState<boolean | null>(null);
  const [dayPlan, setDayPlan] = useState(false);
  const [offer, setOffer] = useState<Offer>(NO_OFFER);
  const [skew, setSkew] = useState(0);
  const [open, setOpen] = useState<{ plan: Plan | null } | null>(null);

  const refresh = useCallback(() => {
    fetch('/api/membership/config', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        setReady(!!j.ready);
        setDayPlan(!!j.dayPlan);
        setOffer(j.offer || NO_OFFER);
        const t = new Date(j.now).getTime();
        if (!isNaN(t)) setSkew(t - Date.now());
      })
      .catch(() => setReady(false));
  }, []);

  // โหลดใหม่ทุกครั้งที่สถานะล็อกอินเปลี่ยน (ข้อเสนอผูกกับบัญชี)
  useEffect(() => {
    if (!isLoading) refresh();
  }, [isLoading, user?.id, refresh]);

  const plans = useMemo(() => (dayPlan ? PLANS : PLANS.filter((p) => p.id !== 'day')), [dayPlan]);

  const openCheckout = useCallback(
    (id?: PlanId) => {
      if (ready === false) {
        window.open(CONTACT_PAGE_URL, '_blank', 'noopener');
        return;
      }
      const p = id ? planById(id) : undefined;
      setOpen({ plan: p && plans.includes(p) ? p : null });
    },
    [ready, plans]
  );

  const fromPrice = useMemo(() => Math.min(...plans.map((p) => p.price)), [plans]);
  const value = useMemo(() => ({ ready, plans, fromPrice, offer, skew, openCheckout, refresh }), [ready, plans, fromPrice, offer, skew, openCheckout, refresh]);

  return (
    <MembershipCtx.Provider value={value}>
      {children}
      {open && (
        <CheckoutModal
          plan={open.plan}
          plans={plans}
          offer={offer}
          skew={skew}
          onPick={(p) => setOpen({ plan: p })}
          onClose={() => setOpen(null)}
          onPaid={refresh}
        />
      )}
    </MembershipCtx.Provider>
  );
}
