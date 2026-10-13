'use client';

import React, { useEffect, useRef, useState } from 'react';

/** ตัวเลขนับขึ้นแบบเด้งเมื่อเลื่อนมาถึง (ถ้าผู้ใช้ตั้งลดการเคลื่อนไหวจะแสดงเลขเลย) */
export function CountUp({
  value,
  duration = 1000,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    let raf = 0;
    const run = () => {
      const from = shown;
      const t0 = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        // easeOutBack: เกินเล็กน้อยแล้วเด้งกลับ
        const c1 = 1.4;
        const eased = 1 + (c1 + 1) * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
        setShown(Math.round(from + (value - from) * Math.max(0, eased)));
        if (p < 1) raf = requestAnimationFrame(step);
        else setShown(value);
      };
      raf = requestAnimationFrame(step);
    };
    if (started.current) {
      run();
    } else {
      const io = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) {
            started.current = true;
            io.disconnect();
            run();
          }
        },
        { threshold: 0.3 }
      );
      io.observe(el);
      return () => {
        io.disconnect();
        cancelAnimationFrame(raf);
      };
    }
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {shown.toLocaleString('th-TH')}
    </span>
  );
}
