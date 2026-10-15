'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import fx from '@/components/ui/fancy.module.css';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-2xl border-2 border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50" />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'btn-jelly relative w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-colors',
        isDark
          ? 'bg-gradient-to-br from-amber-300 to-orange-400 border-white/40 shadow-[0_3px_0_0_rgba(194,65,12,0.45)]'
          : 'bg-gradient-to-br from-indigo-500 to-violet-600 border-white/40 shadow-[0_3px_0_0_rgba(76,29,149,0.45)]'
      )}
      aria-label={isDark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
      title={isDark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
    >
      {isDark ? (
        <Sun className={cn('w-5 h-5 text-white', fx.spinSlow)} />
      ) : (
        <Moon className="w-5 h-5 text-white -rotate-12 transition-transform hover:rotate-0" />
      )}
    </button>
  );
}
