'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogOut, User as UserIcon, Shield, Sparkles } from 'lucide-react';

export function UserMenu() {
  const { profile, signOut, isDev } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const username = profile?.username || 'ผู้ใช้งาน';
  const initial = username.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-expanded={isOpen}
        aria-label="เมนูผู้ใช้งาน"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
          {initial}
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
            <span>{username}</span>
            {isDev ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                Dev
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Member
              </span>
            )}
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl py-2 z-50 animate-scale-up">
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">เข้าสู่ระบบในชื่อ</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {username}
            </p>
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              {isDev ? (
                <>
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400 font-medium">ผู้พัฒนา (Dev)</span>
                </>
              ) : (
                <>
                  <UserIcon className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">สมาชิก (Member)</span>
                </>
              )}
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between">
              <span>วันหมดอายุ Premium:</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {profile?.premium_until
                  ? new Date(profile.premium_until).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '-'}
              </span>
            </div>
          </div>

          <div className="px-1.5 py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors font-medium text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
