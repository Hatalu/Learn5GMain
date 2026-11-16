'use client';

import React, { useEffect, useRef } from 'react';
import { getGfx } from '@/lib/gfx';
import { drawWaves } from './sign-in-water-effect-glass';

/** คลื่นโทนเทาเคลื่อนช้าๆ เต็มกล่องแม่ (ไม่ลงพื้นหลัง ใช้ทับพื้นของหน้า) หยุดเมื่อพ้นจอ/แท็บซ่อน */
export function WaveBackdrop({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || getGfx() === 'lite';
    const dark = () => document.documentElement.classList.contains('dark');
    let step = 0;
    let raf = 0;
    let seen = true;
    const size = () => {
      c.width = c.clientWidth;
      c.height = c.clientHeight;
      draw();
    };
    const draw = () => drawWaves(ctx, c.width, c.height, step, dark(), false);
    const loop = () => {
      raf = 0;
      if (!seen || document.hidden) return;
      draw();
      step += 1;
      raf = requestAnimationFrame(loop);
    };
    const go = () => !still && !raf && seen && !document.hidden && (raf = requestAnimationFrame(loop));
    const ro = new ResizeObserver(size);
    ro.observe(c);
    const io = new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      go();
    });
    io.observe(c);
    const mo = new MutationObserver(draw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', go);
    size();
    go();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', go);
    };
  }, []);
  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
