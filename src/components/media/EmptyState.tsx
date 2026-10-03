'use client';

import React from 'react';
import { BookX, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface EmptyStateProps {
  type: 'no-media' | 'no-filter-results';
  onResetFilters?: () => void;
  onOpenAddModal?: () => void;
}

export function EmptyState({ type, onResetFilters, onOpenAddModal }: EmptyStateProps) {
  const { isDev } = useAuth();

  if (type === 'no-filter-results') {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm my-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
          <BookX className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          ไม่พบสื่อที่ตรงกับตัวกรอง
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-5">
          ลองเลือกวิชาหรือระดับชั้นอื่น หรือกดล้างตัวกรองเพื่อดูสื่อการสอนทั้งหมด
        </p>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md shadow-indigo-600/20 active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>ล้างตัวกรองทั้งหมด</span>
          </button>
        )}
      </div>
    );
  }

  // Type: no-media in database
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-14 text-center rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm my-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 shadow-sm">
        <BookX className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">
        ยังไม่มีสื่อการสอน
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">
        สื่อการสอนจะแสดงที่นี่เมื่อ Dev เพิ่มสื่อใหม่เข้าสู่ระบบ
      </p>

      {/* If Dev: show "+ เพิ่มสื่อการสอน" button */}
      {isDev && onOpenAddModal && (
        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ เพิ่มสื่อการสอน</span>
        </button>
      )}
    </div>
  );
}
