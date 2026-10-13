'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { SoundToggle } from './SoundToggle';
import { UserMenu } from './UserMenu';
import { ShieldCheck, Home, LogIn, UserX, Sparkles } from 'lucide-react';
import { FacebookIcon } from '@/components/icons/FacebookIcon';

export function Navbar() {
  const { user, isDev } = useAuth();
  const pathname = usePathname();
  const isDevPage = pathname.startsWith('/dev');

  return (
    <header className="sticky top-0 z-40 w-full border-b-2 border-indigo-100 dark:border-indigo-950 bg-white/80 dark:bg-gray-950/75 backdrop-blur-xl transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
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

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Facebook Page Contact Button */}
          <a
            href="https://www.facebook.com/profile.php?id=61594556657667"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all shadow-sm group"
            title="ติดต่อเพจ Facebook สื่อการสอน 5G"
          >
            <FacebookIcon className="w-4 h-4 group-hover:scale-110 transition-transform text-blue-600 dark:text-blue-400" />
            <span className="hidden md:inline text-xs font-semibold">เพจ Facebook</span>
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

          {/* คู่หู + สมุดสะสม */}
          {!isDevPage && (
            <Link
              href="/buddy"
              className="btn-jelly inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-sm font-bold rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-200 border-2 border-indigo-200 dark:border-indigo-800 whitespace-nowrap"
              title="ห้องของคู่หูและสมุดสะสมสติกเกอร์"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden md:inline">คู่หูของฉัน</span>
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
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-xs font-medium bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                <UserX className="w-3.5 h-3.5 text-gray-400" />
                <span>ยังไม่ได้เข้าสู่ระบบ</span>
              </span>
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
