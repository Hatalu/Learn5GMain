import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { TRIAL_SECONDS, signTrialToken } from '@/lib/server/trial';
import { createTrialAccount, sweepTrialAccounts } from '@/lib/server/trial-account';
import { clientIp, isSameOrigin, rateLimit } from '@/lib/server/rate-limit';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * เริ่มทดลองเล่น: ไม่ต้องล็อกอิน คืนลิงก์เกมพร้อมโทเคนทดลองอายุสั้น (อยู่หลัง # ไม่ถูกส่งไปที่เซิร์ฟเวอร์ใด)
 * เกมที่รองรับจะข้ามหน้าล็อกอินและเล่นได้ตามเวลาในโทเคน
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  if (!rateLimit(`trial:${clientIp(req)}`, 24, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'ทดลองเล่นบ่อยเกินไป รอสักครู่แล้วลองใหม่นะ' }, { status: 429 });
  }

  let mediaId = '';
  try {
    const body = await req.json();
    mediaId = String(body?.mediaId || '');
  } catch {
    /* ปล่อยให้ตรวจด้านล่าง */
  }
  if (!UUID.test(mediaId)) return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });

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
