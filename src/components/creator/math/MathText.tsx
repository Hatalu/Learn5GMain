'use client';

import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { Rich } from '@/lib/game-creator/types';
import { prepTex } from '@/lib/mathTex';

const cache = new Map<string, string>();

/** แปลง LaTeX เป็น HTML ด้วย KaTeX (ปิดคำสั่งที่อันตรายด้วย trust:false) */
export function texToHtml(tex: string, display = false, big = true): string {
  const key = `${display ? 'd' : 'i'}${big ? 'b' : ''}:${tex}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let html: string;
  try {
    // big: เศษส่วนตัวใหญ่อ่านง่าย (แบบ \dfrac) แม้อยู่กลางประโยค
    html = katex.renderToString(big ? `\\displaystyle ${prepTex(tex)}` : prepTex(tex), { throwOnError: false, displayMode: display, trust: false, strict: 'ignore', maxSize: 20, maxExpand: 200, output: 'html' });
  } catch {
    html = '';
  }
  if (cache.size > 800) cache.clear();
  cache.set(key, html);
  return html;
}

export function MathInline({ tex, className, small }: { tex: string; className?: string; small?: boolean }) {
  const html = useMemo(() => texToHtml(tex, false, !small), [tex, small]);
  return <span className={className ?? 'l5g-math'} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** ข้อความผสมสูตรแบบบรรทัดเดียว/ย่อ (รายการข้อ การ์ดแม่แบบ) สูตรขนาดตัวอักษรปกติ ไม่ขึ้นเป็นโค้ด LaTeX */
export function MathLine({ value, className }: { value: Rich; className?: string }) {
  return (
    <span className={className}>
      {value.map((s, i) => (s.t === 'm' ? <MathInline key={i} tex={s.v} small className="l5g-math l5g-math-line" /> : <React.Fragment key={i}>{s.v}</React.Fragment>))}
    </span>
  );
}

/** แสดงข้อความผสมสูตร (ข้อความธรรมดาเป็น text node ปลอดภัย, สูตรผ่าน KaTeX) */
export function MathText({ value, className, placeholder }: { value: Rich; className?: string; placeholder?: string }) {
  if (!value?.length) return placeholder ? <span className={className} style={{ opacity: 0.45 }}>{placeholder}</span> : null;
  return (
    <span className={className} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      {value.map((s, i) => (s.t === 'm' ? <MathInline key={i} tex={s.v} /> : <React.Fragment key={i}>{s.v}</React.Fragment>))}
    </span>
  );
}
