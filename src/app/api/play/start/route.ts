import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { hasMembership } from '@/lib/membership';
import { bkkParts } from '@/lib/companion';
import { signTrialToken } from '@/lib/server/trial';
import { TRIAL_PREFIX } from '@/lib/server/trial-account';
import { clientIp, isSameOrigin, limit } from '@/lib/server/rate-limit';
import { verifyTurnstile } from '@/lib/server/turnstile';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** เกมของเราอยู่ที่นี่และฝัง SDK ไว้แล้ว เล่นในหน้าเว็บได้ (เว็บอื่นเปิดแท็บใหม่แบบเดิม) */
const INLINE_HOSTS = new Set(['hatalu.github.io']);

/**
 * เล่นเกมเต็มรูปแบบ: สมาชิก (หรือเกมประจำวันที่แจกฟรีวันนี้) ได้ลิงก์เกมพร้อมโทเคน "เล่นเต็ม"
 * เกมจะข้ามหน้าล็อกอินให้เอง ไม่มีนาฬิกา (โทเคนอายุ 4 ชั่วโมง หมดแล้วหน้าเว็บขอใหม่ให้)
 * โทเคนอยู่หลัง # ของลิงก์ ไม่ถูกส่งไปที่เซิร์ฟเวอร์ใด และไม่มีรหัสผ่านของใครอยู่ในลิงก์
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const ip = clientIp(req);
  if (!(await limit(`play:${ip}`, 60, 10 * 60 * 1000))) {
    return NextResponse.json({ error: 'เปิดเกมบ่อยเกินไป รอสักครู่แล้วลองใหม่นะ' }, { status: 429 });
  }

  let mediaId = '';
  let cf = '';
  try {
    const body = await req.json();
    mediaId = String(body?.mediaId || '');
    cf = String(body?.cf || '');
  } catch {
    /* ตรวจด้านล่าง */
  }
  if (!UUID.test(mediaId)) return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });

  try {
    const admin = getAdminClient();
    const { data: media } = await admin.from('media').select('id, title, game_url, is_public').eq('id', mediaId).maybeSingle();
    if (!media || media.is_public === false) return NextResponse.json({ error: 'ไม่พบสื่อนี้' }, { status: 404 });

    // สิทธิ์: สมาชิกที่ยังไม่หมดอายุ (ไม่นับบัญชีทดลอง) หรือเกมประจำวันที่แจกฟรีวันนี้
    let allowed = false;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from('profiles').select('username, role, premium_until').eq('id', user.id).maybeSingle();
      allowed = !!p && !String(p.username || '').startsWith(TRIAL_PREFIX) && hasMembership(p);
    }
    if (!allowed) {
      const { data: daily } = await admin.from('daily_games').select('media_id, unlock').eq('day', bkkParts().date).maybeSingle();
      allowed = !!daily && daily.media_id === media.id && daily.unlock !== false;
      // คนที่ไม่ใช่สมาชิกต้องผ่านการกันบอทเหมือนทดลองเล่น
      if (allowed && !(await verifyTurnstile(cf, ip))) return NextResponse.json({ error: 'ยืนยันว่าไม่ใช่บอทไม่สำเร็จ รีเฟรชหน้าแล้วลองใหม่นะ' }, { status: 403 });
    }
    if (!allowed) return NextResponse.json({ error: 'ต้องเป็นสมาชิกก่อน ลองกดทดลองเล่นได้เลย' }, { status: 403 });

    const base = String(media.game_url).split('#')[0];
    let host = '';
    try {
      host = new URL(base).hostname;
    } catch {
      /* ไม่ใช่ลิงก์ที่ถูกต้อง */
    }
    if (!INLINE_HOSTS.has(host)) return NextResponse.json({ inline: false, title: media.title, url: base });

    const { token } = signTrialToken(Date.now(), { member: true });
    return NextResponse.json({ inline: true, title: media.title, url: `${base}#${new URLSearchParams({ l5gtrial: token }).toString()}` });
  } catch {
    return NextResponse.json({ error: 'เปิดเกมไม่ได้ในตอนนี้ ลองใหม่อีกครั้งนะ' }, { status: 500 });
  }
}
