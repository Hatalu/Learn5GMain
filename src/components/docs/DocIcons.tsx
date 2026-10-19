import React from 'react';
import { cn } from '@/lib/utils/cn';
import type { DocFileKind } from '@/lib/documents';

/** ไอคอนไฟล์ PDF / Word วาดเอง (ไม่ใช้อิโมจิ) */
export function FileBadge({ kind, className }: { kind: DocFileKind; className?: string }) {
  const pdf = kind === 'pdf';
  return (
    <svg viewBox="0 0 40 48" className={cn('shrink-0', className)} aria-hidden="true">
      <path d="M4 4a4 4 0 0 1 4-4h18l10 10v34a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill={pdf ? '#fee2e2' : '#dbeafe'} />
      <path d="M26 0v6a4 4 0 0 0 4 4h6z" fill={pdf ? '#fca5a5' : '#93c5fd'} />
      <path d="M4 4a4 4 0 0 1 4-4h18l10 10v34a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="none" stroke={pdf ? '#dc2626' : '#2563eb'} strokeWidth="2.2" />
      <rect x="0" y="24" width="30" height="15" rx="4" fill={pdf ? '#dc2626' : '#2563eb'} />
      <text x="15" y="34.6" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">
        {pdf ? 'PDF' : 'DOC'}
      </text>
    </svg>
  );
}

/** ลายกระดาษซ้อน 3 แผ่น ใช้กับการ์ด/ปุ่มคลังเอกสาร */
export function PaperStackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="13" y="5" width="26" height="33" rx="4" fill="currentColor" opacity="0.35" transform="rotate(8 26 21)" />
      <rect x="10" y="7" width="26" height="33" rx="4" fill="currentColor" opacity="0.6" transform="rotate(-6 23 23)" />
      <rect x="11" y="9" width="26" height="33" rx="4" fill="#fff" stroke="currentColor" strokeWidth="2.5" />
      <path d="M16 18h16M16 24h16M16 30h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** จอวิดีโอมีปุ่มเล่น ใช้กับปุ่มคลังวิดีโอ */
export function VideoScreenIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="5" y="9" width="38" height="27" rx="7" fill="#fff" stroke="currentColor" strokeWidth="2.5" />
      <path d="M20.5 16.5v12l10-6z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M17 41h14" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

/** จอยเกม ใช้กับปุ่มคลังเกม */
export function GamepadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        d="M14 14h20a10 10 0 0 1 9.8 8l1.6 8.2a6 6 0 0 1-10.4 5.2L31 31H17l-4 4.4a6 6 0 0 1-10.4-5.2L4.2 22A10 10 0 0 1 14 14z"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M15 19v8M11 23h8" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="32" cy="20.5" r="2.3" fill="currentColor" />
      <circle cx="36.5" cy="25" r="2.3" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
