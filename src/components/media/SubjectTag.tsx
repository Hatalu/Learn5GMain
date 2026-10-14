import React from 'react';
import { Calculator, FlaskConical, Languages, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/** สไตล์แท็กวิชา: ไล่สีเข้ม + ไอคอนในวงกลม + ขอบหนา + แสงวิบวับ (ไม่ใช้อิโมจิ) */
const STYLE: Record<string, { grad: string; edge: string; glow: string; Icon: React.ComponentType<{ className?: string }> }> = {
  คณิตศาสตร์: {
    grad: 'from-emerald-400 via-mint-500 to-teal-500',
    edge: 'border-emerald-700/70 dark:border-emerald-300/50',
    glow: 'shadow-[0_3px_0_0_rgba(4,120,87,0.55)]',
    Icon: Calculator,
  },
  วิทยาศาสตร์: {
    grad: 'from-sky-400 via-blue-500 to-indigo-500',
    edge: 'border-blue-800/70 dark:border-sky-300/50',
    glow: 'shadow-[0_3px_0_0_rgba(30,64,175,0.55)]',
    Icon: FlaskConical,
  },
  ภาษาอังกฤษ: {
    grad: 'from-amber-300 via-sun-400 to-orange-500',
    edge: 'border-orange-700/70 dark:border-amber-200/50',
    glow: 'shadow-[0_3px_0_0_rgba(194,65,12,0.55)]',
    Icon: Languages,
  },
};

export function SubjectTag({ subject, size = 'md', className }: { subject: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = STYLE[subject] || { grad: 'from-indigo-400 to-violet-500', edge: 'border-indigo-700/60', glow: 'shadow-[0_3px_0_0_rgba(67,56,202,0.5)]', Icon: BookOpen };
  const dark = subject === 'ภาษาอังกฤษ';
  const dims = size === 'lg' ? 'pl-1.5 pr-4 py-1 text-base gap-2' : size === 'sm' ? 'pl-1 pr-2.5 py-0.5 text-xs gap-1.5' : 'pl-1 pr-3 py-0.5 text-sm gap-1.5';
  const icon = size === 'lg' ? 'w-8 h-8' : size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  const ic = size === 'lg' ? 'w-[18px] h-[18px]' : size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  return (
    <span
      className={cn(
        'relative inline-flex items-center overflow-hidden rounded-full border-2 bg-gradient-to-r font-display font-medium tracking-wide select-none',
        s.grad,
        s.edge,
        s.glow,
        dark ? 'text-orange-950' : 'text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.35)]',
        dims,
        className
      )}
    >
      {/* แสงสะท้อนด้านบน */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-1 top-0 h-1/2 rounded-full bg-white/30" />
      <span
        aria-hidden="true"
        className={cn('relative shrink-0 rounded-full bg-white/95 flex items-center justify-center', icon, dark ? 'text-orange-600' : subject === 'วิทยาศาสตร์' ? 'text-blue-600' : 'text-emerald-600')}
      >
        <s.Icon className={ic} />
      </span>
      <span className="relative">{subject}</span>
    </span>
  );
}
