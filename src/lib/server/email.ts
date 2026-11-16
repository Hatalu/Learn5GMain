/**
 * ส่งอีเมล (ฝั่งเซิร์ฟเวอร์เท่านั้น) ผ่าน Resend REST API
 * ตั้งค่าบน Vercel: RESEND_API_KEY, EMAIL_FROM (เช่น "สื่อการสอน 5G <hello@yourdomain.com>")
 * ยังไม่ตั้ง = ไม่ส่ง (คืน not-configured) ระบบอื่นทำงานปกติ
 */
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

export function siteUrl(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
  return u.replace(/\/+$/, '');
}

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** อีเมลส่งงานนวัตกรรม (ตาราง inline style ให้แสดงผลได้ทุกแอปอีเมล ขาว-ดำ ไม่มีอิโมจิ) */
export function innovationEmail(o: { username: string; title: string; link: string; note: string; revision: boolean; revisionsLeft: number; site: string }) {
  const t = escapeHtml(o.title);
  const subject = (o.revision ? 'งานแก้ไขเสร็จแล้ว: ' : 'นวัตกรรมของคุณพร้อมแล้ว: ') + o.title;
  const note = o.note ? '<tr><td style="padding:0 0 20px;font-size:15px;line-height:1.7;color:#404040">' + escapeHtml(o.note).split('\n').join('<br>') + '</td></tr>' : '';
  const html =
    '<!doctype html><html lang="th"><body style="margin:0;padding:0;background:#f5f5f5;font-family:Tahoma,Arial,sans-serif">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 12px"><tr><td align="center">' +
    '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e5e5e5;border-radius:20px;padding:36px">' +
    '<tr><td style="padding:0 0 6px;font-size:12px;letter-spacing:2px;color:#737373">LEARN5G</td></tr>' +
    '<tr><td style="padding:0 0 18px;font-size:22px;color:#0a0a0a">' + t + '</td></tr>' +
    '<tr><td style="padding:0 0 20px;font-size:15px;line-height:1.7;color:#404040">สวัสดีครับ คุณ ' + escapeHtml(o.username) + ' ' + (o.revision ? 'งานที่ขอแก้ไขเสร็จเรียบร้อยแล้ว' : 'นวัตกรรมตามแผนการสอนของคุณเสร็จเรียบร้อยแล้ว') + '</td></tr>' +
    note +
    '<tr><td style="padding:0 0 24px"><a href="' + escapeHtml(o.link) + '" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:15px">เปิดนวัตกรรม</a></td></tr>' +
    '<tr><td style="padding:0 0 6px;font-size:13px;color:#737373">ขอแก้ไขได้อีก ' + o.revisionsLeft + ' ครั้ง ที่หน้า <a href="' + escapeHtml(o.site) + '/innovation" style="color:#0a0a0a">สั่งทำนวัตกรรม</a></td></tr>' +
    '</table></td></tr></table></body></html>';
  return { subject, html };
}
