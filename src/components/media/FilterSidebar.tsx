'use client';

import React from 'react';
import {
  ALL_GRADES,
  ALL_MEDIA_TYPES,
  ALL_SUBJECTS,
  AccessTier,
  FilterState,
  GradeLevel,
  MediaType,
  Subject,
} from '@/types/database';
import { Filter, RotateCcw, Check, BookOpen, GraduationCap, Layers, Crown, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onReset: () => void;
  totalFilteredCount?: number;
}

export function FilterSidebar({
  filters,
  onFilterChange,
  onReset,
  totalFilteredCount,
}: FilterSidebarProps) {
  const toggleSubject = (subject: Subject) => {
    const next = filters.subjects.includes(subject)
      ? filters.subjects.filter((s) => s !== subject)
      : [...filters.subjects, subject];
    onFilterChange({ ...filters, subjects: next });
  };

  const toggleGrade = (grade: GradeLevel) => {
    const next = filters.grades.includes(grade)
      ? filters.grades.filter((g) => g !== grade)
      : [...filters.grades, grade];
    onFilterChange({ ...filters, grades: next });
  };

  const toggleMediaType = (type: MediaType) => {
    const next = filters.mediaTypes.includes(type)
      ? filters.mediaTypes.filter((t) => t !== type)
      : [...filters.mediaTypes, type];
    onFilterChange({ ...filters, mediaTypes: next });
  };

  const toggleAccessTier = (tier: AccessTier) => {
    const next = filters.accessTiers.includes(tier)
      ? filters.accessTiers.filter((t) => t !== tier)
      : [...filters.accessTiers, tier];
    onFilterChange({ ...filters, accessTiers: next });
  };

  const hasActiveFilters =
    filters.subjects.length > 0 ||
    filters.grades.length > 0 ||
    filters.mediaTypes.length > 0 ||
    filters.accessTiers.length > 0;

  return (
    <aside className="w-full flex flex-col gap-6 p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 shadow-sm sticky top-20">
      {/* Filter Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="font-bold text-sm text-gray-900 dark:text-white">ตัวกรองสื่อ</span>
          {typeof totalFilteredCount === 'number' && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300">
              {totalFilteredCount} รายการ
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium"
            title="ล้างตัวกรองทั้งหมด"
          >
            <RotateCcw className="w-3 h-3" />
            <span>ล้าง</span>
          </button>
        )}
      </div>

      {/* 0. Access Tier Filter (Free / Premium) */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            สิทธิ์การเข้าถึง
          </h3>
        </div>
        <div className="space-y-1.5">
          <label
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm cursor-pointer transition-all duration-150',
              filters.accessTiers.includes('free')
                ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 font-semibold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
            )}
          >
            <div className="flex items-center gap-2">
              <Unlock className="w-3.5 h-3.5 text-emerald-500" />
              <span>ฟรี (Free)</span>
            </div>
            <input
              type="checkbox"
              checked={filters.accessTiers.includes('free')}
              onChange={() => toggleAccessTier('free')}
              className="sr-only"
            />
            <div
              className={cn(
                'w-4 h-4 rounded-md border flex items-center justify-center transition-colors',
                filters.accessTiers.includes('free')
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
              )}
            >
              {filters.accessTiers.includes('free') && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </label>

          <label
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm cursor-pointer transition-all duration-150',
              filters.accessTiers.includes('premium')
                ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 font-semibold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
            )}
          >
            <div className="flex items-center gap-2">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>พรีเมียม (Premium)</span>
            </div>
            <input
              type="checkbox"
              checked={filters.accessTiers.includes('premium')}
              onChange={() => toggleAccessTier('premium')}
              className="sr-only"
            />
            <div
              className={cn(
                'w-4 h-4 rounded-md border flex items-center justify-center transition-colors',
                filters.accessTiers.includes('premium')
                  ? 'bg-amber-600 border-amber-600 text-white'
                  : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
              )}
            >
              {filters.accessTiers.includes('premium') && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </label>
        </div>
      </div>

      {/* 1. Subject Filter */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
          <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            วิชา
          </h3>
        </div>
        <div className="space-y-1.5">
          {ALL_SUBJECTS.map((sub) => {
            const isChecked = filters.subjects.includes(sub);
            return (
              <label
                key={sub}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm cursor-pointer transition-all duration-150',
                  isChecked
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                )}
              >
                <span>{sub}</span>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSubject(sub)}
                  className="hidden"
                />
                <div
                  className={cn(
                    'w-4 h-4 rounded-md border flex items-center justify-center transition-colors',
                    isChecked
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                  )}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* 2. Grade Filter */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
          <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            ระดับชั้น
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {ALL_GRADES.map((grade) => {
            const isChecked = filters.grades.includes(grade);
            return (
              <label
                key={grade}
                className={cn(
                  'flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs cursor-pointer border transition-all duration-150',
                  isChecked
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-semibold'
                    : 'border-gray-200/80 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                )}
              >
                <span>{grade}</span>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleGrade(grade)}
                  className="hidden"
                />
                {isChecked && <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400 stroke-[3]" />}
              </label>
            );
          })}
        </div>
      </div>

      {/* 3. Media Type Filter */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
          <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            ประเภทสื่อ
          </h3>
        </div>
        <div className="space-y-1.5">
          {ALL_MEDIA_TYPES.map((type) => {
            const isChecked = filters.mediaTypes.includes(type);
            return (
              <label
                key={type}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm cursor-pointer transition-all duration-150',
                  isChecked
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                )}
              >
                <span>{type}</span>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleMediaType(type)}
                  className="hidden"
                />
                <div
                  className={cn(
                    'w-4 h-4 rounded-md border flex items-center justify-center transition-colors',
                    isChecked
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                  )}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Clear Button */}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="w-full py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>ล้างตัวกรอง</span>
        </button>
      )}
    </aside>
  );
}
