import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { clientIp, isSameOrigin, limit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|curl|wget|python|axios|node-fetch|monitor|preview/i;
const WINDOW_MS = 30 * 60 * 1000;

/**
 * นับการเข้าเว็บ: 1 IP นับได้ 1 ครั้งต่อ 30 นาที (กันปั่นยอด) ทั้งผู้ที่ล็อกอินและไม่ล็อกอิน
 * ไม่นับบอท และไม่นับบัญชี Dev (ไม่ให้ยอดเพี้ยนจากเจ้าของเว็บ) ไม่เก็บ IP ลงฐานข้อมูล
 */
export async function POST(req: NextRequest) {
  const ok = (counted: boolean) => NextResponse.json({ counted });
  if (!isSameOrigin(req)) return ok(false);
  if (BOT.test(req.headers.get('user-agent') || '')) return ok(false);

  const ip = clientIp(req);
  // ผู้ใช้ที่ยังไม่รู้ IP (ไม่ควรเกิดบนเว็บจริง) ไม่นับ เพื่อไม่ให้ทุกคนรวมเป็นคนเดียว
  if (ip === 'unknown') return ok(false);
  // ตัวกันซ้ำ: ครั้งแรกใน 30 นาทีผ่าน ครั้งต่อไปถูกตัดทิ้ง (ใช้ร่วมกันทุกเครื่องเซิร์ฟเวอร์)
  if (!(await limit(`visit30:${ip}`, 1, WINDOW_MS))) return ok(false);

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from('profiles').select('role, username').eq('id', user.id).maybeSingle();
      if (p?.role === 'dev') return ok(false);
      if (String(p?.username || '').startsWith('trial_')) {
        userId = null; // บัญชีทดลองชั่วคราว นับเป็นผู้เยี่ยมชม
      } else {
        userId = user.id;
      }
    }
  } catch {
    /* นับเป็นผู้เยี่ยมชม */
  }

  const { error } = await getAdminClient().from('site_visits').insert({ user_id: userId });
  return ok(!error);
}
