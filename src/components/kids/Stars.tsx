import React from 'react';
import { cn } from '@/lib/utils/cn';

export function StarIcon({ filled = true, className }: { filled?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('w-5 h-5', className)} aria-hidden="true">
      <path
        d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.2 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"
        fill={filled ? '#ffc53a' : 'none'}
        stroke={filled ? '#f5a50f' : 'currentColor'}
        strokeWidth="1.6"
        strokeLinejoin="round"
        className={filled ? '' : 'text-gray-300 dark:text-gray-600'}
      />
    </svg>
  );
}

/** แถวดาว 0-3 */
export function StarRow({ count, max = 3, className }: { count: number | null; max?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${count ?? 0} จาก ${max} ดาว`}>
      {Array.from({ length: max }).map((_, i) => (
        <StarIcon key={i} filled={(count ?? 0) > i} />
      ))}
    </span>
  );
}
