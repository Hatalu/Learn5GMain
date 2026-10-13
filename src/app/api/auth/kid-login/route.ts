import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { kidLoginSchema } from '@/lib/validations/platform';
import {
  apiError,
  clientIp,
  friendlyDbError,
  hashPin,
  isSameOrigin,
  normalizeCode,
  rateLimit,
  studentEmail,
  verifyPin,
} from '@/lib/server/security';
import { logSecurityEvent } from '@/lib/server/session';

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;
const GENERIC = 'รหัสนักเรียนหรือ PIN ไม่ถูกต้อง ลองใหม่อีกครั้งนะ';
// ใช้เทียบเวลาให้เท่ากันเมื่อไม่พบรหัส (กันการเดาว่ารหัสไหนมีอยู่จริง)
const DUMMY_HASH = hashPin('0000');

/**
 * นักเรียนเข้าสู่ระบบด้วย "รหัสนักเรียน + PIN 4 หลัก"
 * - PIN เก็บแบบ scrypt hash แยกตารางที่เบราว์เซอร์อ่านไม่ได้
 * - ใส่ผิด 5 ครั้งล็อก 15 นาที + จำกัดความถี่ต่อ IP
 * - สำเร็จแล้วออก token ให้ฝั่งเบราว์เซอร์แลกเป็น session (ไม่มีรหัสผ่านจริงของเด็กที่ใครรู้ได้)
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return apiError(403, 'คำขอไม่ถูกต้อง');
  if (!rateLimit(`kid:${clientIp(req)}`, 25, 10 * 60 * 1000)) {
    return apiError(429, 'ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่นะ');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, 'ข้อมูลไม่ถูกต้อง');
  }
  const parsed = kidLoginSchema.safeParse(body);
  if (!parsed.success) return apiError(400, parsed.error.issues[0]?.message || GENERIC);

  const code = normalizeCode(parsed.data.code);
  const pin = parsed.data.pin;

  try {
    const admin = getAdminClient();
    const { data: cred, error } = await admin
      .from('student_credentials')
      .select('student_id, login_code, pin_hash, pin_failures, locked_until')
      .eq('login_code', code)
      .maybeSingle();
    if (error) throw error;

    if (!cred) {
      verifyPin(pin, DUMMY_HASH);
      return apiError(401, GENERIC);
    }

    if (cred.locked_until && new Date(cred.locked_until).getTime() > Date.now()) {
      return apiError(429, `ใส่ผิดหลายครั้ง พักสักครู่ แล้วลองใหม่ใน ${LOCK_MINUTES} นาที หรือให้ครู/ผู้ปกครองช่วยรีเซ็ต PIN`);
    }

    if (!verifyPin(pin, cred.pin_hash)) {
      const failures = (cred.pin_failures || 0) + 1;
      const lock = failures >= MAX_FAILURES;
      await admin
        .from('student_credentials')
        .update({
          pin_failures: lock ? 0 : failures,
          locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString() : null,
        })
        .eq('student_id', cred.student_id);
      if (lock) await logSecurityEvent('kid_pin_locked', cred.student_id, 'too many wrong PIN attempts');
      return apiError(401, GENERIC);
    }

    await admin
      .from('student_credentials')
      .update({ pin_failures: 0, locked_until: null })
      .eq('student_id', cred.student_id);

    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: studentEmail(code),
    });
    const tokenHash = link?.properties?.hashed_token;
    if (linkErr || !tokenHash) throw linkErr || new Error('no token');

    await admin.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', cred.student_id);

    return NextResponse.json({ tokenHash });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}
