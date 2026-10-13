import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { resultSchema } from '@/lib/validations/platform';
import { friendlyDbError, rateLimit, verifyPlayToken } from '@/lib/server/security';
import { processResult } from '@/lib/server/progress';

/**
 * เกมรายงานผลกลับมาที่นี่ (เรียกจากโดเมนของเกม จึงเปิด CORS)
 * ความปลอดภัยไม่ได้อาศัย cookie แต่อาศัย "โทเคนการเล่น" ที่เซ็นด้วย HMAC:
 *   - ผูกกับนักเรียน + เกม + รอบการเล่น และหมดอายุเอง (4 ชั่วโมง)
 *   - ค่าที่ส่งมาถูกตรวจช่วงค่า และดาวห้ามเกินความแม่นยำจริง
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const reply = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: CORS });

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: 'invalid json' });
  }
  const parsed = resultSchema.safeParse(body);
  if (!parsed.success) return reply(400, { error: parsed.error.issues[0]?.message || 'invalid' });

  const payload = verifyPlayToken(parsed.data.token);
  if (!payload) return reply(401, { error: 'token invalid or expired' });

  if (!rateLimit(`result:${payload.s}`, 30, 60 * 1000)) {
    return reply(429, { error: 'too many results' });
  }

  try {
    const admin = getAdminClient();
    const { data: session } = await admin
      .from('play_sessions')
      .select('id, student_id, media_id')
      .eq('id', payload.p)
      .maybeSingle();
    if (!session || session.student_id !== payload.s || session.media_id !== payload.m) {
      return reply(401, { error: 'session mismatch' });
    }

    const { count } = await admin
      .from('play_results')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session.id);
    if ((count || 0) >= 200) return reply(429, { error: 'session limit' });

    const d = parsed.data;
    const out = await processResult(admin, {
      studentId: payload.s,
      mediaId: payload.m,
      sessionId: payload.p,
      levelKey: d.levelKey,
      score: d.score,
      stars: d.stars,
      correct: Math.min(d.correct, d.total || d.correct),
      total: d.total,
      durationSec: d.durationSec,
      mistakes: d.mistakes,
    });
    return reply(200, out);
  } catch (err) {
    return reply(500, { error: friendlyDbError(err) });
  }
}
