import React from 'react';
import type { StickerCat, StickerDef } from '../stickers';

/** ชุดเครื่องมือวาดสติกเกอร์ชุดเพิ่ม: กรอบ 0-100 เส้นหมึกหนา พื้นหลังโปร่งใส (ไม่มีสี่เหลี่ยมพื้น) */
export const O = '#2a2350';
export const s = { stroke: O, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
export const FONT = { fontFamily: 'var(--font-mitr), sans-serif' };

export const P = (d: string, f = 'none', w?: number) => <path d={d} fill={f} strokeWidth={w} />;
export const C = (cx: number, cy: number, r: number, f = '#fff', w?: number) => <circle cx={cx} cy={cy} r={r} fill={f} strokeWidth={w} />;
export const E = (cx: number, cy: number, rx: number, ry: number, f = '#fff', w?: number) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={f} strokeWidth={w} />;
export const R = (x: number, y: number, w: number, h: number, f = '#fff', rx = 6, sw?: number) => <rect x={x} y={y} width={w} height={h} rx={rx} fill={f} strokeWidth={sw} />;
/** จุด/ไฮไลต์ไม่มีเส้นขอบ */
export const D = (cx: number, cy: number, r: number, f = O) => <circle cx={cx} cy={cy} r={r} fill={f} stroke="none" />;

export const eyes = (y = 48, dx = 13, cx = 50, r = 4.5) => (
  <>
    {D(cx - dx, y, r)}
    {D(cx + dx, y, r)}
    {D(cx - dx + 1.5, y - 1.5, r * 0.32, '#fff')}
    {D(cx + dx + 1.5, y - 1.5, r * 0.32, '#fff')}
  </>
);
export const cheeks = (y = 58, dx = 22, cx = 50) => (
  <>
    <ellipse cx={cx - dx} cy={y} rx="6" ry="4" fill="#ff9fb7" opacity=".8" stroke="none" />
    <ellipse cx={cx + dx} cy={y} rx="6" ry="4" fill="#ff9fb7" opacity=".8" stroke="none" />
  </>
);
export const smile = (y = 58, cx = 50, w = 7) => P(`M${cx - w} ${y} Q${cx} ${y + w} ${cx + w} ${y}`, 'none', 3.5);
/** หน้ายิ้มน่ารักมาตรฐาน */
export const face = (y = 50, cx = 50, dx = 12) => (
  <>
    {eyes(y, dx, cx, 4)}
    {cheeks(y + 9, dx + 8, cx)}
    {smile(y + 8, cx, 6)}
  </>
);

export function star(n: number, inner: number, cx = 50, cy = 50, R0 = 50) {
  return Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 ? inner : R0;
    const a = ((-90 + (180 / n) * i) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

export const mk = (cat: StickerCat) => (id: string, label: string, tags: string, el: React.ReactNode): StickerDef => ({ id, label, cat, tags, el: <g {...s}>{el}</g> });
