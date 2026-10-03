'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/navbar/ThemeToggle';
import { Sparkles, Lock, User, Eye, EyeOff, Loader2, BookOpen, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, user, isLoading } = useAuth();
  const router = useRouter();

  // If already logged in, redirect to /home
  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/home');
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim()) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้');
      return;
    }

    if (!password) {
      setErrorMsg('กรุณากรอกรหัสผ่าน');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signIn(username, password);
      if (!res.success) {
        setErrorMsg(res.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      } else {
        router.push('/home');
      }
    } catch {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen relative flex flex-col justify-center items-center p-4 sm:p-6 bg-gradient-to-br from-indigo-50/70 via-background to-violet-50/50 dark:from-slate-950 dark:via-background dark:to-indigo-950/40">
      {/* Background ambient decorative shapes */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-violet-500/10 dark:bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top bar controls */}
      <div className="absolute top-5 left-5 sm:top-8 sm:left-8 z-10">
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 hover:bg-white dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm backdrop-blur-md transition-all active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>ดูสื่อการสอน (หน้าหลัก)</span>
        </Link>
      </div>

      <div className="absolute top-5 right-5 sm:top-8 sm:right-8 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Header with glowing edge */}
        <div className="text-center mb-8">
          <div className="inline-block relative w-20 h-20 rounded-2xl overflow-hidden mb-4 ring-4 ring-indigo-400/80 dark:ring-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.85)] dark:shadow-[0_0_30px_rgba(129,140,248,0.95)] transform hover:scale-105 transition-all duration-300 bg-white dark:bg-gray-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="สื่อการสอน 5G Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            สื่อการสอน 5G
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            ศูนย์รวมสื่อการสอนและเกมการศึกษา ประถมศึกษา
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/5 dark:shadow-black/40">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              เข้าสู่ระบบสมาชิก
            </h2>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl text-sm bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/80 text-rose-700 dark:text-rose-300 animate-fade-in flex items-start gap-2.5"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5"
              >
                ชื่อผู้ใช้
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="กรอกชื่อผู้ใช้ของคุณ"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/80 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5"
              >
                รหัสผ่าน
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่าน"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/80 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm shadow-md shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังเข้าสู่ระบบ...</span>
                  </>
                ) : (
                  <span>เข้าสู่ระบบ</span>
                )}
              </button>
            </div>
          </form>

          {/* Footer note: Specification #3 requirement */}
          <div className="mt-6 pt-5 border-t border-gray-200/80 dark:border-gray-800 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ลืมรหัสผ่าน? กรุณาติดต่อแอดมินผ่านเพจ
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
