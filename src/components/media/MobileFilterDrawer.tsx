'use client';

import React, { useEffect } from 'react';
import { FilterState } from '@/types/database';
import { X, RotateCcw, Filter } from 'lucide-react';
import { FilterSections } from '@/components/media/FilterSidebar';

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onReset: () => void;
  totalFilteredCount?: number;
  typeOptions?: readonly string[];
}

/** ตัวกรองบนมือถือ/แท็บเล็ต: แผงเลื่อนขึ้นจากด้านล่าง ใช้ชุดตัวกรองเดียวกับแถบข้างจอใหญ่ */
export function MobileFilterDrawer({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onReset,
  totalFilteredCount,
  typeOptions,
}: MobileFilterDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeCount = filters.subjects.length + filters.grades.length + filters.mediaTypes.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end lg:hidden" role="dialog" aria-modal="true" aria-label="ตัวกรอง">
      <div className="absolute inset-0 bg-indigo-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative w-full sm:max-w-sm max-h-[88vh] sm:max-h-none sm:h-full flex flex-col bg-white dark:bg-gray-900 rounded-t-[2rem] sm:rounded-none sm:rounded-l-[2rem] border-t-[3px] sm:border-t-0 sm:border-l-[3px] border-indigo-200 dark:border-indigo-500/40 shadow-2xl animate-sheet-up sm:animate-fade-in overflow-hidden">
        <span className="sm:hidden mx-auto mt-2.5 w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" aria-hidden="true" />

        <div className="flex items-center justify-between gap-2 px-5 pt-3 pb-4 border-b-2 border-dashed border-indigo-100 dark:border-indigo-900/70">
          <div className="flex items-center gap-2.5">
            <span className="relative w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Filter className="w-4 h-4" />
              {activeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
                  {activeCount}
                </span>
              )}
            </span>
            <div>
              <p className="font-display text-base leading-tight text-gray-900 dark:text-white">ตัวกรอง</p>
              {typeof totalFilteredCount === 'number' && (
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">พบ {totalFilteredCount} รายการ</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-jelly p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white"
            aria-label="ปิดตัวกรอง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 flex flex-col gap-6">
          <FilterSections filters={filters} onFilterChange={onFilterChange} typeOptions={typeOptions} />
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-2.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onReset}
            disabled={activeCount === 0}
            className="btn-jelly flex-1 py-3 px-3 rounded-2xl border-2 border-dashed border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" />
            <span>ล้าง</span>
          </button>
          <button type="button" onClick={onClose} className="btn-jelly btn-primary-grad flex-[2] py-3 px-3 rounded-2xl text-sm font-bold">
            ดูผลลัพธ์{typeof totalFilteredCount === 'number' ? ` ${totalFilteredCount} รายการ` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
