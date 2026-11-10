import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { clientIp, isSameOrigin, limit } from '@/lib/server/rate-limit';
import { cleanVisitPath, deviceLabel } from '@/lib/visit-device';

export const dynamic = 'force-dynamic';

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|curl|wget|python|axios|node-fetch|monitor|preview/i;
const WINDOW_MS = 30 * 60 * 1000;

/**
 * นับการเข้าเว็บ: ผู้มีบัญชีนับ 1 ครั้งต่อบัญชีต่อ 30 นาที, ไม่มีบัญชีนับ 1 ครั้งต่อ IP ต่อ 30 นาที (กันปั่นยอด)
 * แยกตามบัญชีเพื่อให้นักเรียนหลายคนที่ใช้เน็ตโรงเรียน (IP เดียวกัน) ขึ้นในบันทึกครบทุกคน
 * ไม่นับบอท และไม่นับบัญชี Dev ไม่เก็บ IP/user-agent เต็มลงฐานข้อมูล (เก็บแค่ชนิดเครื่องแบบหยาบ + หน้าแรกที่เข้า)
 */
export async function POST(req: NextRequest) {
  const ok = (counted: boolean) => NextResponse.json({ counted });
  if (!isSameOrigin(req)) return ok(false);
  const ua = req.headers.get('user-agent') || '';
  if (BOT.test(ua)) return ok(false);

  const ip = clientIp(req);
  // ยังไม่รู้ IP (ไม่ควรเกิดบนเว็บจริง) ไม่นับ เพื่อไม่ให้ทุกคนรวมเป็นคนเดียว
  if (ip === 'unknown') return ok(false);

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from('profiles').select('role, username').eq('id', user.id).maybeSingle();
      if (p?.role === 'dev') return ok(false);
      // บัญชีทดลองชั่วคราว นับเป็นผู้เยี่ยมชม
      if (!String(p?.username || '').startsWith('trial_')) userId = user.id;
    }
  } catch {
    /* นับเป็นผู้เยี่ยมชม */
  }

  // ตัวกันซ้ำ: ครั้งแรกใน 30 นาทีผ่าน ครั้งต่อไปถูกตัดทิ้ง (ใช้ร่วมกันทุกเครื่องเซิร์ฟเวอร์)
  if (!(await limit(userId ? `visit30:u:${userId}` : `visit30:${ip}`, 1, WINDOW_MS))) return ok(false);

  let path: string | null = null;
  try {
    path = cleanVisitPath((await req.json())?.path);
  } catch {
    /* ไม่มี body */
  }

  const admin = getAdminClient();
  let { error } = await admin.from('site_visits').insert({ user_id: userId, device: deviceLabel(ua), path });
  // ยังไม่ได้รัน migration 028 (ไม่มีคอลัมน์ device/path): บันทึกแบบเดิม
  if (error) ({ error } = await admin.from('site_visits').insert({ user_id: userId }));
  return ok(!error);
}
