'use client';

import { useEffect } from 'react';

const KEY = 'l5g_visit_at';
const WINDOW = 30 * 60 * 1000;

/**
 * ส่งสัญญาณ "เข้าเว็บ" 1 ครั้งต่อการเปิดเว็บ (เบราว์เซอร์จำไว้ 30 นาที)
 * เซิร์ฟเวอร์กันซ้ำอีกชั้นด้วย IP (1 IP ต่อ 30 นาที) จึงปั่นยอดด้วยการรีเฟรชหรือเปิดหลายแท็บไม่ได้
 */
export function VisitTracker() {
  useEffect(() => {
    try {
      const last = Number(localStorage.getItem(KEY) || 0);
      if (Date.now() - last < WINDOW) return;
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* ไม่มี localStorage: ปล่อยให้เซิร์ฟเวอร์กันซ้ำเอง */
    }
    fetch('/api/visit', { method: 'POST', keepalive: true }).catch(() => {});
  }, []);
  return null;
}
