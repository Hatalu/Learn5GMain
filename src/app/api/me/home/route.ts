import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { apiError, friendlyDbError } from '@/lib/server/security';
import { guard } from '@/lib/server/session';
import { buildStudentHome } from '@/lib/server/progress';

/** ข้อมูลหน้า "ห้องผจญภัยของฉัน" ของนักเรียน */
export async function GET(req: NextRequest) {
  const g = await guard(req, ['student']);
  if (!g.ok) return g.res;
  const { auth } = g;

  try {
    const admin = getAdminClient();
    const home = await buildStudentHome(admin, auth.userId);

    // งานที่ครูมอบหมายในห้องที่เราอยู่
    const { data: mem } = await admin.from('class_members').select('class_id').eq('student_id', auth.userId);
    const classIds = (mem || []).map((m: { class_id: string }) => m.class_id);
    let assignments: unknown[] = [];
    if (classIds.length) {
      const [{ data: asg }, { data: classes }] = await Promise.all([
        admin.from('assignments').select('id, class_id, media_id, note, due_at').in('class_id', classIds).order('due_at', { ascending: true, nullsFirst: false }),
        admin.from('classes').select('id, name').in('id', classIds),
      ]);
      const mediaIds = Array.from(new Set((asg || []).map((a: { media_id: string }) => a.media_id)));
      const { data: media } = mediaIds.length
        ? await admin.from('media').select('id, title, icon_url, subject').in('id', mediaIds)
        : { data: [] as { id: string; title: string; icon_url: string; subject: string }[] };
      const mm = new Map((media || []).map((m: { id: string }) => [m.id, m]));
      const cn = new Map((classes || []).map((c: { id: string; name: string }) => [c.id, c.name]));
      assignments = (asg || []).map((a: { id: string; class_id: string; media_id: string; note: string | null; due_at: string | null }) => ({
        id: a.id,
        mediaId: a.media_id,
        note: a.note,
        dueAt: a.due_at,
        className: cn.get(a.class_id) || '',
        media: mm.get(a.media_id) || null,
        bestStars: home.stickers[a.media_id] ?? null,
      }));
    }

    const limit = auth.profile.daily_limit_min ?? null;
    return NextResponse.json({
      profile: {
        name: auth.profile.display_name || 'นักเรียน',
        grade: auth.profile.grade ?? null,
        avatar: auth.profile.avatar || 'bear',
      },
      ...home,
      assignments,
      limit: { minutes: limit, used: home.minutesToday },
    });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}
