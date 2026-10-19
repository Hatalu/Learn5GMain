'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export const PALETTE = [
  '#2a2350', '#475569', '#94a3b8', '#ffffff',
  '#7c5cf0', '#a78bfa', '#ede7ff', '#e8456b',
  '#ff6b7a', '#ff9fb7', '#ffe4e8', '#e07a12',
  '#ff9a3d', '#ffd166', '#fff1dc', '#2f9e6e',
  '#34d399', '#d1fae5', '#2a73d9', '#7cc6ff',
  '#e0f2fe', '#0f766e', '#b07a4f', '#fef3c7',
];

/** ป๊อปอัปเล็กลอยใต้ปุ่ม (วางผ่าน portal ไม่โดนแถบเครื่องมือตัดขอบ) ปิดเมื่อคลิกข้างนอก/กด Esc */
export function Pop({
  button,
  children,
  title,
  width = 248,
  className,
  active,
}: {
  button: React.ReactNode;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  title: string;
  width?: number;
  className?: string;
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);

  const place = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const vw = window.innerWidth;
    const left = Math.max(8, Math.min(vw - width - 8, r.left + r.width / 2 - width / 2));
    const below = r.bottom + 8;
    const h = box.current?.offsetHeight ?? 260;
    const top = below + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 8) : below;
    setPos({ left, top });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const raf = requestAnimationFrame(place);
    const out = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!box.current?.contains(t) && !btn.current?.contains(t)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', out, true);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', place);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('pointerdown', out, true);
      document.removeEventListener('keydown', key);
      window.removeEventListener('resize', place);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button ref={btn} type="button" title={title} aria-label={title} aria-expanded={open} className={cn('st-tb', className)} data-on={open || active} onClick={() => setOpen((o) => !o)}>
        {button}
      </button>
      {open &&
        createPortal(
          <div ref={box} className="st-pop" role="dialog" aria-label={title} style={{ left: pos.left, top: pos.top, width }}>
            <p className="st-pop-title">{title}</p>
            {typeof children === 'function' ? children(() => setOpen(false)) : children}
          </div>,
          document.body
        )}
    </>
  );
}

/** ช่องเลือกสี: ชุดสีสำเร็จ + เลือกเองจากวงล้อ (+ ไม่มีสี ถ้าอนุญาต) */
export function ColorGrid({ value, onChange, allowNone }: { value: string; onChange: (c: string) => void; allowNone?: boolean }) {
  const hex6 = /^#[0-9a-fA-F]{6}/.test(value) ? value.slice(0, 7) : '#7c5cf0';
  return (
    <div>
      <div className="grid grid-cols-8 gap-1.5">
        {allowNone && (
          <button type="button" className="st-swatch st-swatch-none" data-on={!value} title="ไม่มีสี" aria-label="ไม่มีสี" onClick={() => onChange('')} />
        )}
        {PALETTE.map((c) => (
          <button key={c} type="button" className="st-swatch" data-on={value.toLowerCase() === c} style={{ background: c }} title={c} aria-label={`สี ${c}`} onClick={() => onChange(c)} />
        ))}
      </div>
      <label className="st-custom-color">
        <input type="color" value={hex6} onChange={(e) => onChange(e.target.value)} />
        <span>เลือกสีเอง</span>
        <code>{value || 'ไม่มีสี'}</code>
      </label>
    </div>
  );
}

/** ปุ่มสีบนแถบเครื่องมือ */
export function ColorPop({ value, onChange, title, allowNone, icon }: { value: string; onChange: (c: string) => void; title: string; allowNone?: boolean; icon?: React.ReactNode }) {
  return (
    <Pop
      title={title}
      button={
        <span className="st-colorbtn">
          {icon}
          <i style={{ background: value || 'repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0 / 10px 10px' }} />
        </span>
      }
    >
      <ColorGrid value={value} onChange={onChange} allowNone={allowNone} />
    </Pop>
  );
}

export function Slider({ label, value, min, max, step = 1, onChange, unit = '' }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <label className="st-slider">
      <span className="flex justify-between text-xs font-bold">
        <span>{label}</span>
        <span className="tabular-nums opacity-70">
          {Math.round(value * 100) / 100}
          {unit}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function Stepper({ value, onChange, min, max, step = 1, label }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; label: string }) {
  const [txt, setTxt] = useState(String(Math.round(value)));
  useEffect(() => setTxt(String(Math.round(value))), [value]);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <span className="st-stepper" title={label}>
      <button type="button" aria-label={`ลด${label}`} onClick={() => onChange(clamp(Math.round(value) - step))}>
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        value={txt}
        onChange={(e) => setTxt(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
        onBlur={() => {
          const n = Number(txt);
          if (Number.isFinite(n) && n > 0) onChange(clamp(n));
          else setTxt(String(Math.round(value)));
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
      />
      <button type="button" aria-label={`เพิ่ม${label}`} onClick={() => onChange(clamp(Math.round(value) + step))}>
        <Plus className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: React.ReactNode; title?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="st-seg">
      {options.map((o) => (
        <button key={o.id} type="button" data-on={o.id === value} title={o.title} aria-label={o.title} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** แทรกข้อความล้วนตอนวาง (กันรูปแบบ/HTML จากที่อื่นติดมาในช่องแก้ข้อความ) */
export function pastePlain(e: React.ClipboardEvent) {
  e.preventDefault();
  const t = e.clipboardData.getData('text/plain');
  document.execCommand('insertText', false, t);
}
