/**
 * Cloudflare Turnstile (กันบอทแบบไม่ต้องให้คนกดภาพ) ฝั่งเซิร์ฟเวอร์
 * เปิดใช้เมื่อมี TURNSTILE_SECRET_KEY (คู่กับ NEXT_PUBLIC_TURNSTILE_SITE_KEY ฝั่งหน้าเว็บ)
 * ถ้าไม่ได้ตั้งค่า จะข้ามการตรวจ (เว็บทำงานเหมือนเดิม)
 */
export const turnstileEnabled = () => !!process.env.TURNSTILE_SECRET_KEY;

export async function verifyTurnstile(token: string | null | undefined, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== 'unknown') body.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    const j = (await res.json()) as { success?: boolean };
    return !!j.success;
  } catch {
    return false;
  }
}
