import { NextRequest, NextResponse } from 'next/server';
import { createMemberAccount, getAdminClient } from '@/lib/supabase/admin';
import { clientIp, isSameOrigin, limit } from '@/lib/server/rate-limit';
import { verifyTurnstile } from '@/lib/server/turnstile';
import { normalizeGmail, signupSchema } from '@/lib/validations/signup';

export const dynamic = 'force-dynamic';

/**
 * สมัครบัญชีเอง (ชื่อผู้ใช้ + อีเมล + รหัสผ่าน) ได้บัญชีที่ยังไม่เป็นสมาชิก
 * สร้างผ่านเซิร์ฟเวอร์เท่านั้น (ปิด "Allow new users to sign up" ใน Supabase ไว้ได้) อีเมลที่กรอกเก็บไว้ติดต่อ ไม่ได้ใช้ล็อกอิน
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const ip = clientIp(req);
  if (!(await limit(`signup:${ip}`, 6, 60 * 60 * 1000)) || !(await limit(`signup-day:${ip}`, 15, 24 * 3600 * 1000)) || !(await limit('signup-all', 300, 60 * 60 * 1000))) {
    return NextResponse.json({ error: 'สมัครบ่อยเกินไป รอสักครู่แล้วลองใหม่นะ' }, { status: 429 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* ว่าง */
  }
  if (!(await verifyTurnstile(String(body.cf || ''), ip))) {
    return NextResponse.json({ error: 'ยืนยันว่าไม่ใช่บอทไม่สำเร็จ รีเฟรชหน้าแล้วลองใหม่นะ' }, { status: 403 });
  }
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  const { username, password } = parsed.data;
  // เก็บและเช็กซ้ำด้วยรูปแบบกลาง (ไม่สนจุด/ส่วนหลัง +) กันสมัครซ้ำด้วยอีเมลเดียวกัน
  const email = normalizeGmail(parsed.data.email) as string;

  const admin = getAdminClient();
  // ต้องรัน migration 019 ก่อน (คอลัมน์อีเมล) ตรวจก่อนสร้างบัญชี จะได้ไม่เหลือบัญชีค้าง
  const probe = await admin.from('profiles').select('contact_email').limit(1);
  if (probe.error) {
    return NextResponse.json({ error: 'ระบบสมัครบัญชียังไม่พร้อมใช้งาน ลองใหม่ภายหลังนะ' }, { status: 503 });
  }
  const { data: dupes } = await admin.from('profiles').select('id').in('contact_email', [email, parsed.data.email]).limit(1);
  if (dupes && dupes.length) return NextResponse.json({ error: 'อีเมลนี้ถูกใช้สมัครแล้ว ลองเข้าสู่ระบบแทนนะ', field: 'email' }, { status: 409 });

  try {
    await createMemberAccount(username, password, 'member', null, email);
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (/มีอยู่ในระบบแล้ว|already|registered|exists/i.test(m)) return NextResponse.json({ error: 'ชื่อผู้ใช้นี้มีคนใช้แล้ว ลองชื่ออื่นนะ', field: 'username' }, { status: 409 });
    if (/uq_profiles_contact_email|duplicate key/i.test(m)) return NextResponse.json({ error: 'อีเมลนี้ถูกใช้สมัครแล้ว ลองเข้าสู่ระบบแทนนะ', field: 'email' }, { status: 409 });
    return NextResponse.json({ error: 'สมัครไม่สำเร็จ ลองใหม่อีกครั้งนะ' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
