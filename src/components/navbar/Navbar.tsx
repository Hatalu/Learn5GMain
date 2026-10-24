'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { SoundToggle } from './SoundToggle';
import { useCompanionOptional } from '@/components/companion/CompanionProvider';
import { UserMenu } from './UserMenu';
import { ShieldCheck, Home, LogIn, UserX, Sparkles, Lock, Crown, Wand2, Palette } from 'lucide-react';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { cn } from '@/lib/utils/cn';
import fx from '@/components/ui/fancy.module.css';
import { hasMembership } from '@/lib/membership';
import { JoinButton } from '@/components/membership/JoinButton';

export function Navbar() {
  const { user, profile, isDev } = useAuth();
  const companion = useCompanionOptional();
  const buddyLocked = !!companion && companion.ready && !companion.entitled;
  const pathname = usePathname();
  const isDevPage = pathname.startsWith('/dev');
  const showJoin = !isDev && !(user && hasMembership(profile)) && !pathname.startsWith('/membership');

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-indigo-100 dark:border-indigo-950 bg-white/95 dark:bg-gray-950/95 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand with Glowing Logo */}
        <Link
          href="/home"
          className="flex items-center gap-3.5 group focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl"
        >
          {/* Logo with luminous glowing edge */}
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 ring-2 ring-indigo-400 dark:ring-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.7)] dark:shadow-[0_0_20px_rgba(129,140,248,0.85)] group-hover:shadow-[0_0_25px_rgba(99,102,241,0.95)] transition-all duration-300 transform group-hover:scale-105 bg-white dark:bg-gray-900">
            <Image
              src="/logo.png"
              alt="สื่อการสอน 5G Logo"
              fill
              sizes="48px"
              priority
              className="object-cover"
            />
          </div>
          <div className="hidden min-[470px]:block">
            <div className="flex items-center gap-2">
              <span className="font-display font-medium whitespace-nowrap text-lg sm:text-xl text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                สื่อการสอน 5G
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              ศูนย์รวมสื่อการสอนและเกมการศึกษา
            </p>
          </div>
        </Link>

        {/* ปุ่มกลับหน้าหลัก: เห็นชัดบนมือถือ (หน้า Dev มีปุ่มของตัวเองอยู่แล้ว) */}
        {!isDevPage && !pathname.startsWith('/home') && (
          <Link
            href="/home"
            className={cn(fx.shine, 'btn-jelly sm:hidden shrink-0 inline-flex items-center gap-1.5 pl-1.5 pr-1.5 min-[440px]:pr-2.5 py-1.5 rounded-2xl text-white text-sm font-bold bg-gradient-to-r from-sky-500 to-indigo-600 border-2 border-white/40 dark:border-white/15 shadow-[0_3px_0_0_rgba(49,46,129,0.5)] whitespace-nowrap')}
            aria-label="กลับหน้าหลัก"
          >
            <span className="w-7 h-7 rounded-xl bg-white/95 text-indigo-600 flex items-center justify-center">
              <Home className="w-4 h-4" />
            </span>
            {/* จอแคบ: เหลือแค่ไอคอน กันแถบเมนูล้นจอ (ผู้ใช้ที่ล็อกอินมีปุ่มเยอะ) */}
            <span className="max-[439px]:hidden">หน้าหลัก</span>
          </Link>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1 min-[400px]:gap-1.5 sm:gap-2 lg:gap-3">
          {showJoin && (
            <JoinButton
              data-tour="nav-join"
              className="btn-jelly inline-flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-sun-400 to-orange-400 text-indigo-950 text-xs sm:text-sm font-bold shadow-md ring-2 ring-white/70 dark:ring-gray-900"
              title="สมัครสมาชิก"
            >
              <Crown className="w-4 h-4" />
              {/* 640-767px ปุ่มอื่นโผล่ครบ ซ่อนข้อความกันแถบล้น */}
              <span className="hidden min-[400px]:inline sm:hidden md:inline">สมัครสมาชิก</span>
            </JoinButton>
          )}

          {/* ปุ่มกลับหน้าหลัก (จอใหญ่/ไอแพด): อยู่ซ้ายปุ่มเพจ */}
          {!isDevPage && !pathname.startsWith('/home') && (
            <Link
              href="/home"
              className={cn(fx.shine, 'btn-jelly hidden sm:inline-flex items-center gap-2 pl-1.5 pr-1.5 xl:pr-3.5 py-1.5 rounded-2xl text-white text-sm font-bold bg-gradient-to-r from-sky-500 to-indigo-600 border-2 border-white/40 dark:border-white/15 shadow-[0_3px_0_0_rgba(49,46,129,0.5)] whitespace-nowrap')}
              aria-label="กลับหน้าหลัก"
              title="กลับหน้าหลัก"
            >
              <span className="w-7 h-7 rounded-xl bg-white/95 text-indigo-600 flex items-center justify-center">
                <Home className="w-4 h-4" />
              </span>
              <span className="hidden xl:inline">หน้าหลัก</span>
            </Link>
          )}

          {/* Facebook Page Contact Button */}
          <a
            href="https://www.facebook.com/profile.php?id=61594556657667"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(fx.shine, 'btn-jelly hidden sm:inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 whitespace-nowrap rounded-2xl bg-gradient-to-r from-[#1877f2] to-[#4f6bff] text-white border-2 border-white/40 dark:border-white/15 shadow-[0_3px_0_0_rgba(24,119,242,0.45)] group')}
            title="ติดต่อเพจ Facebook สื่อการสอน 5G"
          >
            <span className="w-7 h-7 rounded-xl bg-white flex items-center justify-center shrink-0 group-hover:rotate-[-8deg] transition-transform">
              <FacebookIcon className="w-4 h-4 text-[#1877f2]" />
            </span>
            <span className="hidden xl:inline text-sm font-bold [text-shadow:0_1px_1px_rgba(0,0,0,0.25)]">เพจ Facebook</span>
          </a>

          {/* Dev Button - ONLY rendered if user has dev role! */}
          {user && isDev && (
            isDevPage ? (
              <Link
                href="/home"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition-all shadow-sm"
              >
                <Home className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">กลับหน้าหลัก</span>
                <span className="sm:hidden">หน้าหลัก</span>
              </Link>
            ) : (
              <Link
                href="/dev"
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl text-amber-900 dark:text-amber-100 bg-gradient-to-r from-amber-400/20 to-orange-400/20 hover:from-amber-400/30 hover:to-orange-400/30 border border-amber-300 dark:border-amber-700/60 transition-all shadow-sm group"
              >
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:rotate-6 transition-transform" />
                <span>Dev</span>
                <span className="hidden md:inline font-normal text-amber-700 dark:text-amber-300">แดชบอร์ด</span>
              </Link>
            )
          )}

          {/* ระบบสร้างเกม (สมาชิกสร้างเกมจาก Template / ทุกคนเข้าเล่นด้วยเลขห้อง) */}
          {!isDevPage && !pathname.startsWith('/create') && (
            <Link
              href="/create"
              data-tour="nav-create"
              className={cn(fx.shine, user ? 'inline-flex' : 'hidden sm:inline-flex', 'btn-jelly items-center gap-2 pl-1.5 pr-1.5 xl:pr-3 py-1.5 text-sm font-bold rounded-2xl text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 border-2 border-white/40 dark:border-white/15 shadow-[0_3px_0_0_rgba(13,148,136,0.5)] whitespace-nowrap')}
              title="ระบบสร้างเกม"
              aria-label="ระบบสร้างเกม"
            >
              <span className="w-7 h-7 rounded-xl bg-white/95 flex items-center justify-center shrink-0 text-teal-600">
                <Wand2 className="w-4 h-4" />
              </span>
              <span className="hidden xl:inline [text-shadow:0_1px_1px_rgba(0,0,0,0.25)]">สร้างเกม</span>
            </Link>
          )}

          {/* ระบบสร้างสื่อการสอน (ใบงาน ใบความรู้ ป้าย โหลดเป็นรูป/PDF) จอเล็กกว่า 440px ที่มีปุ่มสมัครสมาชิกด้วยจะล้น: ซ่อน ใช้เมนูผู้ใช้แทน */}
          {!isDevPage && !pathname.startsWith('/studio') && (
            <Link
              href="/studio"
              data-tour="nav-studio"
              className={cn(fx.shine, !user ? 'hidden sm:inline-flex' : showJoin ? 'max-[439px]:hidden inline-flex' : 'inline-flex', 'btn-jelly items-center gap-2 pl-1.5 pr-1.5 xl:pr-3 py-1.5 text-sm font-bold rounded-2xl text-white bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 border-2 border-white/40 dark:border-white/15 shadow-[0_3px_0_0_rgba(190,24,93,0.5)] whitespace-nowrap')}
              title="ระบบสร้างสื่อการสอน"
              aria-label="ระบบสร้างสื่อการสอน"
            >
              <span className="w-7 h-7 rounded-xl bg-white/95 flex items-center justify-center shrink-0 text-pink-600">
                <Palette className="w-4 h-4" />
              </span>
              <span className="hidden xl:inline [text-shadow:0_1px_1px_rgba(0,0,0,0.25)]">สร้างสื่อ</span>
            </Link>
          )}

          {/* คู่หู + สมุดสะสม */}
          {!isDevPage && !pathname.startsWith('/buddy') && (
            <Link
              href="/buddy"
              className={cn(fx.shine, 'btn-jelly inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 text-sm font-bold rounded-2xl text-white bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 border-2 border-white/40 dark:border-white/15 shadow-[0_3px_0_0_rgba(126,34,206,0.5)] whitespace-nowrap')}
              title="ห้องของคู่หูและสมุดสะสมสติกเกอร์"
            >
              <span className="w-7 h-7 rounded-xl bg-white/95 flex items-center justify-center shrink-0 text-fuchsia-600">
                {buddyLocked ? <Lock className="w-4 h-4" /> : <Sparkles className={cn('w-4 h-4', fx.twinkle)} />}
              </span>
              <span className="hidden xl:inline [text-shadow:0_1px_1px_rgba(0,0,0,0.25)]">คู่หูของฉัน</span>
            </Link>
          )}

          {/* Sound + Theme Toggle */}
          <SoundToggle />
          <ThemeToggle />

          {/* User Menu or Unauthenticated Status */}
          {user ? (
            <UserMenu />
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden 2xl:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-xs font-medium bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                <UserX className="w-3.5 h-3.5 text-gray-400" />
                <span>ยังไม่ได้เข้าสู่ระบบ</span>
              </span>
              <Link
                href="/signup"
                className="btn-jelly hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold rounded-2xl whitespace-nowrap bg-white dark:bg-gray-800 border-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-200"
              >
                <span>สมัครบัญชีฟรี</span>
              </Link>
              <Link
                href="/login"
                className="btn-primary-grad inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-sm font-bold rounded-2xl whitespace-nowrap"
              >
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบ</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
