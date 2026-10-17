'use client';

import './coach.css';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * ลูกศรสอนเล่น: ชี้ปุ่มที่ควรกดทีละขั้น พอผู้เล่นทำครบ 1-2 รอบ ลูกศรก็หายไปเองในตานั้น
 * - ไม่บังคับให้ทำตามเป๊ะ: ทำขั้นถัดไปก่อน (หรือทำด้วยวิธีอื่นที่ได้ผลเหมือนกัน) ก็ข้ามไปขั้นนั้นเลย
 * - doneIf: เงื่อนไขที่แปลว่าขั้นนี้ผ่านแล้ว (เช่น แผงคำถามเปิดอยู่แล้ว)
 * - when: ขั้นที่ทำได้เฉพาะบางจังหวะ ยังไม่ถึงจังหวะ = ซ่อนลูกศรรอไว้ (ใส่ optional ด้วย = ข้ามไปขั้นถัดไปแทน)
 */

export interface CoachStep {
  id: string;
  /** ตัวเลือก CSS (ใช้ตัวแรกที่เจอและมองเห็น) ค้นในกรอบของเกม */
  target: string | string[];
  text: string;
  /** ข้อความแยกตามตัวเลือก CSS แต่ละตัวใน target (ลำดับเดียวกัน) ถ้าไม่ใส่ใช้ text */
  texts?: string[];
  doneIf?: () => boolean;
  when?: () => boolean;
  optional?: boolean;
}

export interface Coach {
  step: CoachStep | null;
  /** แจ้งว่าผู้เล่นทำสิ่งนี้แล้ว (id ของขั้น) */
  hit: (id: string) => void;
  stop: () => void;
}

export function useCoach(steps: CoachStep[], opts: { loops?: number; active?: boolean } = {}): Coach {
  const loops = opts.loops ?? 1;
  const [state, setState] = useState({ i: 0, loop: 0, off: false });
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const done = state.off || state.loop >= loops || opts.active === false;

  /** ขั้นที่โชว์อยู่ (ข้ามขั้นที่ยังทำไม่ได้และไม่บังคับ) */
  const shownIndex = (i: number) => {
    const list = stepsRef.current;
    for (let k = i; k < list.length; k++) {
      const s = list[k];
      if (s.when && !s.when()) {
        if (s.optional) continue;
        return k;
      }
      return k;
    }
    return -1;
  };

  const advanceTo = useCallback(
    (next: number) =>
      setState((st) => {
        if (next >= stepsRef.current.length) return { i: 0, loop: st.loop + 1, off: st.off };
        return { ...st, i: next };
      }),
    []
  );

  const hit = useCallback(
    (id: string) => {
      setState((st) => {
        if (st.off || st.loop >= loops) return st;
        const list = stepsRef.current;
        // ขั้นปัจจุบันหรือขั้นหลังจากนั้นในรอบเดียวกัน
        const k = list.findIndex((s, idx) => idx >= st.i && s.id === id);
        if (k < 0) return st;
        if (k + 1 >= list.length) return { i: 0, loop: st.loop + 1, off: st.off };
        return { ...st, i: k + 1 };
      });
    },
    [loops]
  );

  const stop = useCallback(() => setState((st) => ({ ...st, off: true })), []);

  // ขั้นที่เงื่อนไขผ่านแล้ว: เลื่อนไปเอง
  const idx = done ? -1 : shownIndex(state.i);
  const cur = idx >= 0 ? steps[idx] : null;
  const curDone = !!cur?.doneIf?.();
  const waiting = !!cur?.when && !cur.when();
  // ผู้เล่นข้ามไปทำขั้นหลังๆ ก่อนแล้ว (เช่น เปิดแผงคำถามเองโดยยังไม่ได้ลากตัวละคร): ข้ามไปต่อจากขั้นนั้นเลย ไม่บังคับลำดับ
  let jump = -1;
  if (!done && idx >= 0) {
    for (let k = steps.length - 1; k > idx; k--) {
      if (steps[k].doneIf?.()) {
        jump = k;
        break;
      }
    }
  }
  useEffect(() => {
    if (done) return;
    if (idx < 0) {
      advanceTo(steps.length); // ที่เหลือทำไม่ได้ทั้งหมด: นับว่าจบรอบ
      return;
    }
    if (jump >= 0) advanceTo(jump + 1);
    else if (curDone) advanceTo(idx + 1);
  });

  return { step: done || curDone || waiting || jump >= 0 ? null : cur, hit, stop };
}

type Box = { x: number; y: number; w: number; h: number; k: number; group: boolean };

/** ลูกศรหนาๆ ชี้เป้าหมาย + ข้อความสั้น (ลอยเหนือทุกอย่าง ไม่บังการกด) */
export function CoachArrow({ coach, root }: { coach: Coach; root: React.RefObject<HTMLElement> }) {
  const step = coach.step;
  const [box, setBox] = useState<Box | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!step) {
      setBox(null);
      return;
    }
    let raf = 0;
    let iv = 0;
    const find = () => {
      const base = root.current || document.body;
      const sels = Array.isArray(step.target) ? step.target : [step.target];
      for (let k = 0; k < sels.length; k++) {
        const sel = sels[k];
        let els: HTMLElement[] = [];
        try {
          els = Array.from(base.querySelectorAll<HTMLElement>(sel));
        } catch {
          continue; // เบราว์เซอร์เก่าไม่รองรับตัวเลือกนี้ (เช่น :has)
        }
        for (const el of els) {
          const r = el.getBoundingClientRect();
          if (r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < window.innerHeight) return { x: r.left, y: r.top, w: r.width, h: r.height, k, group: /l5g-(qp-)?choices/.test(sel) };
        }
      }
      return null;
    };
    const tick = () => {
      const b = find();
      setBox((old) => (!b ? null : old && Math.abs(old.x - b.x) < 1 && Math.abs(old.y - b.y) < 1 && Math.abs(old.w - b.w) < 1 && old.k === b.k ? old : b));
    };
    tick();
    // วัดตำแหน่งซ้ำ (เป้าหมายขยับ/เปลี่ยนขนาดได้)
    iv = window.setInterval(tick, 160);
    raf = requestAnimationFrame(tick);
    return () => {
      clearInterval(iv);
      cancelAnimationFrame(raf);
    };
  }, [step, root]);

  if (!mounted || !step || !box) return null;
  const vw = window.innerWidth;
  // เป้าอยู่ครึ่งบนของจอ = ลูกศรอยู่ใต้เป้าชี้ขึ้น / ครึ่งล่าง = อยู่เหนือเป้าชี้ลง
  const below = box.y + box.h / 2 < window.innerHeight * 0.42;
  const cx = Math.max(40, Math.min(vw - 40, box.x + box.w / 2));
  // กลุ่มตัวเลือก: ลูกศรอยู่นอกกรอบ ไม่แตะข้อใดข้อหนึ่ง (กันเหมือนบอกคำตอบ)
  const gap = box.group ? 22 : 4;
  const ay = below ? box.y + box.h + gap : box.y - gap;
  const text = step.texts?.[box.k] ?? step.text;
  const bubbleX = Math.max(10, Math.min(vw - 230, cx - 110));

  return createPortal(
    <div className="cx-layer" aria-live="polite">
      <span className="cx-ring" style={{ left: box.x - 6, top: box.y - 6, width: box.w + 12, height: box.h + 12 }} />
      <span className="cx-arrow" data-dir={below ? 'up' : 'down'} style={{ left: cx, top: ay }} key={step.id}>
        <svg viewBox="0 0 64 80" width="70" height="88" aria-hidden="true">
          <path d="M32 76 L6 46 L22 46 L22 6 Q22 2 26 2 L38 2 Q42 2 42 6 L42 46 L58 46 Z" fill="#ffd84a" stroke="#2a2350" strokeWidth="5" strokeLinejoin="round" />
          <path d="M28 10 L28 40" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.75" />
          <circle cx="26" cy="54" r="2.6" fill="#2a2350" />
          <circle cx="38" cy="54" r="2.6" fill="#2a2350" />
          <path d="M28 60 Q32 64 36 60" fill="none" stroke="#2a2350" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
      <span className="cx-bubble" data-dir={below ? 'up' : 'down'} style={{ left: bubbleX, top: below ? ay + 92 : ay - 92 - 50 }} key={`b${step.id}`}>
        {text}
        <button type="button" className="cx-x" onClick={coach.stop} aria-label="ปิดการสอนเล่น" title="ไม่ต้องสอนแล้ว">
          <X className="w-3.5 h-3.5" strokeWidth={3} />
        </button>
      </span>
    </div>,
    document.body
  );
}

/** ตัวเลือกของแผงคำถามที่เปิดอยู่ (ชี้ทั้งกลุ่ม ไม่ชี้ข้อใดข้อหนึ่ง จะได้ไม่เหมือนบอกคำตอบ) */
export const DOCK_CHOICES = ['.gm-dock[data-open="true"] .l5g-qp-choices', '.rc-pad-in .l5g-qp-choices'];
