import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { assignmentSchema, firstIssue } from '@/lib/validations/platform';
import { apiError, friendlyDbError } from '@/lib/server/security';
import { guard } from '@/lib/server/session';
import { isUuid, loadOwnClass } from '@/lib/server/classes';

type Ctx = { params: { id: string } };
const TEACHER_ROLES = ['teacher', 'dev'] as const;

export async function POST(req: NextRequest, { params }: Ctx) {
  const g = await guard(req, [...TEACHER_ROLES]);
  if (!g.ok) return g.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, 'ข้อมูลไม่ถูกต้อง');
  }
  const parsed = assignmentSchema.safeParse(body);
  if (!parsed.success) return apiError(400, firstIssue(parsed.error));

  try {
    const cls = await loadOwnClass(g.auth, params.id);
    if (!cls) return apiError(404, 'ไม่พบห้องเรียน');
    const admin = getAdminClient();

    const { data: media } = await admin
      .from('media')
      .select('id, is_public')
      .eq('id', parsed.data.mediaId)
      .maybeSingle();
    if (!media || media.is_public === false) return apiError(404, 'ไม่พบสื่อนี้');

    const { error } = await admin.from('assignments').upsert(
      {
        class_id: cls.id,
        media_id: parsed.data.mediaId,
        note: parsed.data.note || null,
        due_at: parsed.data.dueAt || null,
        created_by: g.auth.userId,
      },
      { onConflict: 'class_id,media_id' }
    );
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const g = await guard(req, [...TEACHER_ROLES]);
  if (!g.ok) return g.res;

  const assignmentId = new URL(req.url).searchParams.get('id') || '';
  if (!isUuid(assignmentId)) return apiError(400, 'ข้อมูลไม่ถูกต้อง');

  try {
    const cls = await loadOwnClass(g.auth, params.id);
    if (!cls) return apiError(404, 'ไม่พบห้องเรียน');
    const { error } = await getAdminClient()
      .from('assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('class_id', cls.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}
