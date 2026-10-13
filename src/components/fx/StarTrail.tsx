'use client';

import { useEffect } from 'react';

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  kind: 0 | 1; // 0 = ดาว 4 แฉก, 1 = จุดกลม
}

const COLORS = ['#ffd25e', '#ff94cc', '#bfa9ff', '#8cf0c8', '#9adcfb', '#ffffff'];
const MAX = 140;

function drawStar(ctx: CanvasRenderingContext2D, size: number) {
  const s = size;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(s * 0.18, -s * 0.18, s, 0);
  ctx.quadraticCurveTo(s * 0.18, s * 0.18, 0, s);
  ctx.quadraticCurveTo(-s * 0.18, s * 0.18, -s, 0);
  ctx.quadraticCurveTo(-s * 0.18, -s * 0.18, 0, -s);
  ctx.closePath();
  ctx.fill();
}

/**
 * เคอร์เซอร์/นิ้วทิ้งผงดาว: เมาส์ขยับ = ทิ้งดาวตามหลัง, แตะ/คลิก = ระเบิดดาว
 * วาดบน canvas เดียว (pointer-events: none) และหยุดวนเฟรมเมื่อไม่มีอนุภาค
 */
export function StarTrail() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      canvas.remove();
      return;
    }

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const parts: P[] = [];
    let raf = 0;
    let running = false;
    let last = 0;
    let lastX = -1;
    let lastY = -1;
    let pressed = false;

    const spawn = (x: number, y: number, burst = false) => {
      if (parts.length >= MAX) parts.splice(0, parts.length - MAX + 1);
      const angle = Math.random() * Math.PI * 2;
      const speed = burst ? 1.2 + Math.random() * 3.2 : 0.2 + Math.random() * 0.9;
      parts.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + (burst ? -0.6 : 0.25),
        life: 0,
        max: burst ? 38 + Math.random() * 22 : 26 + Math.random() * 20,
        size: burst ? 5 + Math.random() * 6 : 3 + Math.random() * 5,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        kind: Math.random() < 0.78 ? 0 : 1,
      });
      kick();
    };

    const frame = (t: number) => {
      const dt = Math.min(2, (t - last) / 16.67 || 1);
      last = t;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.max) {
          parts.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.035 * dt;
        p.rot += p.vr * dt;
        const k = 1 - p.life / p.max;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        if (p.kind === 0) drawStar(ctx, p.size * (0.4 + k * 0.6));
        else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.4 * k + 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (parts.length > 0) raf = requestAnimationFrame(frame);
      else {
        running = false;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    function kick() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    const onMove = (e: PointerEvent) => {
      // นิ้ว/ปากกา: ทิ้งดาวเฉพาะตอนลาก, เมาส์: ทิ้งตลอด
      if (e.pointerType !== 'mouse' && !pressed) return;
      if (lastX >= 0) {
        const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
        if (dist < 9) return;
        const n = Math.min(3, Math.ceil(dist / 28));
        for (let i = 0; i < n; i++) spawn(e.clientX - ((e.clientX - lastX) * i) / n, e.clientY - ((e.clientY - lastY) * i) / n);
      }
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onDown = (e: PointerEvent) => {
      pressed = true;
      lastX = e.clientX;
      lastY = e.clientY;
      for (let i = 0; i < 9; i++) spawn(e.clientX, e.clientY, true);
    };
    const onUp = () => {
      pressed = false;
      lastX = -1;
      lastY = -1;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      canvas.remove();
    };
  }, []);

  return null;
}
