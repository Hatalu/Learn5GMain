import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { classSchema, firstIssue } from '@/lib/validations/platform';
import { apiError, friendlyDbError } from '@/lib/server/security';
import { guard } from '@/lib/server/session';

const TEACHER_ROLES = ['teacher', 'dev'] as const;

export async function GET(req: NextRequest) {
  const g = await guard(req, [...TEACHER_ROLES]);
  if (!g.ok) return g.res;

  try {
    const admin = getAdminClient();
    const { data: classes, error } = await admin
      .from('classes')
      .select('id, name, grade, archived, created_at')
      .eq('teacher_id', g.auth.userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;

    const ids = (classes || []).map((c: { id: string }) => c.id);
    const counts = new Map<string, { students: number; assignments: number }>();
    ids.forEach((id: string) => counts.set(id, { students: 0, assignments: 0 }));
    if (ids.length) {
      const [m, a] = await Promise.all([
        admin.from('class_members').select('class_id').in('class_id', ids),
        admin.from('assignments').select('class_id').in('class_id', ids),
      ]);
      (m.data || []).forEach((r: { class_id: string }) => {
        counts.get(r.class_id)!.students += 1;
      });
      (a.data || []).forEach((r: { class_id: string }) => {
        counts.get(r.class_id)!.assignments += 1;
      });
    }

    return NextResponse.json({
      classes: (classes || []).map((c: { id: string }) => ({ ...c, ...counts.get(c.id) })),
    });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}

export async function POST(req: NextRequest) {
  const g = await guard(req, [...TEACHER_ROLES]);
  if (!g.ok) return g.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, 'ข้อมูลไม่ถูกต้อง');
  }
  const parsed = classSchema.safeParse(body);
  if (!parsed.success) return apiError(400, firstIssue(parsed.error));

  try {
    const admin = getAdminClient();
    const { count } = await admin
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', g.auth.userId);
    if ((count || 0) >= 30) return apiError(400, 'สร้างห้องเรียนได้สูงสุด 30 ห้อง');

    const { data, error } = await admin
      .from('classes')
      .insert({ teacher_id: g.auth.userId, name: parsed.data.name, grade: parsed.data.grade ?? null })
      .select('id, name, grade, archived, created_at')
      .single();
    if (error) throw error;
    return NextResponse.json({ class: { ...data, students: 0, assignments: 0 } }, { status: 201 });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}
