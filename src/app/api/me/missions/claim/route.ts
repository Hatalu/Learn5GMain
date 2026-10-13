import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { claimSchema, firstIssue } from '@/lib/validations/platform';
import { apiError, friendlyDbError } from '@/lib/server/security';
import { guard } from '@/lib/server/session';
import { buildStudentHome, loadStats } from '@/lib/server/progress';
import { bangkokDate } from '@/lib/gamify';

/** รับดาวโบนัสจากภารกิจประจำวันที่ทำสำเร็จ (รับได้ครั้งเดียวต่อภารกิจต่อวัน) */
export async function POST(req: NextRequest) {
  const g = await guard(req, ['student']);
  if (!g.ok) return g.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, 'ข้อมูลไม่ถูกต้อง');
  }
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) return apiError(400, firstIssue(parsed.error));

  try {
    const admin = getAdminClient();
    const home = await buildStudentHome(admin, g.auth.userId);
    const mission = home.missions.find((m) => m.key === parsed.data.missionKey);
    if (!mission) return apiError(404, 'ไม่พบภารกิจนี้');
    if (!mission.done) return apiError(400, 'ภารกิจนี้ยังไม่สำเร็จนะ');
    if (mission.claimed) return apiError(409, 'รับรางวัลไปแล้ว');

    // PRIMARY KEY (student, day, mission) กันการกดซ้ำพร้อมกัน
    const { error: claimErr } = await admin
      .from('mission_claims')
      .insert({ student_id: g.auth.userId, day: bangkokDate(), mission_key: mission.key });
    if (claimErr) {
      if (claimErr.code === '23505') return apiError(409, 'รับรางวัลไปแล้ว');
      throw claimErr;
    }

    const stats = await loadStats(admin, g.auth.userId);
    const { error } = await admin
      .from('student_stats')
      .upsert(
        { ...stats, bonus_stars: stats.bonus_stars + mission.reward, updated_at: new Date().toISOString() },
        { onConflict: 'student_id' }
      );
    if (error) throw error;

    return NextResponse.json({ reward: mission.reward });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}
