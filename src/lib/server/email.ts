/**
 * ส่งอีเมล (ฝั่งเซิร์ฟเวอร์เท่านั้น) ผ่าน Resend REST API
 * ตั้งค่าบน Vercel: RESEND_API_KEY, EMAIL_FROM (เช่น "สื่อการสอน 5G <hello@yourdomain.com>")
 * ยังไม่ตั้ง = ไม่ส่ง (คืน not-configured) ระบบอื่นทำงานปกติ
 */
import crypto from 'crypto';

export const emailConfigured = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;

export async function sendEmail(to: string, subject: string, html: string, unsubscribeUrl?: string): Promise<{ ok: boolean; error?: string }> {
  if (!emailConfigured()) return { ok: false, error: 'not-configured' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject,
        html,
        ...(unsubscribeUrl ? { headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}),
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ok: false, error: `HTTP_${res.status}` };
    return { ok: true };
  } catch {
    return { ok: false, error: 'network' };
  }
}

/* ------------------------------------------------------------------ */
/* ลิงก์ยกเลิกรับอีเมล: ลงชื่อด้วย HMAC กันคนเดา id แล้วยกเลิกให้คนอื่น  */
/* ------------------------------------------------------------------ */

const secret = () => process.env.EMAIL_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function unsubscribeToken(userId: string): string {
  return crypto.createHmac('sha256', secret()).update(`unsub:${userId}`).digest('base64url').slice(0, 32);
}

export function checkUnsubscribeToken(userId: string, token: string): boolean {
  if (!secret() || !token) return false;
  const a = Buffer.from(unsubscribeToken(userId));
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function siteUrl(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
  return u.replace(/\/+$/, '');
}

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** อีเมลชวนกลับ (ตารางแบบ inline style ให้แสดงผลได้ในทุกแอปอีเมล ไม่มีอิโมจิ) */
export function winbackEmail(opts: { username: string; sets: number; bonusDays: number; bonusUntil: string | null; site: string; unsubscribe: string }) {
  const name = escapeHtml(opts.username);
  const subject = opts.sets > 0 ? `ถึงเวลากลับมาแล้ว ชุดคำถามของคุณยังรออยู่ ${opts.sets} ชุด` : 'ถึงเวลากลับมาแล้ว เกมใหม่รอคุณอยู่';
  const until = opts.bonusUntil ? new Date(opts.bonusUntil).toLocaleDateString('th-TH', { dateStyle: 'long', timeZone: 'Asia/Bangkok' }) : '';
  const line =
    opts.sets > 0
      ? `ชุดคำถามที่คุณสร้างไว้ <b>${opts.sets} ชุด</b> ยังอยู่ครบ ต่ออายุสมาชิกแล้วเปิดห้องเล่นกับนักเรียนต่อได้ทันที`
      : 'เกมการเรียนรู้ทุกวิชายังรอคุณอยู่ ต่ออายุสมาชิกแล้วเล่นได้ทันที';
  const bonus =
    opts.bonusDays > 0 && until
      ? `<tr><td style="padding:14px 18px;background:#d8fbef;border:3px solid #2a2350;border-radius:16px;font-size:16px;color:#2a2350"><b>ต่ออายุภายใน ${escapeHtml(until)}</b> ด้วยแพลนตั้งแต่ 7 วัน รับเพิ่ม <b>${opts.bonusDays} วันฟรี</b></td></tr><tr><td style="height:16px"></td></tr>`
      : '';
  const html = `<!doctype html><html lang="th"><body style="margin:0;padding:0;background:#f4efff;font-family:Tahoma,'Noto Sans Thai',Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efff;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff8ec;border:3px solid #2a2350;border-radius:24px;padding:28px 24px">
<tr><td style="font-size:14px;font-weight:bold;color:#7a5cff">สื่อการสอน 5G</td></tr>
<tr><td style="padding-top:8px;font-size:24px;font-weight:bold;color:#2a2350">สวัสดีคุณ ${name}<br>ถึงเวลากลับมาแล้ว</td></tr>
<tr><td style="padding:12px 0 18px;font-size:16px;line-height:1.6;color:#2a2350">สมาชิกของคุณหมดอายุแล้ว ${line}</td></tr>
${bonus}
<tr><td align="center" style="padding:6px 0 18px"><a href="${opts.site}/membership" style="display:inline-block;background:#ffcf3f;color:#2a2350;text-decoration:none;font-weight:bold;font-size:18px;padding:14px 28px;border:3px solid #2a2350;border-radius:16px">ต่ออายุสมาชิก</a></td></tr>
<tr><td style="font-size:12px;color:#6b6585;line-height:1.6">ได้รับอีเมลนี้เพราะคุณเคยเป็นสมาชิกของสื่อการสอน 5G<br><a href="${opts.unsubscribe}" style="color:#6b6585">ยกเลิกรับอีเมล</a></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html };
}
