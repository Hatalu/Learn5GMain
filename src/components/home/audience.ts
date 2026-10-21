'use client';

import { useCallback, useEffect, useState } from 'react';

/** กลุ่มผู้ใช้ที่เลือกในหน้าแรก (จำไว้ในเครื่อง ใช้จัดลำดับป้ายและภารกิจลองใช้) */
export type Audience = 'parent' | 'teacher';

const KEY = 'l5g-audience';
const TRIED = 'l5g-tried';

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* โหมดส่วนตัว/ปิดที่เก็บข้อมูล: ใช้ได้แค่หน้านี้ */
  }
};

export function useAudience(): [Audience | null, (a: Audience) => void] {
  const [aud, setAud] = useState<Audience | null>(null);
  useEffect(() => {
    const v = read(KEY);
    if (v === 'parent' || v === 'teacher') setAud(v);
  }, []);
  const set = useCallback((a: Audience) => {
    setAud(a);
    write(KEY, a);
  }, []);
  return [aud, set];
}

/** ภารกิจลองใช้ที่กดไปแล้ว (นับตอนกดเข้าไปลอง) */
export function useTried(): [Set<string>, (id: string) => void] {
  const [tried, setTried] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const arr = JSON.parse(read(TRIED) || '[]');
      if (Array.isArray(arr)) setTried(new Set(arr.filter((x) => typeof x === 'string').slice(0, 40)));
    } catch {
      /* ค่าเสีย: เริ่มใหม่ */
    }
  }, []);
  const mark = useCallback((id: string) => {
    setTried((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      write(TRIED, JSON.stringify([...next]));
      return next;
    });
  }, []);
  return [tried, mark];
}

/** ป้ายโฆษณาที่ปิดไว้: ซ่อน 24 ชั่วโมงแล้วกลับมาใหม่ */
const PROMO = 'l5g-promo-hidden';
export const promoHidden = () => Number(read(PROMO) || 0) > Date.now();
export const hidePromo = () => write(PROMO, String(Date.now() + 24 * 3600 * 1000));
