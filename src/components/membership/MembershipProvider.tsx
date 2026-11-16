'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CONTACT_PAGE_URL } from '@/lib/membership';
import { PLANS, type Plan, type PlanId, planById } from '@/lib/plans';
import { DEFAULT_ENTS, entTableFrom, tierOf, type Ent, type EntTable, type Tier } from '@/lib/entitlements';
import { CheckoutModal } from './CheckoutModal';

interface Ctx {
  /** null = กำลังโหลด */
  ready: boolean | null;
  plans: Plan[];
  ents: EntTable;
  /** แพ็กเกจและสิทธิ์ของบัญชีที่ล็อกอินอยู่ (ไม่ล็อกอิน = free) */
  tier: Tier;
  ent: Ent;
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
  const { user, profile, isLoading } = useAuth();
  const [ready, setReady] = useState<boolean | null>(null);
  const [ents, setEnts] = useState<EntTable>(DEFAULT_ENTS);
  const [open, setOpen] = useState<Plan | null>(null);

  const refresh = useCallback(() => {
    fetch('/api/membership/config', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        setReady(!!j.ready);
        if (j.ents) setEnts(entTableFrom(Object.entries(j.ents).map(([tier, v]) => ({ ...(v as object), tier }))));
      })
      .catch(() => setReady(false));
  }, []);

  useEffect(() => {
    if (!isLoading) refresh();
  }, [isLoading, user?.id, refresh]);

  const openCheckout = useCallback(
    (id?: PlanId) => {
      if (ready === false) {
        window.open(CONTACT_PAGE_URL, '_blank', 'noopener');
        return;
      }
      setOpen(planById(id) ?? PLANS[0]);
    },
    [ready]
  );

  const tier = user ? tierOf(profile) : 'free';
  const value = useMemo(
    () => ({ ready, plans: PLANS, ents, tier, ent: ents[tier], openCheckout, refresh }),
    [ready, ents, tier, openCheckout, refresh]
  );

  return (
    <MembershipCtx.Provider value={value}>
      {children}
      {open && <CheckoutModal plan={open} onPick={setOpen} onClose={() => setOpen(null)} onPaid={refresh} />}
    </MembershipCtx.Provider>
  );
}
