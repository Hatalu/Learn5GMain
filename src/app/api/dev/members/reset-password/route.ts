import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resetMemberPassword } from '@/lib/supabase/admin';
import { resetPasswordSchema } from '@/lib/validations/member';
import { isSameOrigin } from '@/lib/server/rate-limit';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'dev') {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (สำหรับ Dev เท่านั้น)' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, newPassword } = body;

    if (!userId || !UUID.test(String(userId))) {
      return NextResponse.json({ error: 'ไม่พบ ID สมาชิก' }, { status: 400 });
    }

    const validated = resetPasswordSchema.parse({ newPassword });
    await resetMemberPassword(userId, validated.newPassword);

    return NextResponse.json({ success: true, message: 'รีเซ็ตรหัสผ่านสำเร็จ' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
