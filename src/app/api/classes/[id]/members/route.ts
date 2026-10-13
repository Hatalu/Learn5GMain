import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { addMembersSchema, firstIssue } from '@/lib/validations/platform';
import { apiError, friendlyDbError } from '@/lib/server/security';
import { guard } from '@/lib/server/session';
import { isUuid, loadOwnClass } from '@/lib/server/classes';

type Ctx = { params: { id: string } };
const TEACHER_ROLES = ['teacher', 'dev'] as const;

/** เพิ่มนักเรียน (ที่เราเป็นเจ้าของ) เข้าห้อง */
export async function POST(req: NextRequest, { params }: Ctx) {
  const g = await guard(req, [...TEACHER_ROLES]);
  if (!g.ok) return g.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, 'ข้อมูลไม่ถูกต้อง');
  }
  const parsed = addMembersSchema.safeParse(body);
  if (!parsed.success) return apiError(400, firstIssue(parsed.error));

  try {
    const cls = await loadOwnClass(g.auth, params.id);
    if (!cls) return apiError(404, 'ไม่พบห้องเรียน');
    const admin = getAdminClient();

    // เพิ่มได้เฉพาะนักเรียนที่เราดูแลเอง
    const { data: owned } = await admin
      .from('profiles')
      .select('id')
      .in('id', parsed.data.studentIds)
      .eq('role', 'student')
      .eq('owner_id', g.auth.userId);
    const ids = (owned || []).map((o: { id: string }) => o.id);
    if (ids.length === 0) return apiError(404, 'ไม่พบนักเรียนที่เลือก');

    const { error } = await admin
      .from('class_members')
      .upsert(ids.map((id: string) => ({ class_id: cls.id, student_id: id })), { onConflict: 'class_id,student_id', ignoreDuplicates: true });
    if (error) throw error;
    return NextResponse.json({ added: ids.length });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const g = await guard(req, [...TEACHER_ROLES]);
  if (!g.ok) return g.res;

  const studentId = new URL(req.url).searchParams.get('studentId') || '';
  if (!isUuid(studentId)) return apiError(400, 'ข้อมูลไม่ถูกต้อง');

  try {
    const cls = await loadOwnClass(g.auth, params.id);
    if (!cls) return apiError(404, 'ไม่พบห้องเรียน');
    const { error } = await getAdminClient()
      .from('class_members')
      .delete()
      .eq('class_id', cls.id)
      .eq('student_id', studentId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}
