import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { playStartSchema, firstIssue } from '@/lib/validations/platform';
import { apiError, friendlyDbError, rateLimit, signPlayToken } from '@/lib/server/security';
import { guard, isPremiumActive } from '@/lib/server/session';
import { minutesPlayedToday } from '@/lib/server/progress';

/** แหล่งที่มาของเว็บเรา (ให้เกมรู้ว่าต้องรายงานผลไปที่ไหน) */
function siteOrigin(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/**
 * เริ่มเล่น: ตรวจสิทธิ์ (ฟรี/Premium) + ตรวจเวลาเล่นต่อวัน
 * ส่งลิงก์เกมพร้อมโทเคนอายุสั้นใน # (fragment ไม่ถูกส่งไปที่เซิร์ฟเวอร์ใดๆ)
 */
export async function POST(req: NextRequest) {
  const g = await guard(req, ['student', 'parent', 'teacher', 'member', 'dev']);
  if (!g.ok) return g.res;
  const { auth } = g;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, 'ข้อมูลไม่ถูกต้อง');
  }
  const parsed = playStartSchema.safeParse(body);
  if (!parsed.success) return apiError(400, firstIssue(parsed.error));

  if (!rateLimit(`play:${auth.userId}`, 40, 5 * 60 * 1000)) {
    return apiError(429, 'เปิดเกมบ่อยเกินไป รอสักครู่นะ');
  }

  try {
    const admin = getAdminClient();
    const { data: media } = await admin
      .from('media')
      .select('id, title, game_url, access_tier, is_public')
      .eq('id', parsed.data.mediaId)
      .maybeSingle();
    if (!media || media.is_public === false) return apiError(404, 'ไม่พบสื่อนี้');

    const isFree = String(media.access_tier || 'premium').toLowerCase().trim() === 'free';
    if (!isFree && !isPremiumActive(auth.profile)) {
      return apiError(403, 'สื่อนี้สำหรับสมาชิก Premium', { needPremium: true });
    }

    const isStudent = auth.profile.role === 'student';
    let sessionId: string | null = null;
    let token: string | null = null;

    if (isStudent) {
      const limit = auth.profile.daily_limit_min;
      if (limit) {
        const used = await minutesPlayedToday(admin, auth.userId);
        if (used >= limit) {
          return apiError(429, `วันนี้เล่นครบ ${limit} นาทีแล้ว พักสายตาและมาเล่นใหม่พรุ่งนี้นะ`, { limitReached: true });
        }
      }
      const { data: session, error } = await admin
        .from('play_sessions')
        .insert({ student_id: auth.userId, media_id: media.id })
        .select('id')
        .single();
      if (error) throw error;
      sessionId = session.id;
      token = signPlayToken({ s: auth.userId, m: media.id, p: session.id });
    }

    // นับยอดเล่น (ครั้งละไม่เกิน 1 ครั้ง/นาที/คน/เกม)
    if (rateLimit(`view:${auth.userId}:${media.id}`, 1, 60 * 1000)) {
      await admin.rpc('increment_media_view', { p_media_id: media.id });
    }

    const base = String(media.game_url).split('#')[0];
    const hash = token
      ? `#l5g=${token}&api=${encodeURIComponent(siteOrigin(req))}&name=${encodeURIComponent(auth.profile.display_name || '')}`
      : '';

    return NextResponse.json({
      title: media.title,
      url: `${base}${hash}`,
      sessionId,
      tracked: !!token,
    });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}
