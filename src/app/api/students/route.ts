import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { createStudentsSchema, firstIssue } from '@/lib/validations/platform';
import { apiError, friendlyDbError } from '@/lib/server/security';
import { GUARDIAN_ROLES, guard } from '@/lib/server/session';
import { MAX_STUDENTS, createStudent, CreatedStudent } from '@/lib/server/students';
import { buddyStage } from '@/lib/gamify';

export const maxDuration = 60;

interface StatRow {
  student_id: string;
  stars_total: number;
  bonus_stars: number;
  streak: number;
  last_play_date: string | null;
}
interface CredRow {
  student_id: string;
  login_code: string;
  locked_until: string | null;
}

/** รายชื่อนักเรียนที่เราดูแล */
export async function GET(req: NextRequest) {
  const g = await guard(req, GUARDIAN_ROLES);
  if (!g.ok) return g.res;
  const { auth } = g;

  try {
    const admin = getAdminClient();
    const { data: students, error } = await admin
      .from('profiles')
      .select('id, display_name, grade, avatar, daily_limit_min, last_seen_at, created_at')
      .eq('owner_id', auth.userId)
      .eq('role', 'student')
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) throw error;

    const ids = (students || []).map((s: { id: string }) => s.id);
    if (ids.length === 0) return NextResponse.json({ students: [] });

    const [stats, creds, members] = await Promise.all([
      admin.from('student_stats').select('student_id, stars_total, bonus_stars, streak, last_play_date').in('student_id', ids),
      admin.from('student_credentials').select('student_id, login_code, locked_until').in('student_id', ids),
      admin.from('class_members').select('student_id, class_id').in('student_id', ids),
    ]);

    const statMap = new Map<string, StatRow>(((stats.data || []) as StatRow[]).map((s) => [s.student_id, s]));
    const credMap = new Map<string, CredRow>(((creds.data || []) as CredRow[]).map((c) => [c.student_id, c]));
    const classMap = new Map<string, string[]>();
    (members.data || []).forEach((m: { student_id: string; class_id: string }) => {
      classMap.set(m.student_id, [...(classMap.get(m.student_id) || []), m.class_id]);
    });

    return NextResponse.json({
      students: (students || []).map((s: { id: string }) => {
        const st = statMap.get(s.id);
        const cr = credMap.get(s.id);
        const stars = (st?.stars_total || 0) + (st?.bonus_stars || 0);
        return {
          ...s,
          code: cr?.login_code ?? null,
          locked: !!cr?.locked_until && new Date(cr.locked_until).getTime() > Date.now(),
          stars,
          buddyStage: buddyStage(stars).name,
          streak: st?.streak || 0,
          lastPlayDate: st?.last_play_date || null,
          classIds: classMap.get(s.id) || [],
        };
      }),
    });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}

/** เพิ่มนักเรียน (ทีละหลายคนได้) คืนรหัสนักเรียน + PIN ให้ดูครั้งเดียว */
export async function POST(req: NextRequest) {
  const g = await guard(req, GUARDIAN_ROLES);
  if (!g.ok) return g.res;
  const { auth } = g;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, 'ข้อมูลไม่ถูกต้อง');
  }
  const parsed = createStudentsSchema.safeParse(body);
  if (!parsed.success) return apiError(400, firstIssue(parsed.error));
  const { students, classId, avatar } = parsed.data;

  try {
    const admin = getAdminClient();

    // ถ้าระบุห้อง ต้องเป็นห้องของเราเท่านั้น
    if (classId) {
      const { data: cls } = await admin.from('classes').select('id, teacher_id').eq('id', classId).maybeSingle();
      if (!cls || (cls.teacher_id !== auth.userId && auth.profile.role !== 'dev')) {
        return apiError(404, 'ไม่พบห้องเรียนนี้');
      }
    }

    const limit = MAX_STUDENTS[auth.profile.role] ?? 8;
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', auth.userId)
      .eq('role', 'student');
    if ((count || 0) + students.length > limit) {
      return apiError(400, `เพิ่มนักเรียนได้สูงสุด ${limit} คนต่อบัญชี (ตอนนี้มี ${count || 0} คน)`);
    }

    const created: CreatedStudent[] = [];
    const failed: string[] = [];
    for (let i = 0; i < students.length; i += 5) {
      const chunk = students.slice(i, i + 5);
      const res = await Promise.allSettled(
        chunk.map((s) => createStudent(admin, auth.profile, { name: s.name, grade: s.grade, avatar, classId }))
      );
      res.forEach((r, idx) => {
        if (r.status === 'fulfilled') created.push(r.value);
        else failed.push(chunk[idx].name);
      });
    }

    return NextResponse.json({ created, failed }, { status: created.length ? 201 : 500 });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}
