import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { registerSchema, firstIssue } from '@/lib/validations/platform';
import { apiError, clientIp, friendlyDbError, isSameOrigin, rateLimit } from '@/lib/server/security';
import { logSecurityEvent } from '@/lib/server/session';

/**
 * สมัครสมาชิกสำหรับ "ผู้ใหญ่" (ผู้ปกครอง / คุณครู) เท่านั้น
 * - บทบาทที่สมัครเองได้มีแค่ parent | teacher (ส่ง dev/student มาก็ถูกปฏิเสธโดย schema)
 * - เด็กไม่สมัครเอง: ผู้ปกครองหรือครูสร้างโปรไฟล์ให้
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return apiError(403, 'คำขอไม่ถูกต้อง');
  if (!rateLimit(`register:${clientIp(req)}`, 6, 60 * 60 * 1000)) {
    return apiError(429, 'สมัครบ่อยเกินไป กรุณาลองใหม่ภายหลัง');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, 'ข้อมูลไม่ถูกต้อง');
  }
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return apiError(400, firstIssue(parsed.error));
  const { email, password, displayName, role } = parsed.data;

  try {
    const admin = getAdminClient();

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, role },
    });
    if (createErr || !created.user) {
      if (createErr && /already|registered|exists/i.test(createErr.message)) {
        return apiError(409, 'อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบแทน');
      }
      return apiError(400, 'ไม่สามารถสร้างบัญชีได้ กรุณาตรวจสอบอีเมลและรหัสผ่าน');
    }

    const { error: profileErr } = await admin.from('profiles').insert({
      id: created.user.id,
      username: email,
      role,
      display_name: displayName,
      consent_at: new Date().toISOString(),
    });
    if (profileErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return apiError(500, friendlyDbError(profileErr));
    }

    await logSecurityEvent('register', created.user.id, role);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}
