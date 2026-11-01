import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { extendUntil } from '@/lib/server/payments';
import { TRIAL_PREFIX } from '@/lib/server/trial-account';
import { clientIp, isSameOrigin, limit } from '@/lib/server/rate-limit';
import { isCode, normCode } from '@/lib/redeem';

export const dynamic = 'force-dynamic';

/** กรอกโค้ดรับสมาชิกฟรี: ต้องเข้าสู่ระบบ ใช้ได้ครั้งเดียว ต่อวันหมดอายุจากของเดิม */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'เข้าสู่ระบบก่อนนะ', login: true }, { status: 401 });
  if (!(await limit(`redeem:${user.id}`, 8, 10 * 60 * 1000)) || !(await limit(`redeem-ip:${clientIp(req)}`, 20, 10 * 60 * 1000))) {
    return NextResponse.json({ error: 'กรอกบ่อยเกินไป รอสักครู่แล้วลองใหม่นะ' }, { status: 429 });
  }

  let code = '';
  try {
    code = normCode(String((await req.json())?.code || ''));
  } catch {
    /* ตรวจด้านล่าง */
  }
  if (!isCode(code)) return NextResponse.json({ error: 'โค้ดต้องมี 10 ตัว ลองดูอีกทีนะ' }, { status: 400 });

  const admin = getAdminClient();
  const { data: p } = await admin.from('profiles').select('username, premium_until').eq('id', user.id).single();
  if (!p) return NextResponse.json({ error: 'ไม่พบบัญชี' }, { status: 404 });
  // บัญชีทดลองถูกลบเองใน 5 นาที โค้ดจะหายไปเปล่าๆ
  if (String(p.username).startsWith(TRIAL_PREFIX)) return NextResponse.json({ error: 'สมัครบัญชีจริงก่อน แล้วค่อยใส่โค้ดนะ' }, { status: 403 });

  // จองโค้ดแบบอะตอมมิก: อัปเดตได้เฉพาะแถวที่ยังไม่มีคนใช้
  const now = new Date().toISOString();
  const { data: claimed, error: claimErr } = await admin
    .from('redeem_codes')
    .update({ used_by: user.id, used_username: p.username, used_at: now })
    .eq('code', code)
    .is('used_at', null)
    .select('days');
  if (claimErr) {
    const missing = /relation|does not exist|schema cache/i.test(claimErr.message);
    return NextResponse.json({ error: missing ? 'ระบบโค้ดยังไม่เปิดใช้ ลองใหม่ภายหลังนะ' : 'ใช้โค้ดไม่สำเร็จ ลองใหม่นะ' }, { status: 500 });
  }
  if (!claimed?.length) {
    const { data: row } = await admin.from('redeem_codes').select('used_at').eq('code', code).maybeSingle();
    return NextResponse.json({ error: row ? 'โค้ดนี้ถูกใช้ไปแล้ว' : 'ไม่พบโค้ดนี้ ตรวจตัวอักษรอีกทีนะ' }, { status: 400 });
  }

  const days = claimed[0].days as number;
  const until = extendUntil(p.premium_until, days);
  const { error: upErr } = await admin.from('profiles').update({ premium_until: until }).eq('id', user.id);
  if (upErr) {
    // ต่ออายุไม่สำเร็จ: คืนโค้ดให้ใช้ใหม่ได้
    await admin.from('redeem_codes').update({ used_by: null, used_username: null, used_at: null }).eq('code', code);
    return NextResponse.json({ error: 'ต่ออายุสมาชิกไม่สำเร็จ ลองใหม่นะ' }, { status: 500 });
  }
  return NextResponse.json({ days, until });
}
