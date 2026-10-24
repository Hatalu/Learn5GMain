'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/** หน้าต่างป๊อปอัปที่เข้าถึงง่าย: กด Esc ปิด, ล็อก scroll พื้นหลัง, โฟกัสเข้าหน้าต่าง */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-5 bg-indigo-950/80 animate-fade-in overflow-y-auto no-print" onMouseDown={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full my-auto bg-white dark:bg-gray-900 rounded-[2rem] p-5 sm:p-7 shadow-toy-lg border-2 border-indigo-200 dark:border-indigo-900 animate-pop-in outline-none',
          wide ? 'max-w-3xl' : 'max-w-lg',
          className
        )}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="ปิดหน้าต่าง">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white pr-10 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
