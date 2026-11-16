'use client';

/**
 * กรอบหน้าเข้าสู่ระบบ/สมัคร แบบกระจกน้ำ (ดัดแปลงจากคอมโพเนนต์ LiquidGlassSignUp)
 * - พื้นหลังคลื่นโทนเทาเคลื่อนช้าๆ (canvas)
 * - แตะ/ลากบนแผ่นกระจก = คลื่นน้ำวงกลม (canvas) + กระจกบิดเหมือนน้ำ (SVG feDisplacementMap)
 * ปรับให้เข้ากับเว็บ: รองรับโหมดสว่างและมืด, เปิดตัวกรองบิดภาพเฉพาะตอนมีคลื่น (ตัวหนังสือคมตอนนิ่ง),
 * ลดการเคลื่อนไหว/กราฟิกลื่น = ภาพนิ่ง, หยุดวาดเมื่อแท็บถูกซ่อน
 */
import React, { useEffect, useId, useRef } from 'react';
import { useTheme } from 'next-themes';
import { getGfx } from '@/lib/gfx';
import { Logo } from '@/components/navbar/Logo';
import { ThemeToggle } from '@/components/navbar/ThemeToggle';

/** ช่องกรอกบนกระจก (ใช้ร่วมในหน้าเข้าสู่ระบบ/สมัคร) */
export const glassInput =
  'w-full h-12 px-4 rounded-xl text-sm transition-all focus:outline-none ' +
  'bg-black/[0.03] border border-black/10 text-neutral-900 placeholder-neutral-400 focus:border-black/50 focus:bg-black/[0.05] ' +
  'dark:bg-white/[0.06] dark:border-white/15 dark:text-white dark:placeholder-neutral-500 dark:focus:border-white/60 dark:focus:bg-white/[0.1]';
export const glassLabel = 'block mb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-300';

/** พื้นหลังคลื่นโทนเทา (ใช้ทั้งหน้าเข้าสู่ระบบและหน้าแรก) */
export function drawWaves(ctx: CanvasRenderingContext2D, w: number, h: number, step: number, d: boolean, fill = true) {
  if (fill) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    if (d) {
      g.addColorStop(0, '#080808');
      g.addColorStop(0.5, '#0e0e0e');
      g.addColorStop(1, '#040404');
    } else {
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.5, '#f7f7f7');
      g.addColorStop(1, '#efefef');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else ctx.clearRect(0, 0, w, h);
  const ink = d ? '255, 255, 255' : '0, 0, 0';
  const waves = [
    { y: 0.72, len: 0.0022, amp: 45, sp: 0.015, a: d ? 0.035 : 0.025 },
    { y: 0.8, len: 0.0035, amp: 35, sp: 0.022, a: d ? 0.05 : 0.03 },
    { y: 0.88, len: 0.0018, amp: 55, sp: 0.01, a: d ? 0.08 : 0.04 },
  ];
  waves.forEach((v, i) => {
    ctx.beginPath();
    ctx.moveTo(0, h);
    const base = h * v.y;
    for (let x = 0; x <= w; x += 6) ctx.lineTo(x, base + Math.sin(x * v.len + step * v.sp) * v.amp + Math.cos(x * 0.001 + step * 0.008) * v.amp * 0.4);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(' + ink + ', ' + v.a + ')';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(' + ink + ', ' + ((d ? 0.08 : 0.06) + i * 0.03) + ')';
    ctx.stroke();
  });
}

interface Ripple {
  x: number;
  y: number;
  r: number;
  max: number;
  o: number;
}

export function LiquidGlassShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const darkRef = useRef(false);
  darkRef.current = resolvedTheme === 'dark';

  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const rippleRef = useRef<HTMLCanvasElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const turbRef = useRef<SVGFETurbulenceElement | null>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const fid = `lg-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    const bg = bgRef.current;
    const rc = rippleRef.current;
    const panel = panelRef.current;
    if (!bg || !rc || !panel) return;
    const bctx = bg.getContext('2d');
    const rctx = rc.getContext('2d');
    if (!bctx || !rctx) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || getGfx() === 'lite';
    const ripples: Ripple[] = [];
    const wave = { now: 0, target: 0 };
    let step = 0;
    let raf = 0;
    let filterOn = false;

    const size = () => {
      bg.width = window.innerWidth;
      bg.height = window.innerHeight;
      rc.width = panel.clientWidth;
      rc.height = panel.clientHeight;
    };
    size();
    window.addEventListener('resize', size);
    const ro = new ResizeObserver(size);
    ro.observe(panel);

    const drawBg = () => drawWaves(bctx, bg.width, bg.height, step, darkRef.current);

    const loop = () => {
      raf = 0;
      if (document.hidden) return;
      drawBg();
      step += 1;

      wave.now += (wave.target - wave.now) * 0.12;
      wave.target *= 0.94;
      if (wave.target < 0.05) wave.target = 0;
      const on = wave.now > 0.05;
      if (on !== filterOn) {
        filterOn = on;
        panel.style.filter = on ? `url(#${fid})` : '';
      }
      if (on) {
        dispRef.current?.setAttribute('scale', wave.now.toFixed(2));
        turbRef.current?.setAttribute('baseFrequency', '0.015 0.0225');
      }

      rctx.clearRect(0, 0, rc.width, rc.height);
      const ink = darkRef.current ? '255, 255, 255' : '0, 0, 0';
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += 3.5;
        r.o *= 0.96;
        rctx.beginPath();
        rctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        rctx.strokeStyle = `rgba(${ink}, ${r.o.toFixed(3)})`;
        rctx.lineWidth = 1.5;
        rctx.stroke();
        if (r.r > 15) {
          rctx.beginPath();
          rctx.arc(r.x, r.y, r.r * 0.65, 0, Math.PI * 2);
          rctx.strokeStyle = `rgba(${ink}, ${(r.o * 0.45).toFixed(3)})`;
          rctx.lineWidth = 1;
          rctx.stroke();
        }
        if (r.o < 0.005 || r.r > r.max) ripples.splice(i, 1);
      }
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (!raf && !document.hidden) raf = requestAnimationFrame(loop);
    };

    const hit = (cx: number, cy: number, strong: boolean) => {
      if (still) return;
      const b = panel.getBoundingClientRect();
      wave.target = strong ? 24 : 14;
      ripples.push({ x: cx - b.left, y: cy - b.top, r: 4, max: Math.max(rc.width, rc.height) * 0.85, o: (strong ? 0.6 : 0.35) * (darkRef.current ? 1 : 0.6) });
      start();
    };
    const down = (e: PointerEvent) => hit(e.clientX, e.clientY, true);
    const move = (e: PointerEvent) => {
      if (e.buttons !== 1 || Math.random() < 0.4) return;
      hit(e.clientX, e.clientY, false);
    };
    const vis = () => (document.hidden ? (cancelAnimationFrame(raf), (raf = 0)) : still ? drawBg() : start());

    panel.addEventListener('pointerdown', down);
    panel.addEventListener('pointermove', move);
    document.addEventListener('visibilitychange', vis);
    if (still) drawBg();
    else start();
    // ภาพนิ่ง: วาดใหม่เมื่อเปลี่ยนโหมดสว่าง/มืด
    const mo = new MutationObserver(() => still && drawBg());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', size);
      ro.disconnect();
      mo.disconnect();
      panel.removeEventListener('pointerdown', down);
      panel.removeEventListener('pointermove', move);
      document.removeEventListener('visibilitychange', vis);
      panel.style.filter = '';
    };
  }, [fid]);

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-white p-4 text-neutral-900 dark:bg-[#070707] dark:text-white sm:p-6">
      <canvas ref={bgRef} className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden />

      <svg className="pointer-events-none absolute -left-[9999px] -top-[9999px] h-0 w-0" aria-hidden="true">
        <defs>
          <filter id={fid} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence ref={turbRef} type="fractalNoise" baseFrequency="0.015 0.022" numOctaves="2" result="noise" />
            <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between sm:left-6 sm:right-6 sm:top-6">
        <Logo />
        <ThemeToggle />
      </div>

      <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-black/[0.03] blur-3xl dark:bg-white/[0.04]" aria-hidden />

      <div
        ref={panelRef}
        className="relative z-10 my-16 w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-white/70 p-8 shadow-[0_25px_60px_-20px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.9)] backdrop-blur-xl dark:border-white/20 dark:bg-neutral-900/60 dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.4)] sm:p-10"
      >
        <canvas ref={rippleRef} className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden />
        <div className="relative z-10">
          <div className="text-center">
            <h1 className="font-display text-2xl font-light tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1.5 text-xs font-light text-neutral-500 dark:text-neutral-400 sm:text-sm">{subtitle}</p>}
          </div>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-xs text-neutral-500 dark:text-neutral-400">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

/** ความแข็งแรงของรหัสผ่าน 0-4 */
export function passwordStrength(p: string) {
  let n = 0;
  if (p.length >= 8) n++;
  if (/[A-Z]/.test(p)) n++;
  if (/[0-9]/.test(p)) n++;
  if (/[^A-Za-z0-9]/.test(p)) n++;
  return n;
}
export const STRENGTH_LABELS = ['อ่อนมาก', 'อ่อน', 'พอใช้', 'แข็งแรง', 'แข็งแรงมาก'];

export default LiquidGlassShell;
