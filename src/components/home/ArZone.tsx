'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useOffscreen } from './useOffscreen';
import z from './zones.module.css';

/** ท่าเล่นจริงของเกม AR แต่ละเกม (ภาพเคลื่อนไหววาดเอง ไม่ใช่คลิปจากการเล่นจริง) */
const GAMES = [
  { id: 'space', name: 'สงครามอวกาศ', how: 'ยกมือเล็ง ค้างไว้จนล็อกเป้า', c: '#2fb8ff' },
  { id: 'magic', name: 'อาณาจักรเวทมนตร์', how: 'วาดวงล้อมคำตอบด้วยมือ', c: '#9b6cf0' },
  { id: 'ocean', name: 'ผู้พิทักษ์มหาสมุทร', how: 'ขยับทั้งตัวไปเลนคำตอบ', c: '#22b8a6' },
  { id: 'ghost', name: 'นักล่าผี', how: 'ส่องไฟหา แล้วปัดมือจับ', c: '#ff9a3d' },
] as const;

function Gesture({ id }: { id: (typeof GAMES)[number]['id'] }) {
  return (
    <svg viewBox="0 0 120 90" className={z.gesture} data-g={id} aria-hidden="true">
      <circle cx="92" cy="24" r="12" className={z.target} />
      <g className={z.kid}>
        <circle cx="50" cy="32" r="11" fill="#ffd1aa" stroke="#2a2350" strokeWidth="3" />
        <path d="M38 88 V62 Q38 48 50 48 Q62 48 62 62 V88 Z" fill="#fff8ec" stroke="#2a2350" strokeWidth="3" />
        <path d="M40 58 L26 72" stroke="#2a2350" strokeWidth="5" strokeLinecap="round" />
        <g className={z.arm}>
          <path d="M60 56 L80 34" stroke="#2a2350" strokeWidth="5" strokeLinecap="round" />
          <circle cx="82" cy="32" r="5" fill="#ffd1aa" stroke="#2a2350" strokeWidth="2.5" />
        </g>
      </g>
    </svg>
  );
}

/** โซนเกมขยับตัว: วางท้ายหน้าและบอกตรงๆ ว่ากำลังทดสอบ (ยังไม่เคยลองกับกล้อง/เด็กจริง) */
export function ArZone({ className = '' }: { className?: string }) {
  const [ref, off] = useOffscreen<HTMLElement>();
  return (
    <section ref={ref} data-off={off || undefined} className={`${z.panel} ${z.arZone} ${className}`} aria-labelledby="ar-title">
      <div className={z.head}>
        <div>
          <span className={z.tag}>กำลังทดสอบ</span>
          <h2 id="ar-title" className="font-display">ลุกขึ้นมาขยับตัวเล่น</h2>
          <p>ใช้กล้องเครื่องเดียว ตอบคำถามด้วยท่าทาง</p>
        </div>
        <Link href="/create#templates" className={z.go}>
          ลองเลือกชุดคำถาม <ChevronRight className="w-4 h-4" strokeWidth={3} />
        </Link>
      </div>
      <div className={z.arGrid}>
        {GAMES.map((g) => (
          <div key={g.id} className={z.arCard} style={{ ['--c' as string]: g.c }}>
            <Gesture id={g.id} />
            <h3 className="font-display">{g.name}</h3>
            <p>{g.how}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
