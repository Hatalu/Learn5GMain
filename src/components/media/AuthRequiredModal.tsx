'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, LogIn, X, Sparkles } from 'lucide-react';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  mediaTitle?: string;
}

export function AuthRequiredModal({
  isOpen,
  onClose,
  message = 'คุณยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบด้วยบัญชีสมาชิกเพื่อเปิดเข้าใช้งานสื่อการสอนและเกมการศึกษา',
  mediaTitle,
}: AuthRequiredModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-200 dark:border-gray-800 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="ปิดหน้าต่าง"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lock Icon with Glowing Effect */}
        <div className="flex justify-center mb-4">
          <div className="relative p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-bounce" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 mb-2">
            <span>แจ้งเตือนสิทธิ์การใช้งาน</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            คุณยังไม่ได้เข้าสู่ระบบ
          </h3>
          {mediaTitle && (
            <p className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 truncate max-w-xs mx-auto">
              สื่อ: {mediaTitle}
            </p>
          )}
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <Link
            href="/login"
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm text-center shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>เข้าสู่ระบบทันที</span>
          </Link>
          <button
            onClick={onClose}
            className="py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm transition-colors"
          >
            ดูสื่ออื่นต่อ
          </button>
        </div>

        {/* Note */}
        <p className="mt-4 text-center text-[11px] text-gray-400 dark:text-gray-500">
          * หากยังไม่มีบัญชีหรือต้องการเปิดใช้งาน กรุณาติดต่อแอดมินผ่านเพจ
        </p>
      </div>
    </div>
  );
}
