'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCompanionOptional } from '@/components/companion/CompanionProvider';
import { Buddy } from '@/components/companion/Buddy';
import { StarIcon } from '@/components/companion/Stars';
import { CountUp } from '@/components/fx/CountUp';
import { buddyStage } from '@/lib/companion';
import { hasMembership } from '@/lib/membership';
import { cn } from '@/lib/utils/cn';
import { CalendarDays, ChevronDown, ChevronRight, Crown, Gamepad2, Heart, LogOut, ShieldCheck, Sticker, Sparkles } from 'lucide-react';
import s from './userMenu.module.css';
import { JoinButton } from '@/components/membership/JoinButton';
import { useMembership } from '@/components/membership/MembershipProvider';

const DAY = 86400000;

export function UserMenu() {
  const { profile, signOut, isDev } = useAuth();
  const { fromPrice } = useMembership();
  const companion = useCompanionOptional();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const username = profile?.username || 'ผู้ใช้งาน';
  const initial = username.charAt(0).toUpperCase();
  const member = hasMembership(profile);

  // วันสมาชิกที่เหลือ
  const until = profile?.premium_until ? new Date(profile.premium_until) : null;
  const msLeft = until ? until.getTime() - Date.now() : 0;
  const daysLeft = msLeft > 0 ? Math.ceil(msLeft / DAY) : 0;
  const pct = Math.max(4, Math.min(100, (daysLeft / 30) * 100));
  const soon = !isDev && member && daysLeft <= 3;

  // สถิติจากคู่หู (ดาว/สติกเกอร์/จำนวนครั้งที่เล่น/วันที่เข้าเล่น)
  const st = companion?.state;
  const stars = st?.stars ?? 0;
  const stickers = st ? Object.keys(st.plays).length : 0;
  const plays = st ? Object.values(st.plays).reduce((a, p) => a + (p.c || 0), 0) : 0;
  const days = st?.visitDays.length ?? 0;
  const stage = buddyStage(stars);

  const roleLabel = isDev ? 'ผู้พัฒนา' : member ? 'สมาชิก' : 'ยังไม่เป็นสมาชิก';

  const stats = [
    { icon: StarIcon, label: 'ดาวสะสม', value: stars, tone: 'from-amber-400/25 to-orange-400/10 text-amber-600 dark:text-amber-300' },
    { icon: Sticker, label: 'สติกเกอร์', value: stickers, tone: 'from-pink-400/25 to-rose-400/10 text-pink-600 dark:text-pink-300' },
    { icon: Gamepad2, label: 'เล่นเกม (ครั้ง)', value: plays, tone: 'from-indigo-400/25 to-violet-400/10 text-indigo-600 dark:text-indigo-300' },
    { icon: CalendarDays, label: 'วันที่มาเล่น', value: days, tone: 'from-emerald-400/25 to-teal-400/10 text-emerald-600 dark:text-emerald-300' },
  ];

  return (
    <div className="relative" ref={menuRef}>
      {/* ปุ่มเปิดเมนู */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="group flex items-center gap-2.5 p-1 pr-2.5 sm:pr-3 rounded-full border border-indigo-200/70 dark:border-indigo-800/70 bg-white/70 dark:bg-gray-900/70 hover:bg-white dark:hover:bg-gray-800 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="เมนูผู้ใช้งาน"
      >
        <span className="relative w-9 h-9 shrink-0">
          <span className={cn(s.ring, isDev ? s.ringDev : !member && s.ringOff)} aria-hidden="true" />
          <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-sm ring-2 ring-white dark:ring-gray-900">
            {initial}
          </span>
          {(member || isDev) && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-gray-900" aria-hidden="true" />
          )}
        </span>
        <span className="text-left hidden lg:flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 max-w-[110px] truncate">{username}</span>
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-bold border',
              isDev
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                : member
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            )}
          >
            {isDev ? 'Dev' : member ? 'สมาชิก' : 'ทั่วไป'}
          </span>
        </span>
        <ChevronDown className={cn('hidden lg:block w-4 h-4 text-gray-400 transition-transform duration-300', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className={cn(
            s.panel,
            'absolute right-0 mt-2.5 w-[330px] max-w-[calc(100vw-24px)] rounded-[1.6rem] overflow-hidden z-50 bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900/70 shadow-[0_24px_60px_-12px_rgba(60,30,140,0.45)]'
          )}
        >
          {/* หัวการ์ด */}
          <div className={cn('relative px-4 pt-4 pb-5 text-white bg-gradient-to-br', isDev ? 'from-amber-500 via-orange-500 to-rose-500' : 'from-indigo-600 via-violet-600 to-pink-500')}>
            <div className={cn(s.dots, 'absolute inset-0 opacity-60')} aria-hidden="true" />
            <div className={cn(s.row, 'relative flex items-center gap-3')}>
              <span className="relative w-14 h-14 shrink-0">
                <span className={cn(s.ring, isDev ? s.ringDev : !member && s.ringOff)} aria-hidden="true" />
                <span className="absolute inset-0 rounded-full bg-white/95 text-indigo-700 flex items-center justify-center font-display text-2xl ring-[3px] ring-white/70">
                  {initial}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-white/75">เข้าสู่ระบบในชื่อ</p>
                <p className="font-display text-xl leading-tight truncate">{username}</p>
                <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur text-[11px] font-bold">
                  {isDev ? <ShieldCheck className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />} {roleLabel}
                </span>
              </div>
              {st && (
                <div className={cn(s.float, 'shrink-0 -mr-1 drop-shadow-lg')} aria-hidden="true">
                  <Buddy stage={stage.index} color={st.color} hat={st.hat} size={58} animate={false} />
                </div>
              )}
            </div>
          </div>

          <div className="p-3.5 space-y-3">
            {/* สถานะสมาชิก + ปุ่มต่ออายุ */}
            <div className={cn(s.row, '-mt-7 relative rounded-2xl p-3.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg')} style={{ animationDelay: '60ms' }}>
              {isDev ? (
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-8 h-8 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">สิทธิ์ผู้พัฒนา</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">เปิดได้ทุกสื่อ ไม่มีวันหมดอายุ</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{member ? 'สิทธิ์สมาชิกเหลืออีก' : 'สถานะสมาชิก'}</p>
                      {member ? (
                        <p className="font-display text-gray-900 dark:text-white leading-none mt-1">
                          <span className="text-3xl">
                            <CountUp value={daysLeft} duration={700} />
                          </span>{' '}
                          <span className="text-sm">วัน</span>
                        </p>
                      ) : (
                        <p className="font-display text-lg text-gray-900 dark:text-white mt-0.5">{until ? 'หมดอายุแล้ว' : 'ยังไม่ได้สมัคร'}</p>
                      )}
                    </div>
                    {until && (
                      <p className="text-[11px] text-right text-gray-500 dark:text-gray-400">
                        {member ? 'ถึง' : 'เมื่อ'} {until.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </p>
                    )}
                  </div>
                  {member && (
                    <div className="mt-2.5 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div
                        className={cn(s.bar, 'h-full rounded-full bg-gradient-to-r', soon ? 'from-rose-500 to-orange-400' : 'from-emerald-400 to-teal-400')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                  {soon && <p className="mt-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 animate-pulse">ใกล้หมดอายุแล้ว ต่ออายุไว้ก่อนได้ วันจะต่อจากของเดิม</p>}
                  <JoinButton
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      s.shine,
                      'btn-jelly mt-3 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-display text-[15px] text-indigo-950 bg-gradient-to-r from-sun-400 via-amber-400 to-orange-400 shadow-[0_4px_0_0_rgba(194,65,12,0.45)] ring-1 ring-white/50'
                    )}
                  >
                    <Crown className="w-4 h-4" />
                    {member ? 'ต่ออายุสมาชิก' : `สมัครสมาชิก เริ่ม ${fromPrice} บาท`}
                  </JoinButton>
                </>
              )}
            </div>

            {/* สถิติ */}
            <div className="grid grid-cols-2 gap-2">
              {stats.map((x, i) => (
                <div
                  key={x.label}
                  className={cn(s.row, 'rounded-2xl p-2.5 bg-gradient-to-br border border-gray-100 dark:border-gray-800', x.tone)}
                  style={{ animationDelay: `${120 + i * 50}ms` }}
                >
                  <div className="flex items-center gap-1.5">
                    <x.icon className="w-4 h-4" />
                    <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">{x.label}</span>
                  </div>
                  <p className="mt-0.5 font-display text-xl text-gray-900 dark:text-white">
                    <CountUp value={x.value} duration={800} />
                  </p>
                </div>
              ))}
            </div>
            {st && (
              <p className={cn(s.row, 'text-[11px] text-center text-gray-500 dark:text-gray-400')} style={{ animationDelay: '320ms' }}>
                คู่หูอยู่ขั้น <b className="text-gray-700 dark:text-gray-200">{stage.name}</b>
                {stage.next !== null ? ` · อีก ${stage.next - stars} ดาวจะโตขึ้น` : ' · โตเต็มที่แล้ว'}
              </p>
            )}

            {/* ลิงก์ */}
            <div className={cn(s.row, 'pt-1 border-t border-gray-100 dark:border-gray-800 space-y-0.5')} style={{ animationDelay: '360ms' }}>
              <Link
                href="/buddy"
                onClick={() => setIsOpen(false)}
                className="group/item flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
              >
                <Heart className="w-4 h-4 text-pink-500" />
                <span className="flex-1">คู่หูและสมุดสติกเกอร์</span>
                <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-hover/item:translate-x-0.5" />
              </Link>
              {isDev && (
                <Link
                  href="/dev"
                  onClick={() => setIsOpen(false)}
                  className="group/item flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span className="flex-1">หน้าจัดการ (Dev)</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-hover/item:translate-x-0.5" />
                </Link>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors font-semibold text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
