'use client';

import React from 'react';
import { SortOption } from '@/types/database';
import { ArrowDownUp } from 'lucide-react';

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <div className="relative inline-flex items-center">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm text-xs sm:text-sm">
        <ArrowDownUp className="w-4 h-4 text-indigo-500 shrink-0" />
        <span className="text-gray-500 dark:text-gray-400 font-medium hidden sm:inline">
          เรียงตาม:
        </span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as SortOption)}
          className="bg-transparent text-gray-900 dark:text-white font-medium focus:outline-none cursor-pointer pr-2"
          aria-label="เรียงลำดับสื่อ"
        >
          <option value="latest" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
            สื่อล่าสุด
          </option>
          <option value="popular" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
            สื่อยอดนิยม
          </option>
          <option value="az" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
            A-Z (ชื่อสื่อ)
          </option>
        </select>
      </div>
    </div>
  );
}
