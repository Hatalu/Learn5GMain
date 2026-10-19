'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Grid3x3, Maximize, Minimize, Pause, Play, X } from 'lucide-react';
import type { Design } from '@/lib/studio/doc';
import { PageThumb, PageView } from './render';

type Fx = 'slide' | 'fade' | 'zoom' | 'none';
const FX: { id: Fx; label: string }[] = [
  { id: 'slide', label: 'เลื่อน' },
  { id: 'fade', label: 'จางเข้า' },
  { id: 'zoom', label: 'ซูม' },
  { id: 'none', label: 'ไม่มี' },
];
const AUTO = [0, 5, 10, 20];

/**
 * โหมดนำเสนอ (แบบ Canva): เต็มจอทีละหน้า ลูกศร/คลิก/ปัดนิ้วเปลี่ยนหน้า เลือกเอฟเฟกต์เปลี่ยนหน้า เล่นอัตโนมัติได้
 * แป้น: ซ้าย/ขวา/Space/PageUp/PageDown เปลี่ยนหน้า, F เต็มจอ, G ภาพรวมทุกหน้า, Esc ออก
 */
export function Presenter({ doc, start, onClose }: { doc: Design; start: number; onClose: () => void }) {
  const W = doc.size.w;
  const H = doc.size.h;
  const n = doc.pages.length;
  const [i, setI] = useState(Math.min(start, n - 1));
  const [dir, setDir] = useState<1 | -1>(1);
  const [fx, setFx] = useState<Fx>('slide');
  const [auto, setAuto] = useState(0);
  const [grid, setGrid] = useState(false);
  const [full, setFull] = useState(false);
  const [idle, setIdle] = useState(false);
  const [vp, setVp] = useState({ w: 1200, h: 800 });
  const box = useRef<HTMLDivElement>(null);
  const touch = useRef<number | null>(null);
  const idleT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback(
    (k: number) => {
      setI((cur) => {
        const nx = Math.max(0, Math.min(n - 1, k));
        if (nx !== cur) setDir(nx > cur ? 1 : -1);
        return nx;
      });
    },
    [n]
  );

  const toggleFull = useCallback(() => {
    const el = box.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.().catch(() => undefined);
    else document.exitFullscreen?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    const size = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    const fs = () => setFull(!!document.fullscreenElement);
    size();
    window.addEventListener('resize', size);
    document.addEventListener('fullscreenchange', fs);
    box.current?.requestFullscreen?.().catch(() => undefined);
    return () => {
      window.removeEventListener('resize', size);
      document.removeEventListener('fullscreenchange', fs);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault();
        go(i + 1);
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) {
        e.preventDefault();
        go(i - 1);
      } else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(n - 1);
      else if (e.key.toLowerCase() === 'f') toggleFull();
      else if (e.key.toLowerCase() === 'g') setGrid((g) => !g);
      else if (e.key === 'Escape' && !document.fullscreenElement) onClose();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [i, n, go, onClose, toggleFull]);

  // เล่นอัตโนมัติ: จบหน้าสุดท้ายแล้วหยุด
  useEffect(() => {
    if (!auto || grid) return;
    if (i >= n - 1) {
      setAuto(0);
      return;
    }
    const t = setTimeout(() => go(i + 1), auto * 1000);
    return () => clearTimeout(t);
  }, [auto, i, n, go, grid]);

  const wake = () => {
    setIdle(false);
    if (idleT.current) clearTimeout(idleT.current);
    idleT.current = setTimeout(() => setIdle(true), 2600);
  };
  useEffect(() => {
    wake();
    return () => {
      if (idleT.current) clearTimeout(idleT.current);
    };
  }, []);

  const s = Math.min((vp.w - 32) / W, (vp.h - 32) / H);

  return createPortal(
    <div
      ref={box}
      className="pv-root"
      data-idle={idle && !grid}
      onMouseMove={wake}
      onTouchStart={(e) => {
        touch.current = e.touches[0].clientX;
        wake();
      }}
      onTouchEnd={(e) => {
        const x0 = touch.current;
        touch.current = null;
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1));
      }}
    >
      {grid ? (
        <div className="pv-grid">
          {doc.pages.map((p, k) => (
            <button key={p.id} type="button" className="pv-cell" data-on={k === i} onClick={() => (go(k), setGrid(false))}>
              <PageThumb page={p} W={W} H={H} width={W >= H ? 260 : 180} />
              <span>{k + 1}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="pv-stage" onClick={(e) => (e.clientX > window.innerWidth / 3 ? go(i + 1) : go(i - 1))}>
          <div key={doc.pages[i].id} className="pv-slide" data-fx={fx} data-dir={dir} style={{ width: W * s, height: H * s }}>
            <div style={{ width: W, height: H, transform: `scale(${s})`, transformOrigin: '0 0' }}>
              <PageView page={doc.pages[i]} W={W} H={H} />
            </div>
          </div>
        </div>
      )}

      <div className="pv-bar" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => go(i - 1)} disabled={i === 0} aria-label="หน้าก่อน">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="pv-count">
          {i + 1} / {n}
        </span>
        <button type="button" onClick={() => go(i + 1)} disabled={i >= n - 1} aria-label="หน้าถัดไป">
          <ChevronRight className="w-5 h-5" />
        </button>
        <span className="pv-sep" />
        <button type="button" onClick={() => setGrid(!grid)} data-on={grid} title="ดูทุกหน้า (G)" aria-label="ดูทุกหน้า">
          <Grid3x3 className="w-5 h-5" />
        </button>
        <select value={fx} onChange={(e) => setFx(e.target.value as Fx)} aria-label="เอฟเฟกต์เปลี่ยนหน้า" title="เอฟเฟกต์เปลี่ยนหน้า">
          {FX.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setAuto(auto ? 0 : 5)} data-on={!!auto} title="เล่นอัตโนมัติ" aria-label="เล่นอัตโนมัติ">
          {auto ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        {!!auto && (
          <select value={auto} onChange={(e) => setAuto(Number(e.target.value))} aria-label="วินาทีต่อหน้า">
            {AUTO.filter(Boolean).map((v) => (
              <option key={v} value={v}>
                {v} วิ/หน้า
              </option>
            ))}
          </select>
        )}
        <button type="button" onClick={toggleFull} title="เต็มจอ (F)" aria-label="เต็มจอ">
          {full ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>
        <button type="button" onClick={onClose} title="ออก (Esc)" aria-label="ออกจากโหมดนำเสนอ" className="pv-exit">
          <X className="w-5 h-5" /> ออก
        </button>
      </div>
      <div className="pv-progress" style={{ width: `${((i + 1) / n) * 100}%` }} />
    </div>,
    document.body
  );
}
