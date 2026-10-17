import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { RENEW_BONUS_DAYS, RENEW_WINDOW_DAYS } from '@/lib/plans';
import { emailConfigured, sendEmail, siteUrl, unsubscribeToken, winbackEmail } from '@/lib/server/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Resend ฟรีส่งได้ 100 ฉบับต่อวัน เผื่อไว้ */
const MAX_PER_RUN = 80;
const DAY = 86400000;

/** Vercel Cron ส่ง Authorization: Bearer <CRON_SECRET> มาเอง คนอื่นเรียกไม่ได้ */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(req.headers.get('authorization') || '');
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * อีเมลชวนกลับ (รันวันละครั้งตอน 09:00 น. เวลาไทย ดู vercel.json)
 * ส่งหาคนที่สมาชิกหมดอายุในช่วง RENEW_WINDOW_DAYS วันที่ผ่านมา (ยังได้โบนัสต่ออายุ)
 * มีอีเมล ไม่ได้กดยกเลิกรับอีเมล และยังไม่เคยได้อีเมลนี้สำหรับวันหมดอายุรอบนี้
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!emailConfigured()) return NextResponse.json({ skipped: 'email-not-configured' });
  const site = siteUrl();
  if (!site) return NextResponse.json({ skipped: 'site-url-not-set' });

  const admin = getAdminClient();
  const now = Date.now();
  const { data: rows, error } = await admin
    .from('profiles')
    .select('id, username, contact_email, premium_until, winback_for')
    .neq('role', 'dev')
    .eq('email_opt_out', false)
    .not('contact_email', 'is', null)
    .lt('premium_until', new Date(now).toISOString())
    .gte('premium_until', new Date(now - RENEW_WINDOW_DAYS * DAY).toISOString())
    .order('premium_until', { ascending: true })
    .limit(500);
  if (error) return NextResponse.json({ error: 'query-failed (migration 020?)' }, { status: 500 });

  const due = (rows || []).filter((r) => !r.winback_for || new Date(r.winback_for).getTime() !== new Date(r.premium_until).getTime()).slice(0, MAX_PER_RUN);

  let sent = 0;
  let failed = 0;
  for (const r of due) {
    const { count } = await admin.from('user_games').select('id', { count: 'exact', head: true }).eq('owner_id', r.id);
    const bonusUntil = new Date(new Date(r.premium_until).getTime() + RENEW_WINDOW_DAYS * DAY).toISOString();
    const unsubscribe = `${site}/api/email/unsubscribe?u=${r.id}&t=${unsubscribeToken(r.id)}`;
    const mail = winbackEmail({ username: r.username, sets: count || 0, bonusDays: RENEW_BONUS_DAYS, bonusUntil, site, unsubscribe });
    const res = await sendEmail(r.contact_email as string, mail.subject, mail.html, unsubscribe);
    if (res.ok) {
      sent++;
      await admin.from('profiles').update({ winback_for: r.premium_until }).eq('id', r.id);
    } else {
      failed++;
    }
  }
  return NextResponse.json({ candidates: due.length, sent, failed });
}
