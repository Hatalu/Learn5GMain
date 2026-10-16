'use client';

import React, { useRef, useState } from 'react';

/** ช่องกรอกเลขห้อง 6 หลัก แสดงเป็นกล่องทีละตัว (ช่อง input จริงซ้อนอยู่ด้านบน รองรับวาง/แป้นตัวเลขมือถือ) */
export function CodeInput({ value, onChange, onEnter, size = 'lg', autoFocus }: { value: string; onChange: (v: string) => void; onEnter?: () => void; size?: 'md' | 'lg'; autoFocus?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [focus, setFocus] = useState(false);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');
  return (
    <div className="l5g-code" data-size={size} onClick={() => ref.current?.focus()}>
      {digits.map((d, i) => (
        <span key={i} className="l5g-code-box" data-filled={d.trim() ? 'true' : 'false'} data-cur={focus && i === Math.min(value.length, 5) ? 'true' : 'false'}>
          {d.trim()}
        </span>
      ))}
      <input
        ref={ref}
        className="l5g-code-input"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        autoFocus={autoFocus}
        aria-label="เลขห้อง 6 หลัก"
        value={value}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
      />
    </div>
  );
}
