'use client';

import React, { useEffect, useState } from 'react';
import { Crown, Layers, Users } from 'lucide-react';

/** แสดงตัวเลขเมื่อถึงยอดนี้แล้วเท่านั้น (ตัวเลขน้อยๆ ไม่ช่วยให้คนมั่นใจ) */
const MIN_SHOW = 10;

type Stats = { members: number; accounts: number; sets: number };
let shared: Promise<Stats> | null = null;

const n = (v: number) => v.toLocaleString('th-TH');

/** หลักฐานทางสังคม: ตัวเลขจริงจากฐานข้อมูล ไม่บวกเพิ่ม ยอดไหนยังน้อยก็ไม่แสดงยอดนั้น */
export function SocialProof({ className = '' }: { className?: string }) {
  const [st, setSt] = useState<Stats | null>(null);

  useEffect(() => {
    if (!shared) {
      shared = fetch('/api/stats/public')
        .then((r) => r.json())
        .catch(() => ({ members: 0, accounts: 0, sets: 0 }));
    }
    let off = false;
    shared.then((j) => !off && setSt(j));
    return () => {
      off = true;
    };
  }, []);

  if (!st) return null;
  const items = [
    st.members >= MIN_SHOW && { icon: Crown, text: `สมาชิก ${n(st.members)} คนใช้งานอยู่ตอนนี้`, c: '#ffcf3f' },
    st.accounts >= MIN_SHOW && { icon: Users, text: `บัญชีผู้ใช้ ${n(st.accounts)} บัญชี`, c: '#7fe3ff' },
    st.sets >= MIN_SHOW && { icon: Layers, text: `สร้างชุดคำถามแล้ว ${n(st.sets)} ชุด`, c: '#3fd6a8' },
  ].filter(Boolean) as { icon: typeof Crown; text: string; c: string }[];
  if (!items.length) return null;

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      {items.map((it) => (
        <span
          key={it.text}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-[3px] border-[#2a2350] bg-white text-[#2a2350] text-sm font-bold shadow-[0_3px_0_#2a2350]"
        >
          <span className="w-6 h-6 rounded-full border-2 border-[#2a2350] flex items-center justify-center" style={{ background: it.c }}>
            <it.icon className="w-3.5 h-3.5" strokeWidth={2.8} />
          </span>
          {it.text}
        </span>
      ))}
    </div>
  );
}
