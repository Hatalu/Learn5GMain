'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMembership } from '@/components/membership/MembershipProvider';
import { TIER_LABEL } from '@/lib/entitlements';
import { NAV_LINKS } from './Navbar';

const DAY = 86400000;

export function UserMenu() {
  const { profile, signOut, isDev } = useAuth();
  const { tier } = useMembership();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', key);
    };
  }, []);

  const name = profile?.username || 'ผู้ใช้';
  const until = profile?.premium_until ? new Date(profile.premium_until).getTime() : 0;
  const daysLeft = until > Date.now() ? Math.ceil((until - Date.now()) / DAY) : 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="เมนูบัญชี"
        className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-85"
      >
        {name.charAt(0).toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border bg-popover p-2 shadow-toy-lg">
          <div className="px-3 pb-3 pt-2">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="mt-0.5 text-xs ui-muted">
              {isDev ? 'ผู้พัฒนา · ใช้ได้ทุกอย่าง' : tier === 'free' ? 'บัญชีฟรี' : `แพ็กเกจ ${TIER_LABEL[tier]} · เหลือ ${daysLeft} วัน`}
            </p>
            {!isDev && (
              <Link href="/pricing" onClick={() => setOpen(false)} className="ui-btn ui-btn-ink mt-3 h-9 w-full">
                {tier === 'free' ? 'ดูแพ็กเกจ' : 'ต่ออายุ / เปลี่ยนแพ็กเกจ'}
              </Link>
            )}
          </div>
          <div className="border-t py-1">
            {NAV_LINKS.filter((l) => l.href !== '/pricing').map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 text-sm hover:bg-muted">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="border-t pt-1">
            {isDev && (
              <Link href="/dev" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-muted">
                <ShieldCheck className="h-4 w-4" /> หลังบ้าน (Dev)
              </Link>
            )}
            <button type="button" onClick={() => signOut()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted">
              <LogOut className="h-4 w-4" /> ออกจากระบบ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
