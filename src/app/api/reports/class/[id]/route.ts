import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { apiError, friendlyDbError } from '@/lib/server/security';
import { guard } from '@/lib/server/session';
import { loadOwnClass } from '@/lib/server/classes';

type Ctx = { params: { id: string } };

interface ResultRow {
  student_id: string;
  media_id: string;
  stars: number;
  correct: number;
  total: number;
  mistakes: string[] | null;
  played_at: string;
}

/** รายงานทั้งห้อง: ตาราง นักเรียน x งานที่มอบหมาย + จุดที่ทั้งห้องพลาดบ่อย */
export async function GET(req: NextRequest, { params }: Ctx) {
  const g = await guard(req, ['teacher', 'dev']);
  if (!g.ok) return g.res;

  try {
    const cls = await loadOwnClass(g.auth, params.id);
    if (!cls) return apiError(404, 'ไม่พบห้องเรียน');
    const admin = getAdminClient();

    const [mem, asg] = await Promise.all([
      admin.from('class_members').select('student_id').eq('class_id', cls.id),
      admin.from('assignments').select('id, media_id, due_at').eq('class_id', cls.id),
    ]);
    const studentIds = (mem.data || []).map((m: { student_id: string }) => m.student_id);
    const assignments = (asg.data || []) as { id: string; media_id: string; due_at: string | null }[];

    if (studentIds.length === 0) {
      return NextResponse.json({ rows: [], assignments: [], commonMistakes: [], overview: { students: 0, completionRate: null } });
    }

    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [profiles, resultsQ, mediaQ] = await Promise.all([
      admin.from('profiles').select('id, display_name').in('id', studentIds),
      admin
        .from('play_results')
        .select('student_id, media_id, stars, correct, total, mistakes, played_at')
        .in('student_id', studentIds)
        .gte('played_at', since)
        .limit(8000),
      assignments.length
        ? admin.from('media').select('id, title').in('id', assignments.map((a) => a.media_id))
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    ]);

    const results = (resultsQ.data || []) as ResultRow[];
    const titleOf = new Map((mediaQ.data as { id: string; title: string }[]).map((m) => [m.id, m.title]));
    const assignedMedia = new Set(assignments.map((a) => a.media_id));

    const rows = (profiles.data as { id: string; display_name: string }[])
      .map((p) => {
        const mine = results.filter((r) => r.student_id === p.id);
        const cells = assignments.map((a) => {
          const rs = mine.filter((r) => r.media_id === a.media_id);
          return rs.length ? Math.max(...rs.map((r) => r.stars)) : null;
        });
        const correct = mine.reduce((s, r) => s + r.correct, 0);
        const total = mine.reduce((s, r) => s + r.total, 0);
        return {
          studentId: p.id,
          name: p.display_name,
          cells,
          plays: mine.length,
          accuracy: total > 0 ? Math.round((correct / total) * 100) : null,
          lastPlayed: mine.length ? mine[mine.length - 1].played_at : null,
          doneCount: cells.filter((c) => c !== null).length,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'th'));

    const mistakes = new Map<string, number>();
    results
      .filter((r) => assignedMedia.size === 0 || assignedMedia.has(r.media_id))
      .forEach((r) => (r.mistakes || []).forEach((m) => mistakes.set(m, (mistakes.get(m) || 0) + 1)));

    const done = rows.reduce((s, r) => s + r.doneCount, 0);
    const possible = rows.length * assignments.length;

    return NextResponse.json({
      assignments: assignments.map((a) => ({ id: a.id, mediaId: a.media_id, title: titleOf.get(a.media_id) || 'สื่อ', dueAt: a.due_at })),
      rows,
      commonMistakes: Array.from(mistakes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic, count]) => ({ topic, count })),
      overview: { students: rows.length, completionRate: possible ? Math.round((done / possible) * 100) : null },
    });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}
