'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** หน้าต่างป๊อปอัปสไตล์กระดาษขอบหมึก (Esc ปิด ล็อกการเลื่อนพื้นหลัง) */
export function PaperModal({
  title,
  icon,
  iconBg = '#9b6cf0',
  onClose,
  children,
  width = 520,
  busy = false,
}: {
  title: string;
  icon?: React.ReactNode;
  iconBg?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  busy?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, busy]);
  if (!mounted) return null;
  return createPortal(
    <div className="l5g-math-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div ref={ref} tabIndex={-1} className="l5g-math-sheet outline-none" style={{ width: `min(${width}px, 100%)` }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="l5g-math-head">
          {icon && (
            <span className="l5g-fx-badge" style={{ background: iconBg, fontStyle: 'normal' }}>
              {icon}
            </span>
          )}
          <h3>{title}</h3>
          <button type="button" className="l5g-icon-btn" onClick={onClose} disabled={busy} aria-label="ปิด">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
