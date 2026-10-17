'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { GamepadIcon, PaperStackIcon } from './DocIcons';

export type LibraryKind = 'games' | 'docs';

const ITEMS: { id: LibraryKind; title: string; sub: string; Icon: React.ComponentType<{ className?: string }>; grad: string }[] = [
  { id: 'games', title: 'เกมการเรียนรู้', sub: 'เกม', Icon: GamepadIcon, grad: 'from-indigo-500 via-violet-500 to-fuchsia-500' },
  { id: 'docs', title: 'เอกสาร/ใบงาน', sub: 'รายการ', Icon: PaperStackIcon, grad: 'from-sky-500 via-indigo-500 to-violet-500' },
];

/** ปุ่มสลับคลังกลางหน้า: เกมการเรียนรู้ (ค่าเริ่มต้น) / เอกสาร-ใบงาน */
export function LibrarySwitch({
  value,
  onChange,
  counts,
}: {
  value: LibraryKind;
  onChange: (v: LibraryKind) => void;
  counts: Partial<Record<LibraryKind, number | null>>;
}) {
  const idx = ITEMS.findIndex((i) => i.id === value);
  return (
    <div
      role="tablist"
      aria-label="เลือกคลัง"
      className="relative mx-auto w-full max-w-2xl grid grid-cols-2 p-1.5 sm:p-2 rounded-[1.9rem] sm:rounded-[2.2rem] bg-white/90 dark:bg-gray-900/90 border-[3px] border-indigo-200/80 dark:border-indigo-500/35 shadow-toy backdrop-blur-sm"
    >
      {/* แถบไฮไลต์เลื่อนตามปุ่มที่เลือก */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-1.5 bottom-1.5 sm:top-2 sm:bottom-2 left-1.5 sm:left-2 w-[calc(50%-0.375rem)] sm:w-[calc(50%-0.5rem)] rounded-[1.5rem] sm:rounded-[1.75rem] bg-gradient-to-r shadow-[0_5px_0_0_rgba(76,29,149,0.45),0_14px_28px_-10px_rgba(124,58,237,0.7)] transition-[transform,background] duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)]',
          ITEMS[idx]?.grad
        )}
        style={{ transform: `translateX(${idx * 100}%)` }}
      />
      {ITEMS.map(({ id, title, sub, Icon }) => {
        const on = id === value;
        const n = counts[id];
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={on}
            data-tour={`lib-${id}`}
            onClick={() => onChange(id)}
            className={cn(
              'group relative z-10 flex items-center justify-center gap-2 sm:gap-3.5 px-1.5 sm:px-4 py-2.5 sm:py-3.5 rounded-[1.5rem] sm:rounded-[1.75rem] transition-colors duration-300 active:scale-[0.97]',
              on ? 'text-white' : 'text-gray-600 dark:text-gray-300 hover:text-indigo-700 dark:hover:text-white'
            )}
          >
            <span
              className={cn(
                'relative w-9 h-9 sm:w-14 sm:h-14 shrink-0 rounded-2xl flex items-center justify-center transition-all duration-500',
                on ? 'bg-white/20 text-white scale-105 rotate-[-6deg]' : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 dark:text-indigo-300 group-hover:rotate-[-6deg]'
              )}
            >
              <Icon className={cn('w-6 h-6 sm:w-9 sm:h-9', on && 'drop-shadow-[0_2px_0_rgba(0,0,0,0.2)]')} />
            </span>
            <span className="text-left min-w-0">
              <span className={cn('block font-display text-[14px] min-[400px]:text-[15px] sm:text-xl leading-tight whitespace-nowrap', on && '[text-shadow:0_2px_0_rgba(0,0,0,0.18)]')}>{title}</span>
              <span className={cn('block text-[11px] sm:text-xs font-semibold', on ? 'text-white/85' : 'text-gray-400 dark:text-gray-500')}>
                {typeof n === 'number' ? `${n.toLocaleString('th-TH')} ${sub}` : ' '}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
