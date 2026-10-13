import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { heartbeatSchema, firstIssue } from '@/lib/validations/platform';
import { apiError, friendlyDbError, rateLimit } from '@/lib/server/security';
import { guard } from '@/lib/server/session';
import { minutesPlayedToday } from '@/lib/server/progress';

const MAX_GAP_SEC = 90; // นับเวลาเพิ่มได้ไม่เกินนี้ต่อหนึ่งจังหวะ (กันเวลาเฟ้อตอนแท็บหลับ)

/** จับเวลาเล่นของนักเรียน (หน้าเล่นเกมส่งทุก ~30 วินาที) */
export async function POST(req: NextRequest) {
  const g = await guard(req, ['student']);
  if (!g.ok) return g.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, 'ข้อมูลไม่ถูกต้อง');
  }
  const parsed = heartbeatSchema.safeParse(body);
  if (!parsed.success) return apiError(400, firstIssue(parsed.error));

  if (!rateLimit(`beat:${g.auth.userId}`, 8, 60 * 1000)) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  try {
    const admin = getAdminClient();
    const { data: session } = await admin
      .from('play_sessions')
      .select('id, student_id, seconds, last_beat_at')
      .eq('id', parsed.data.sessionId)
      .maybeSingle();
    if (!session || session.student_id !== g.auth.userId) return apiError(404, 'ไม่พบรอบการเล่น');

    const gap = Math.max(0, Math.min(MAX_GAP_SEC, Math.round((Date.now() - new Date(session.last_beat_at).getTime()) / 1000)));
    await admin
      .from('play_sessions')
      .update({ seconds: session.seconds + gap, last_beat_at: new Date().toISOString() })
      .eq('id', session.id);

    const limit = g.auth.profile.daily_limit_min ?? null;
    const used = await minutesPlayedToday(admin, g.auth.userId);
    return NextResponse.json({ ok: true, usedMinutes: used, limitMinutes: limit, limitReached: !!limit && used >= limit });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}
