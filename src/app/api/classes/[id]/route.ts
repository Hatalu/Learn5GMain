import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/admin';
import { classSchema, firstIssue, gradeSchema } from '@/lib/validations/platform';
import { apiError, friendlyDbError } from '@/lib/server/security';
import { guard } from '@/lib/server/session';
import { loadOwnClass } from '@/lib/server/classes';
import { buddyStage } from '@/lib/gamify';

type Ctx = { params: { id: string } };
const TEACHER_ROLES = ['teacher', 'dev'] as const;

/** รายละเอียดห้อง: นักเรียน + งานที่มอบหมาย */
export async function GET(req: NextRequest, { params }: Ctx) {
  const g = await guard(req, [...TEACHER_ROLES]);
  if (!g.ok) return g.res;

  try {
    const cls = await loadOwnClass(g.auth, params.id);
    if (!cls) return apiError(404, 'ไม่พบห้องเรียน');
    const admin = getAdminClient();

    const [mem, asg] = await Promise.all([
      admin.from('class_members').select('student_id').eq('class_id', cls.id),
      admin.from('assignments').select('id, media_id, note, due_at, created_at').eq('class_id', cls.id).order('created_at', { ascending: false }),
    ]);
    const studentIds = (mem.data || []).map((m: { student_id: string }) => m.student_id);
    const mediaIds = (asg.data || []).map((a: { media_id: string }) => a.media_id);

    const [profiles, stats, creds, media] = await Promise.all([
      studentIds.length
        ? admin.from('profiles').select('id, display_name, grade, avatar').in('id', studentIds)
        : Promise.resolve({ data: [] as never[] }),
      studentIds.length
        ? admin.from('student_stats').select('student_id, stars_total, bonus_stars, streak, last_play_date').in('student_id', studentIds)
        : Promise.resolve({ data: [] as never[] }),
      studentIds.length
        ? admin.from('student_credentials').select('student_id, login_code').in('student_id', studentIds)
        : Promise.resolve({ data: [] as never[] }),
      mediaIds.length
        ? admin.from('media').select('id, title, icon_url, subject').in('id', mediaIds)
        : Promise.resolve({ data: [] as never[] }),
    ]);

    const st = new Map((stats.data as { student_id: string; stars_total: number; bonus_stars: number; streak: number; last_play_date: string | null }[]).map((s) => [s.student_id, s]));
    const cr = new Map((creds.data as { student_id: string; login_code: string }[]).map((c) => [c.student_id, c.login_code]));
    const md = new Map((media.data as { id: string; title: string; icon_url: string; subject: string }[]).map((m) => [m.id, m]));

    return NextResponse.json({
      class: cls,
      students: (profiles.data as { id: string; display_name: string; grade: string | null; avatar: string }[]).map((p) => {
        const s = st.get(p.id);
        const stars = (s?.stars_total || 0) + (s?.bonus_stars || 0);
        return {
          ...p,
          code: cr.get(p.id) || null,
          stars,
          buddyStage: buddyStage(stars).name,
          streak: s?.streak || 0,
          lastPlayDate: s?.last_play_date || null,
        };
      }),
      assignments: (asg.data || []).map((a: { media_id: string }) => ({ ...a, media: md.get(a.media_id) || null })),
    });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}

const patchSchema = z.object({
  name: classSchema.shape.name.optional(),
  grade: gradeSchema.nullable().optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const g = await guard(req, [...TEACHER_ROLES]);
  if (!g.ok) return g.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, 'ข้อมูลไม่ถูกต้อง');
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError(400, firstIssue(parsed.error));

  try {
    const cls = await loadOwnClass(g.auth, params.id);
    if (!cls) return apiError(404, 'ไม่พบห้องเรียน');
    const { error } = await getAdminClient().from('classes').update(parsed.data).eq('id', cls.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}

/** ลบห้อง (นักเรียนไม่ถูกลบ แค่ออกจากห้อง) */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const g = await guard(req, [...TEACHER_ROLES]);
  if (!g.ok) return g.res;

  try {
    const cls = await loadOwnClass(g.auth, params.id);
    if (!cls) return apiError(404, 'ไม่พบห้องเรียน');
    const { error } = await getAdminClient().from('classes').delete().eq('id', cls.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}
