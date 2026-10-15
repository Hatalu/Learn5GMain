import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { TRIAL_SECONDS, signTrialToken } from '@/lib/server/trial';
import { createTrialAccount, sweepTrialAccounts } from '@/lib/server/trial-account';
import { clientIp, isSameOrigin, limit } from '@/lib/server/rate-limit';
import { verifyTurnstile } from '@/lib/server/turnstile';

/** จำนวนบัญชีทดลองที่ใช้งานพร้อมกันได้สูงสุด (กันบอทสร้างบัญชีถล่ม) */
const MAX_LIVE_TRIALS = 150;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * เริ่มทดลองเล่น: ไม่ต้องล็อกอิน คืนลิงก์เกมพร้อมโทเคนทดลองอายุสั้น (อยู่หลัง # ไม่ถูกส่งไปที่เซิร์ฟเวอร์ใด)
 * เกมที่รองรับจะข้ามหน้าล็อกอินและเล่นได้ตามเวลาในโทเคน
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const ip = clientIp(req);
  if (!(await limit(`trial:${ip}`, 12, 10 * 60 * 1000)) || !(await limit(`trial-day:${ip}`, 60, 24 * 3600 * 1000))) {
    return NextResponse.json({ error: 'ทดลองเล่นบ่อยเกินไป รอสักครู่แล้วลองใหม่นะ' }, { status: 429 });
  }

  let mediaId = '';
  let cf = '';
  try {
    const body = await req.json();
    mediaId = String(body?.mediaId || '');
    cf = String(body?.cf || '');
  } catch {
    /* ปล่อยให้ตรวจด้านล่าง */
  }
  if (!UUID.test(mediaId)) return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  if (!(await verifyTurnstile(cf, ip))) return NextResponse.json({ error: 'ยืนยันว่าไม่ใช่บอทไม่สำเร็จ รีเฟรชหน้าแล้วลองใหม่นะ' }, { status: 403 });

  try {
    const { data: media } = await getAdminClient()
      .from('media')
      .select('id, title, game_url, is_public')
      .eq('id', mediaId)
      .maybeSingle();
    if (!media || media.is_public === false) {
      return NextResponse.json({ error: 'ไม่พบสื่อนี้' }, { status: 404 });
    }

    await sweepTrialAccounts().catch(() => 0);
    const { count: live } = await getAdminClient()
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .like('username', 'trial\\_%')
      .gt('premium_until', new Date().toISOString());
    if ((live ?? 0) >= MAX_LIVE_TRIALS) {
      return NextResponse.json({ error: 'ตอนนี้มีคนทดลองเล่นเยอะมาก รอสักครู่แล้วลองใหม่นะ' }, { status: 503 });
    }
    // นับยอดทดลองเล่น (ไม่ให้ล้มการทดลองถ้าตารางยังไม่ถูกสร้าง)
    await getAdminClient().from('trial_plays').insert({ media_id: media.id }).then(() => null, () => null);
    const { token, n } = signTrialToken();
    const acct = await createTrialAccount(n);
    const base = String(media.game_url).split('#')[0];
    const q = new URLSearchParams({
      l5gtrial: token,
      u: acct.username,
      p: acct.password,
      su: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      k: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    });
    return NextResponse.json({
      title: media.title,
      url: `${base}#${q.toString()}`,
      account: n,
      seconds: TRIAL_SECONDS,
    });
  } catch {
    return NextResponse.json({ error: 'เปิดโหมดทดลองไม่ได้ในตอนนี้ ลองใหม่อีกครั้งนะ' }, { status: 500 });
  }
}
