'use client';

import React from 'react';
import {
  ALL_GRADES,
  ALL_SUBJECTS,
  FilterState,
  GAME_FILTER_TYPES,
  GradeLevel,
  Subject,
} from '@/types/database';
import { Filter, RotateCcw, Check, BookOpen, GraduationCap, Layers, Calculator, FlaskConical, Languages } from 'lucide-react';
import { SUBJECT_STYLE } from '@/lib/utils/subject';
import { cn } from '@/lib/utils/cn';
import s from '@/components/ui/fancy.module.css';

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onReset: () => void;
  totalFilteredCount?: number;
  /** ตัวเลือกของ "ประเภทสื่อ" (คลังเกม / คลังเอกสาร ใช้ต่างกัน) */
  typeOptions?: readonly string[];
}

const SUBJECT_ICON: Record<Subject, React.ComponentType<{ className?: string }>> = {
  คณิตศาสตร์: Calculator,
  วิทยาศาสตร์: FlaskConical,
  ภาษาอังกฤษ: Languages,
};

function SectionTitle({ icon: Icon, children, tone }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; tone: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={cn('w-7 h-7 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md', tone)}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <h3 className="font-display text-sm text-gray-800 dark:text-gray-100 tracking-wide">{children}</h3>
      <span className="flex-1 h-px bg-gradient-to-r from-indigo-200/70 to-transparent dark:from-indigo-800/60" />
    </div>
  );
}

/** เนื้อหาตัวกรอง 3 หมวด ใช้ร่วมกันทั้งแถบข้าง (จอใหญ่) และลิ้นชัก (มือถือ) */
export function FilterSections({
  filters,
  onFilterChange,
  typeOptions = GAME_FILTER_TYPES,
}: Pick<FilterSidebarProps, 'filters' | 'onFilterChange' | 'typeOptions'>) {
  const toggleSubject = (subject: Subject) => {
    const next = filters.subjects.includes(subject) ? filters.subjects.filter((x) => x !== subject) : [...filters.subjects, subject];
    onFilterChange({ ...filters, subjects: next });
  };
  const toggleGrade = (grade: GradeLevel) => {
    const next = filters.grades.includes(grade) ? filters.grades.filter((g) => g !== grade) : [...filters.grades, grade];
    onFilterChange({ ...filters, grades: next });
  };
  const toggleMediaType = (type: string) => {
    const next = filters.mediaTypes.includes(type) ? filters.mediaTypes.filter((t) => t !== type) : [...filters.mediaTypes, type];
    onFilterChange({ ...filters, mediaTypes: next });
  };

  return (
    <>
      {/* วิชา */}
      <section className="relative">
        <SectionTitle icon={BookOpen} tone="from-emerald-400 to-teal-500">
          วิชา
        </SectionTitle>
        <div className="space-y-2">
          {ALL_SUBJECTS.map((sub) => {
            const on = filters.subjects.includes(sub);
            const Icon = SUBJECT_ICON[sub];
            const st = SUBJECT_STYLE[sub];
            return (
              <button
                key={sub}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggleSubject(sub)}
                className={cn(
                  s.row,
                  'w-full flex items-center gap-3 pl-1.5 pr-3 py-1.5 rounded-2xl border-2 text-left',
                  on
                    ? cn('bg-gradient-to-r text-white border-white/30 shadow-lg ring-2', st.gradient, st.ring)
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/70 hover:border-indigo-300 dark:hover:border-indigo-500/60 text-gray-800 dark:text-gray-100'
                )}
              >
                <span
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                    on ? 'bg-white/90 text-gray-800' : cn('bg-gradient-to-br text-white', st.gradient)
                  )}
                >
                  <Icon className="w-4.5 h-4.5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={cn('block text-sm font-bold leading-tight', on && '[text-shadow:0_1px_1px_rgba(0,0,0,0.25)]')}>{sub}</span>
                  <span className={cn('block text-[11px] truncate', on ? 'text-white/85' : 'text-gray-500 dark:text-gray-400')}>{st.label}</span>
                </span>
                <span className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2', on ? 'bg-white text-emerald-600 border-white' : 'border-gray-300 dark:border-gray-600')}>
                  {on && <Check className={cn('w-3.5 h-3.5 stroke-[3.5]', s.tick)} />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ระดับชั้น */}
      <section className="relative">
        <SectionTitle icon={GraduationCap} tone="from-sky-400 to-indigo-500">
          ระดับชั้น
        </SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {ALL_GRADES.map((grade) => {
            const on = filters.grades.includes(grade);
            return (
              <button
                key={grade}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggleGrade(grade)}
                className={cn(
                  s.chip,
                  on && s.chipOn,
                  'py-2.5 rounded-2xl border-2 font-display text-base',
                  on
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 border-white/30 text-white shadow-[0_4px_0_0_rgba(76,29,149,0.45)]'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-200 hover:border-indigo-300 dark:hover:border-indigo-500/60'
                )}
              >
                {grade}
              </button>
            );
          })}
        </div>
      </section>

      {/* ประเภทสื่อ */}
      <section className="relative">
        <SectionTitle icon={Layers} tone="from-pink-400 to-fuchsia-500">
          ประเภทสื่อ
        </SectionTitle>
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((type) => {
            const on = filters.mediaTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggleMediaType(type)}
                className={cn(
                  s.chip,
                  on && s.chipOn,
                  'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border-2 text-sm font-bold',
                  on
                    ? 'bg-gradient-to-r from-pink-500 to-fuchsia-500 border-white/30 text-white shadow-[0_4px_0_0_rgba(157,23,77,0.4)]'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-200 hover:border-pink-300 dark:hover:border-pink-500/60'
                )}
              >
                {on && <Check className={cn('w-3.5 h-3.5 stroke-[3.5]', s.tick)} />}
                {type}
              </button>
            );
          })}
        </div>
      </section>

    </>
  );
}

export function FilterSidebar({ filters, onFilterChange, onReset, totalFilteredCount, typeOptions }: FilterSidebarProps) {
  const activeCount = filters.subjects.length + filters.grades.length + filters.mediaTypes.length;
  const hasActiveFilters = activeCount > 0;

  return (
    <aside className="relative w-full flex flex-col gap-6 p-5 rounded-[1.75rem] bg-white dark:bg-gray-900 border-[3px] border-indigo-200/80 dark:border-indigo-500/35 shadow-toy sticky top-20 overflow-hidden">
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full bg-gradient-to-br from-violet-400/25 to-pink-400/20 blur-2xl" />

      {/* หัวตัวกรอง */}
      <div className="relative flex items-center justify-between gap-2 pb-4 border-b-2 border-dashed border-indigo-100 dark:border-indigo-900/70">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative w-9 h-9 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Filter className="w-4.5 h-4.5" />
            {hasActiveFilters && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
                {activeCount}
              </span>
            )}
          </span>
          <div className="min-w-0">
            <p className="font-display text-base leading-tight text-gray-900 dark:text-white whitespace-nowrap">ตัวกรองสื่อ</p>
            {typeof totalFilteredCount === 'number' && <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 whitespace-nowrap">พบ {totalFilteredCount} รายการ</p>}
          </div>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="chip shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900"
            title="ล้างตัวกรองทั้งหมด"
          >
            <RotateCcw className="w-3 h-3" /> ล้าง
          </button>
        )}
      </div>

      <FilterSections filters={filters} onFilterChange={onFilterChange} typeOptions={typeOptions} />

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          className="chip w-full py-2.5 rounded-2xl border-2 border-dashed border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-sm font-bold flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" /> ล้างตัวกรองทั้งหมด
        </button>
      )}
    </aside>
  );
}
