'use client';

import React, { useEffect } from 'react';
import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/** แป้นกดตัวเลขขนาดใหญ่สำหรับเด็ก (รองรับคีย์บอร์ดด้วย) */
export function PinPad({
  value,
  onChange,
  length = 4,
  disabled = false,
  shake = false,
}: {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  disabled?: boolean;
  shake?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      if (/^\d$/.test(e.key) && value.length < length) onChange(value + e.key);
      else if (e.key === 'Backspace') onChange(value.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [value, onChange, length, disabled]);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="select-none">
      <div className={cn('flex justify-center gap-3 mb-6', shake && 'animate-[wiggle_0.3s_ease-in-out_2]')} aria-live="polite" aria-label={`ใส่แล้ว ${value.length} จาก ${length} หลัก`}>
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-200',
              i < value.length
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 scale-105'
                : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/70'
            )}
          >
            {i < value.length && <span className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 animate-pop-in" />}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-[18rem] mx-auto">
        {keys.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={disabled}
              aria-label={k === 'del' ? 'ลบตัวเลข' : `เลข ${k}`}
              onClick={() => {
                if (k === 'del') onChange(value.slice(0, -1));
                else if (value.length < length) onChange(value + k);
              }}
              className={cn(
                'btn-jelly h-16 rounded-2xl font-display text-2xl border-2 shadow-[0_4px_0_0_rgb(95_47_212/0.18)] disabled:opacity-50',
                k === 'del'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-300 flex items-center justify-center'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
              )}
            >
              {k === 'del' ? <Delete className="w-6 h-6" /> : k}
            </button>
          )
        )}
      </div>
    </div>
  );
}
