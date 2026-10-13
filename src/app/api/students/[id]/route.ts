import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { patchStudentSchema, firstIssue } from '@/lib/validations/platform';
import { apiError, friendlyDbError, hashPin, randomPin } from '@/lib/server/security';
import { GUARDIAN_ROLES, guard, loadOwnedStudent, logSecurityEvent } from '@/lib/server/session';

type Ctx = { params: { id: string } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const g = await guard(req, GUARDIAN_ROLES);
  if (!g.ok) return g.res;
  if (!UUID.test(params.id)) return apiError(404, 'ไม่พบนักเรียน');

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, 'ข้อมูลไม่ถูกต้อง');
  }
  const parsed = patchStudentSchema.safeParse(body);
  if (!parsed.success) return apiError(400, firstIssue(parsed.error));

  try {
    const student = await loadOwnedStudent(g.auth, params.id);
    if (!student) return apiError(404, 'ไม่พบนักเรียน');
    const admin = getAdminClient();
    const data = parsed.data;

    if (data.action === 'reset_pin') {
      const pin = randomPin();
      const { error } = await admin
        .from('student_credentials')
        .update({ pin_hash: hashPin(pin), pin_failures: 0, locked_until: null, updated_at: new Date().toISOString() })
        .eq('student_id', student.id);
      if (error) throw error;
      await logSecurityEvent('reset_pin', g.auth.userId, student.id);
      return NextResponse.json({ pin });
    }

    if (data.action === 'rename') {
      const { error } = await admin
        .from('profiles')
        .update({ display_name: data.name, grade: data.grade ?? student.grade ?? null })
        .eq('id', student.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    const { error } = await admin.from('profiles').update({ daily_limit_min: data.minutes }).eq('id', student.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const g = await guard(req, GUARDIAN_ROLES);
  if (!g.ok) return g.res;
  if (!UUID.test(params.id)) return apiError(404, 'ไม่พบนักเรียน');

  try {
    const student = await loadOwnedStudent(g.auth, params.id);
    if (!student) return apiError(404, 'ไม่พบนักเรียน');
    const admin = getAdminClient();
    // ลบบัญชี auth แล้วข้อมูลทั้งหมดของเด็กถูกลบตามต่อเนื่อง (ON DELETE CASCADE)
    const { error } = await admin.auth.admin.deleteUser(student.id);
    if (error) throw error;
    await logSecurityEvent('delete_student', g.auth.userId, student.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}
