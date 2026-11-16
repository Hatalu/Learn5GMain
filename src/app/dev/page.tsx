'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/navbar/Navbar';
import { MemberManagement } from '@/components/dev/MemberManagement';
import { PaymentsAdmin } from '@/components/dev/PaymentsAdmin';
import { VisitStats } from '@/components/dev/VisitStats';
import { EntitlementsAdmin } from '@/components/dev/EntitlementsAdmin';
import { InnovationAdmin } from '@/components/dev/InnovationAdmin';
import { TIER_LABEL, type Tier } from '@/lib/entitlements';
import { cn } from '@/lib/utils/cn';

type Tab = 'members' | 'plans' | 'innovation' | 'payments' | 'visits';
const TABS: { id: Tab; label: string }[] = [
  { id: 'members', label: 'สมาชิก' },
  { id: 'plans', label: 'แพ็กเกจและสิทธิ์' },
  { id: 'innovation', label: 'นวัตกรรม' },
  { id: 'payments', label: 'การชำระเงิน' },
  { id: 'visits', label: 'สถิติเข้าเว็บ' },
];

interface Stats {
  accounts: number;
  byTier: Record<Tier, number>;
  games: number;
  designs: number;
  innovationOpen: number | null;
}

export default function DevPage() {
  const { isDev, isLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('members');
  const [stats, setStats] = useState<Stats | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab') as Tab | null;
    if (t && TABS.some((x) => x.id === t)) setTab(t);
  }, []);
  useEffect(() => {
    if (!isLoading && !isDev) router.replace('/');
  }, [isDev, isLoading, router]);
  useEffect(() => {
    if (!isDev) return;
    fetch('/api/dev/stats')
      .then((r) => r.json())
      .then((j) => {
        if (j.byTier) {
          setStats(j);
          setOpen(j.innovationOpen);
        }
      })
      .catch(() => {});
  }, [isDev]);

  if (isLoading || !isDev)
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  const cards = stats
    ? [
        { k: 'บัญชีทั้งหมด', v: stats.accounts },
        ...(['plus', 'pro', 'master'] as Tier[]).map((t) => ({ k: `แพ็กเกจ ${TIER_LABEL[t]}`, v: stats.byTier[t] })),
        { k: 'ชุดคำถาม', v: stats.games },
        { k: 'สื่อการสอน', v: stats.designs },
      ]
    : [];

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6">
        <p className="ui-kicker">Dev</p>
        <h1 className="ui-title mt-2 text-4xl">หลังบ้าน</h1>

        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border bg-border sm:grid-cols-3 lg:grid-cols-6">
          {(cards.length ? cards : Array.from({ length: 6 }, (_, i) => ({ k: String(i), v: null as number | null }))).map((c) => (
            <div key={c.k} className="bg-background p-5">
              <p className="text-xs ui-muted">{stats ? c.k : ' '}</p>
              <p className="mt-2 font-display text-3xl font-light tabular-nums">{c.v ?? '-'}</p>
            </div>
          ))}
        </div>

        <div role="tablist" className="mt-10 flex gap-1 overflow-x-auto border-b">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn('-mb-px shrink-0 border-b-2 px-4 py-3 text-sm transition-colors', tab === t.id ? 'border-foreground font-medium' : 'border-transparent ui-muted hover:text-foreground')}
            >
              {t.label}
              {t.id === 'innovation' && !!open && <span className="ml-1.5 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] text-background">{open}</span>}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === 'members' && <MemberManagement />}
          {tab === 'plans' && <EntitlementsAdmin />}
          {tab === 'innovation' && <InnovationAdmin onOpenCount={setOpen} />}
          {tab === 'payments' && <PaymentsAdmin />}
          {tab === 'visits' && <VisitStats />}
        </div>
      </main>
    </>
  );
}
