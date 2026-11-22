'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils/cn';
import { ThemeToggle } from './ThemeToggle';
import { SoundToggle } from './SoundToggle';
import { UserMenu } from './UserMenu';
import { Logo } from './Logo';

/** เมนูหลักของเว็บ (เหลือแค่ระบบสำหรับครู) */
export const NAV_LINKS = [
  { href: '/create', label: 'สร้างเกม' },
  { href: '/studio', label: 'สร้างสื่อการสอน' },
  { href: '/ai-game', label: 'คลังเกม' },
  { href: '/innovation', label: 'สั่งทำนวัตกรรม' },
  { href: '/pricing', label: 'แพ็กเกจ' },
];

const active = (path: string, href: string) => path === href || path.startsWith(href + '/');

export function Navbar() {
  const { user, isLoading } = useAuth();
  const path = usePathname() || '/';
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [open]);

  return (
    <header className="site-nav sticky top-0 z-40 w-full border-b bg-background/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        <nav aria-label="เมนูหลัก" className="ml-4 hidden flex-1 items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active(path, l.href) ? 'page' : undefined}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm transition-colors',
                active(path, l.href) ? 'bg-muted text-foreground font-medium' : 'ui-muted hover:text-foreground'
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <SoundToggle />
          {isLoading ? (
            <span className="h-9 w-9 rounded-full bg-muted" />
          ) : user ? (
            <UserMenu />
          ) : (
            <>
              <Link href={`/login?redirect=${encodeURIComponent(path)}`} className="ui-btn ui-btn-ghost hidden h-9 px-4 sm:inline-flex">
                เข้าสู่ระบบ
              </Link>
              <Link href="/signup" className="ui-btn ui-btn-ink h-9 px-4">
                สมัครฟรี
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
            className="ui-btn ui-btn-ghost h-9 w-9 px-0 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav aria-label="เมนูหลัก" className="border-t bg-background px-4 pb-5 pt-2 lg:hidden">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn('flex items-center justify-between border-b py-3.5 text-base', active(path, l.href) ? 'font-medium' : 'ui-muted')}
            >
              {l.label}
            </Link>
          ))}
          {!user && !isLoading && (
            <Link href="/login" className="ui-btn ui-btn-line mt-4 w-full">
              เข้าสู่ระบบ
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
