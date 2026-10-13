import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/navbar/ThemeToggle';

/** โครงหน้าสำหรับ สมัคร / เข้าสู่ระบบ ให้หน้าตาเหมือนกันทุกหน้า */
export function AuthShell({
  title,
  subtitle,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="min-h-screen relative flex flex-col justify-center items-center p-4 sm:p-6 overflow-hidden">
      <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-violet-500/10 dark:bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
      <svg className="absolute top-[16%] right-[12%] w-8 h-8 text-sun-400 animate-twinkle pointer-events-none" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 0c.9 6.2 2.8 8.9 12 12-9.2 3.1-11.1 5.8-12 12-.9-6.2-2.8-8.9-12-12C9.2 8.9 11.1 6.2 12 0z" fill="currentColor" />
      </svg>

      <div className="absolute top-5 left-5 sm:top-8 sm:left-8 z-10">
        <Link
          href="/home"
          className="btn-jelly inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl border-2 border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/70 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้าหลัก</span>
        </Link>
      </div>
      <div className="absolute top-5 right-5 sm:top-8 sm:right-8 z-10">
        <ThemeToggle />
      </div>

      <div className={`w-full relative z-10 py-16 ${wide ? 'max-w-xl' : 'max-w-md'}`}>
        <div className="text-center mb-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="สื่อการสอน 5G"
            className="mx-auto w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-400/80 shadow-glow mb-4 bg-white dark:bg-gray-900"
          />
          <h1 className="text-3xl sm:text-4xl font-medium text-gradient-brand">{title}</h1>
          {subtitle && <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">{subtitle}</p>}
        </div>
        <div className="bg-white/85 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-indigo-100 dark:border-indigo-900 rounded-[2rem] p-6 sm:p-8 shadow-toy-lg">
          {children}
        </div>
      </div>
    </main>
  );
}
