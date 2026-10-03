'use client';

import React, { useEffect } from 'react';
import {
  ALL_GRADES,
  ALL_MEDIA_TYPES,
  ALL_SUBJECTS,
  FilterState,
  GradeLevel,
  MediaType,
  Subject,
} from '@/types/database';
import { X, RotateCcw, Check, BookOpen, GraduationCap, Layers } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onReset: () => void;
  totalFilteredCount?: number;
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onReset,
  totalFilteredCount,
}: MobileFilterDrawerProps) {
  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative ml-auto w-full max-w-xs sm:max-w-sm h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col z-10 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">ตัวกรองสื่อ</h2>
            {typeof totalFilteredCount === 'number' && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                พบ {totalFilteredCount} รายการ
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="ปิดตัวกรอง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 1. Subjects */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                วิชา
              </h3>
            </div>
            <div className="space-y-1">
              {ALL_SUBJECTS.map((sub) => {
                const isChecked = filters.subjects.includes(sub);
                return (
                  <label
                    key={sub}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-xl text-sm cursor-pointer',
                      isChecked
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
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
                          : 'border-gray-300 dark:border-gray-700'
                      )}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 2. Grades */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                ระดับชั้น
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ALL_GRADES.map((grade) => {
                const isSelected = filters.grades.includes(grade);
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => toggleGrade(grade)}
                    className={cn(
                      'py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all',
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {grade}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Media Types */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                ประเภทสื่อ
              </h3>
            </div>
            <div className="space-y-1">
              {ALL_MEDIA_TYPES.map((type) => {
                const isChecked = filters.mediaTypes.includes(type);
                return (
                  <label
                    key={type}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-xl text-sm cursor-pointer',
                      isChecked
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
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
                          : 'border-gray-300 dark:border-gray-700'
                      )}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
          <button
            onClick={onReset}
            className="flex-1 py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>ล้าง</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-md shadow-indigo-600/20"
          >
            แสดงผลลัพธ์
          </button>
        </div>
      </div>
    </div>
  );
}
