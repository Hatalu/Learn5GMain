'use client';

import React, { useMemo } from 'react';

const COLORS = ['#ffd25e', '#ff62b3', '#8660fb', '#2fd196', '#2eb4f5', '#ff7a59'];

/** คอนเฟตติตกลงมา (CSS ล้วน) ใช้ตอนฉลองรางวัล */
export function Confetti({ count = 60 }: { count?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2.2 + Math.random() * 1.8,
        dx: (Math.random() - 0.5) * 160,
        rot: 360 + Math.random() * 540,
        w: 6 + Math.random() * 7,
        h: 8 + Math.random() * 10,
        color: COLORS[i % COLORS.length],
        round: i % 4 === 0,
      })),
    [count]
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {bits.map((b, i) => (
        <span
          key={i}
          className="confetti"
          style={
            {
              left: `${b.left}%`,
              width: b.w,
              height: b.round ? b.w : b.h,
              background: b.color,
              borderRadius: b.round ? '9999px' : '2px',
              animationDuration: `${b.dur}s`,
              animationDelay: `${b.delay}s`,
              '--dx': `${b.dx}px`,
              '--rot': `${b.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
