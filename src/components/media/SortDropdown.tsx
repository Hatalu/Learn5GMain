'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SortOption } from '@/types/database';
import { ArrowDownAZ, Check, ChevronDown, Clock3, Flame } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import s from '@/components/ui/fancy.module.css';

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const OPTIONS: { value: SortOption; label: string; hint: string; icon: React.ComponentType<{ className?: string }>; tone: string }[] = [
  { value: 'latest', label: 'สื่อล่าสุด', hint: 'เพิ่มใหม่ขึ้นก่อน', icon: Clock3, tone: 'from-sky-400 to-indigo-500' },
  { value: 'popular', label: 'สื่อยอดนิยม', hint: 'คนเล่นเยอะขึ้นก่อน', icon: Flame, tone: 'from-orange-400 to-rose-500' },
  { value: 'az', label: 'A-Z (ชื่อสื่อ)', hint: 'เรียงตามตัวอักษร', icon: ArrowDownAZ, tone: 'from-emerald-400 to-teal-500' },
];

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cur = OPTIONS.find((o) => o.value === value) || OPTIONS[0];

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', key);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="เรียงลำดับสื่อ"
        className="btn-jelly group flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-500/40 bg-white dark:bg-gray-900 shadow-[0_3px_0_0_rgba(99,102,241,0.25)] text-sm"
      >
        <span className={cn('w-8 h-8 rounded-xl bg-gradient-to-br text-white flex items-center justify-center shadow-md', cur.tone)}>
          <cur.icon className="w-4 h-4" />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 hidden sm:block">เรียงตาม</span>
          <span className="block font-bold text-gray-900 dark:text-white">{cur.label}</span>
        </span>
        <ChevronDown className={cn('w-4 h-4 text-indigo-500 transition-transform duration-300', open && 'rotate-180')} />
      </button>

      {open && (
        <ul role="listbox" className={cn(s.menu, 'absolute right-0 mt-2 w-64 z-30 p-1.5 rounded-2xl bg-white dark:bg-gray-900 border-2 border-indigo-100 dark:border-indigo-800 shadow-toy-lg')}>
          {OPTIONS.map((o) => {
            const on = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={on}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors',
                    on ? 'bg-indigo-50 dark:bg-indigo-950/60' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                >
                  <span className={cn('w-9 h-9 rounded-xl bg-gradient-to-br text-white flex items-center justify-center shrink-0', o.tone)}>
                    <o.icon className="w-4.5 h-4.5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-gray-900 dark:text-white">{o.label}</span>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">{o.hint}</span>
                  </span>
                  {on && <Check className={cn('w-4 h-4 text-indigo-600 dark:text-indigo-300 stroke-[3]', s.tick)} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
