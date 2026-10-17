import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const TTL = 10 * 60 * 1000;
let cache: { at: number; body: { members: number; accounts: number; sets: number } } | null = null;

/**
 * ตัวเลขจริงสำหรับแสดงหลักฐานทางสังคม (ไม่มีข้อมูลส่วนตัว นับอย่างเดียว)
 * - members: บัญชีที่สมาชิกยังไม่หมดอายุ (ไม่นับ Dev และบัญชีทดลอง)
 * - accounts: บัญชีทั้งหมด (ไม่นับ Dev และบัญชีทดลอง)
 * - sets: ชุดคำถามที่ผู้ใช้สร้าง
 * แคชไว้ 10 นาที กันคนยิงถี่แล้วไปกดฐานข้อมูล
 */
export async function GET() {
  if (!cache || Date.now() - cache.at > TTL) {
    try {
      const admin = getAdminClient();
      const base = () => admin.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'dev').not('username', 'like', 'trial\\_%');
      const [m, a, g] = await Promise.all([
        base().gt('premium_until', new Date().toISOString()),
        base(),
        admin.from('user_games').select('id', { count: 'exact', head: true }),
      ]);
      cache = { at: Date.now(), body: { members: m.count || 0, accounts: a.count || 0, sets: g.count || 0 } };
    } catch {
      return NextResponse.json({ members: 0, accounts: 0, sets: 0 });
    }
  }
  return NextResponse.json(cache.body, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300' } });
}
