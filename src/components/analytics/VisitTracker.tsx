'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const KEY = 'l5g_visit_at';
const WINDOW = 30 * 60 * 1000;

/**
 * ส่งสัญญาณ "เข้าเว็บ" 1 ครั้งต่อการเปิดเว็บ (เบราว์เซอร์จำไว้ 30 นาที ต่อบัญชีที่ล็อกอินอยู่)
 * ล็อกอินบัญชีใหม่ภายใน 30 นาที = ส่งใหม่ ให้บันทึกรู้ว่าเป็นใคร
 * เซิร์ฟเวอร์กันซ้ำอีกชั้น (ต่อบัญชี หรือต่อ IP ถ้าไม่มีบัญชี) จึงปั่นยอดด้วยการรีเฟรชหรือเปิดหลายแท็บไม่ได้
 */
export function VisitTracker() {
  const { user, isLoading } = useAuth();
  const uid = user?.id || '';

  useEffect(() => {
    if (isLoading) return;
    try {
      const [at, who = ''] = (localStorage.getItem(KEY) || '').split('|');
      if (who === uid && Date.now() - Number(at || 0) < WINDOW) return;
      localStorage.setItem(KEY, `${Date.now()}|${uid}`);
    } catch {
      /* ไม่มี localStorage: ปล่อยให้เซิร์ฟเวอร์กันซ้ำเอง */
    }
    fetch('/api/visit', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: location.pathname }),
    }).catch(() => {});
  }, [uid, isLoading]);
  return null;
}
