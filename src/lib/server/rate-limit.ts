import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

/** จำกัดความถี่ในหน่วยความจำ (ด่านแรก/สำรอง) คืน true ถ้ายังอยู่ในโควตา */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 5000) {
    Array.from(buckets.entries()).forEach(([k, v]) => {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    });
  }
  return true;
}

const SALT = () => process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'l5g';
const hashKey = (k: string) => crypto.createHash('sha256').update(`rl:${SALT()}:${k}`).digest('base64url').slice(0, 32);

/**
 * จำกัดความถี่แบบใช้ร่วมกันทุกเครื่อง (ตาราง rate_limits ผ่านฟังก์ชัน rl_hit)
 * ถ้ายังไม่ได้รัน migration 013 จะใช้ตัวนับในหน่วยความจำแทน
 */
export async function limit(key: string, max: number, windowMs: number): Promise<boolean> {
  if (!rateLimit(key, max, windowMs)) return false; // ตัดรอบเร็วก่อนถึงฐานข้อมูล
  try {
    const { data, error } = await getAdminClient().rpc('rl_hit', {
      p_key: hashKey(key),
      p_max: max,
      p_window_seconds: Math.ceil(windowMs / 1000),
    });
    if (error) return true; // ฐานข้อมูลยังไม่พร้อม: ใช้ผลจากตัวนับในหน่วยความจำ
    return data !== false;
  } catch {
    return true;
  }
}

/**
 * IP ของผู้เรียก: บน Vercel ใช้ x-real-ip / x-vercel-forwarded-for (Vercel ตั้งเอง ปลอมไม่ได้)
 * ไม่เชื่อค่าแรกของ x-forwarded-for ที่ผู้ใช้ส่งมาเองได้
 */
export function clientIp(req: NextRequest): string {
  const v = req.headers.get('x-vercel-forwarded-for') || req.headers.get('x-real-ip');
  if (v) return v.split(',')[0].trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    return parts[parts.length - 1] || 'unknown'; // ตัวท้ายสุด = พร็อกซีที่เชื่อถือได้ใส่ให้
  }
  return 'unknown';
}

/**
 * คำขอที่เปลี่ยนสถานะต้องมาจากหน้าเว็บของเราเท่านั้น (กัน CSRF และสคริปต์จากเว็บอื่น)
 * เบราว์เซอร์ส่ง Origin มากับ POST เสมอ จึงบังคับให้ต้องมีและต้องตรงกับโดเมนเรา
 */
export function isSameOrigin(req: NextRequest): boolean {
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return false;
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}
