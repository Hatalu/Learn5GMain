import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { apiError, friendlyDbError } from '@/lib/server/security';
import { GUARDIAN_ROLES, guard, loadOwnedStudent } from '@/lib/server/session';
import { bangkokDate, buddyStage } from '@/lib/gamify';

type Ctx = { params: { id: string } };

interface ResultRow {
  media_id: string;
  stars: number;
  correct: number;
  total: number;
  duration_sec: number;
  mistakes: string[] | null;
  played_at: string;
}

/** รายงานความก้าวหน้ารายบุคคล (ผู้ปกครอง/ครูที่ดูแลเท่านั้น) */
export async function GET(req: NextRequest, { params }: Ctx) {
  const g = await guard(req, GUARDIAN_ROLES);
  if (!g.ok) return g.res;

  const daysParam = Number(new URL(req.url).searchParams.get('days') || 7);
  const days = [7, 30, 90].includes(daysParam) ? daysParam : 7;

  try {
    const student = await loadOwnedStudent(g.auth, params.id);
    if (!student) return apiError(404, 'ไม่พบนักเรียน');
    const admin = getAdminClient();

    const since = new Date(Date.now() - days * 86400000).toISOString();
    const [resultsQ, sessionsQ, statsQ] = await Promise.all([
      admin
        .from('play_results')
        .select('media_id, stars, correct, total, duration_sec, mistakes, played_at')
        .eq('student_id', student.id)
        .gte('played_at', since)
        .order('played_at', { ascending: true })
        .limit(3000),
      admin.from('play_sessions').select('seconds, started_at').eq('student_id', student.id).gte('started_at', since).limit(3000),
      admin.from('student_stats').select('*').eq('student_id', student.id).maybeSingle(),
    ]);
    const results = (resultsQ.data || []) as ResultRow[];
    const sessions = (sessionsQ.data || []) as { seconds: number; started_at: string }[];
    const stats = statsQ.data as { stars_total: number; bonus_stars: number; streak: number; best_streak: number; plays_total: number } | null;

    // รายวัน (ย้อนหลัง days วัน เติมวันว่างเป็น 0)
    const perDay = new Map<string, { minutes: number; plays: number; stars: number }>();
    for (let i = days - 1; i >= 0; i--) {
      perDay.set(bangkokDate(new Date(Date.now() - i * 86400000)), { minutes: 0, plays: 0, stars: 0 });
    }
    sessions.forEach((s) => {
      const d = perDay.get(bangkokDate(new Date(s.started_at)));
      if (d) d.minutes += s.seconds / 60;
    });
    results.forEach((r) => {
      const d = perDay.get(bangkokDate(new Date(r.played_at)));
      if (d) {
        d.plays += 1;
        d.stars += r.stars;
      }
    });

    // รายเกม
    const mediaIds = Array.from(new Set(results.map((r) => r.media_id)));
    const { data: media } = mediaIds.length
      ? await admin.from('media').select('id, title, subject, icon_url').in('id', mediaIds)
      : { data: [] as { id: string; title: string; subject: string; icon_url: string }[] };
    const mm = new Map((media || []).map((m: { id: string }) => [m.id, m]));

    const perGame = mediaIds.map((id) => {
      const rows = results.filter((r) => r.media_id === id);
      const correct = rows.reduce((a, r) => a + r.correct, 0);
      const total = rows.reduce((a, r) => a + r.total, 0);
      return {
        mediaId: id,
        media: mm.get(id) || null,
        plays: rows.length,
        bestStars: Math.max(...rows.map((r) => r.stars)),
        accuracy: total > 0 ? Math.round((correct / total) * 100) : null,
        lastPlayed: rows[rows.length - 1].played_at,
      };
    });

    // จุดที่ควรเสริม (นับจากแท็กข้อผิดที่เกมรายงานมา)
    const weak = new Map<string, number>();
    results.forEach((r) => (r.mistakes || []).forEach((m) => weak.set(m, (weak.get(m) || 0) + 1)));
    const weakTopics = Array.from(weak.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));

    const stars = (stats?.stars_total || 0) + (stats?.bonus_stars || 0);
    return NextResponse.json({
      student: { id: student.id, name: student.display_name, grade: student.grade, avatar: student.avatar },
      days,
      summary: {
        plays: results.length,
        minutes: Math.round(sessions.reduce((a, s) => a + s.seconds, 0) / 60),
        starsInPeriod: results.reduce((a, r) => a + r.stars, 0),
        activeDays: Array.from(perDay.values()).filter((d) => d.plays > 0).length,
        starsTotal: stars,
        streak: stats?.streak || 0,
        bestStreak: stats?.best_streak || 0,
        buddyStage: buddyStage(stars).name,
      },
      perDay: Array.from(perDay.entries()).map(([date, v]) => ({ date, ...v, minutes: Math.round(v.minutes) })),
      perGame: perGame.sort((a, b) => b.plays - a.plays),
      weakTopics,
    });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}
