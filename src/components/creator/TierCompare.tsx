'use client';

import React from 'react';
import { Check, Crown } from 'lucide-react';
import { TIER_ROWS } from '@/lib/game-creator/quota';

/** ตารางเทียบ "บัญชีฟรี" กับ "สมาชิก" (ตัวเลขมาจาก lib/game-creator/quota.ts ที่เดียว) */
export function TierCompare({ className = '' }: { className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border-[3px] border-[#2a2350] bg-white text-[#2a2350] shadow-[0_5px_0_#2a2350] ${className}`}>
      <div className="grid grid-cols-[1.15fr_1fr_1fr] bg-[#ffe9a8] text-xs font-extrabold sm:text-sm">
        <span className="p-2.5 sm:p-3" />
        <span className="p-2.5 text-center sm:p-3">บัญชีฟรี</span>
        <span className="flex items-center justify-center gap-1 p-2.5 text-center sm:p-3">
          <Crown className="h-4 w-4 text-orange-500" /> สมาชิก
        </span>
      </div>
      {TIER_ROWS.map((r) => (
        <div key={r.label} className="grid grid-cols-[1.15fr_1fr_1fr] border-t-2 border-[#2a2350]/15 text-xs font-semibold sm:text-[13px]">
          <span className="p-2.5 font-bold sm:p-3">{r.label}</span>
          <span className="p-2.5 text-center sm:p-3">{r.free}</span>
          <span className="flex items-center justify-center gap-1 bg-[#e9fbf3] p-2.5 text-center font-extrabold text-emerald-800 sm:p-3">
            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3.5} />
            {r.member}
          </span>
        </div>
      ))}
    </div>
  );
}
