'use client';

/**
 * ชิ้นส่วนกลางของเกมตัวอย่าง: วนคำถาม ตรวจคำตอบ คะแนน คอมโบ แถบบน และป้ายถูก/ผิด
 * เกมตัวอย่างใช้คำถามจริงที่ครูเลือก (หรือคำถามตัวอย่างของวิชา) เล่นได้เลยในหน้าเว็บ
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gsfx } from '@/lib/game-creator/gsound';
import type { GItem } from '@/lib/aigame/prompt';

export interface DemoProps {
  items: GItem[];
}

export interface DItem {
  q: string;
  choices: string[];
  correct: Set<number>;
}

/** ตัดเหลือข้อแบบเลือกตอบ ไม่เกิน max ตัวเลือก (เก็บข้อถูกไว้เสมอ) */
export function toDemo(items: GItem[], max = 4): DItem[] {
  return items
    .filter((it) => it.choices.length >= 2 && it.correct.length)
    .map((it) => {
      const idx = it.choices.map((_, i) => i);
      const right = idx.filter((i) => it.correct.includes(i));
      const wrong = idx.filter((i) => !it.correct.includes(i));
      const keep = [...right.slice(0, 1), ...wrong.slice(0, Math.max(1, max - 1))].sort((a, b) => a - b);
      return { q: it.q, choices: keep.map((i) => it.choices[i]), correct: new Set(keep.flatMap((i, k) => (it.correct.includes(i) ? [k] : []))) };
    });
}

export type Fb = { ok: boolean; key: number } | null;

/** วนคำถาม: answer(i) คืน true/false (null = กำลังล็อกระหว่างแอนิเมชัน) */
export function useLoop(items: GItem[], max = 4, holdMs = 750) {
  const pool = useMemo(() => toDemo(items, max), [items, max]);
  const [n, setN] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [fb, setFb] = useState<Fb>(null);
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const lock = useRef(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    setN(0);
    setWrong(new Set());
    lock.current = false;
  }, [pool]);
  const item = pool.length ? pool[n % pool.length] : null;

  const answer = useCallback(
    (ci: number): boolean | null => {
      if (!item || lock.current) return null;
      const ok = item.correct.has(ci);
      setFb({ ok, key: Date.now() });
      if (ok) {
        gsfx.correct();
        lock.current = true;
        setScore((s) => s + 100 + combo * 20);
        setCombo((c) => c + 1);
        timers.current.push(
          window.setTimeout(() => {
            lock.current = false;
            setWrong(new Set());
            setN((k) => k + 1);
          }, holdMs),
        );
      } else {
        gsfx.wrong();
        setCombo(0);
        setWrong((w) => new Set(w).add(ci));
      }
      return ok;
    },
    [item, combo, holdMs],
  );
  return { pool, item, n, score, combo, fb, wrong, answer };
}

/** แถบบน: คำถาม + คะแนน + คอมโบ */
export function Hud({ q, score, combo, tone = '#2a2350' }: { q: string; score: number; combo: number; tone?: string }) {
  return (
    <div className="ag-hud">
      <div className="ag-q" style={{ ['--t' as string]: tone }}>
        {q}
      </div>
      <div className="ag-score">
        <b>{score}</b>
        {combo > 1 && <span key={combo} className="ag-combo">x{combo}</span>}
      </div>
    </div>
  );
}

/** ป้ายถูก/ผิด เด้งกลางจอ */
export function Stamp({ fb }: { fb: Fb }) {
  if (!fb) return null;
  return (
    <span key={fb.key} className="ag-stamp" data-ok={fb.ok}>
      {fb.ok ? 'ถูกต้อง!' : 'ลองอีกนิด'}
    </span>
  );
}

export function Empty() {
  return <div className="ag-empty">ชุดนี้ไม่มีข้อแบบเลือกตอบให้เล่นในตัวอย่าง (เกมจริงจาก Gemini ใช้ได้ทุกข้อ)</div>;
}

/** ดาวประกายตกแต่ง (SVG) */
export function Spark({ className = '', c = '#fff' }: { className?: string; c?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill={c} />
    </svg>
  );
}

export const COLORS = ['#ff6b7a', '#4fb3ff', '#ffcf3f', '#3fd6a8', '#9b6cf0', '#ff9a3d'];

/** ตัวเลขสุ่มแบบมีเมล็ด (ตำแหน่งในฉากคงที่ต่อข้อ ไม่กระโดดตอนวาดใหม่) */
export function seeded(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** กำลังพิมพ์ในช่องกรอกของหน้า: ปุ่มลัดของเกมตัวอย่างต้องไม่แย่ง */
export function typing(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

/** ฟังปุ่มตัวเลข 1-9 */
export function useNumKeys(on: (i: number) => void, enabled = true) {
  const ref = useRef(on);
  ref.current = on;
  useEffect(() => {
    if (!enabled) return;
    const h = (e: KeyboardEvent) => {
      if (typing(e)) return;
      const d = /^Digit([1-9])$/.exec(e.code) || /^Numpad([1-9])$/.exec(e.code);
      if (d) ref.current(Number(d[1]) - 1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [enabled]);
}
