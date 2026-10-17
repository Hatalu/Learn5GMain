import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { checkUnsubscribeToken } from '@/lib/server/email';
import { clientIp, limit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const page = (title: string, msg: string, status = 200) =>
  new NextResponse(
    `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4efff;font-family:Tahoma,'Noto Sans Thai',Arial,sans-serif;color:#2a2350;padding:16px">
<div style="max-width:420px;background:#fff8ec;border:3px solid #2a2350;border-radius:24px;padding:28px;text-align:center;box-shadow:0 6px 0 #2a2350">
<h1 style="font-size:22px;margin:0 0 10px">${title}</h1><p style="margin:0 0 18px;line-height:1.6">${msg}</p>
<a href="/home" style="display:inline-block;background:#ffcf3f;color:#2a2350;text-decoration:none;font-weight:bold;padding:10px 20px;border:3px solid #2a2350;border-radius:14px">กลับหน้าหลัก</a></div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } }
  );

async function unsubscribe(req: NextRequest) {
  if (!(await limit(`unsub:${clientIp(req)}`, 30, 3600 * 1000))) return null;
  const u = req.nextUrl.searchParams.get('u') || '';
  const t = req.nextUrl.searchParams.get('t') || '';
  if (!UUID.test(u) || !checkUnsubscribeToken(u, t)) return false;
  const { error } = await getAdminClient().from('profiles').update({ email_opt_out: true }).eq('id', u);
  return !error;
}

/** กดลิงก์ยกเลิกรับอีเมล (ลิงก์ลงชื่อ HMAC ต่อบัญชี) */
export async function GET(req: NextRequest) {
  const ok = await unsubscribe(req);
  if (ok === null) return page('ลองใหม่ภายหลัง', 'มีคำขอมากเกินไป รอสักครู่แล้วกดลิงก์อีกครั้งนะ', 429);
  if (!ok) return page('ลิงก์ไม่ถูกต้อง', 'ลิงก์นี้ใช้ไม่ได้ ถ้าต้องการยกเลิกรับอีเมล ติดต่อแอดมินทางเพจได้เลย', 400);
  return page('ยกเลิกรับอีเมลแล้ว', 'เราจะไม่ส่งอีเมลแนะนำถึงคุณอีก บัญชีและชุดคำถามของคุณยังอยู่ครบ');
}

/** One-Click Unsubscribe จากแอปอีเมล (RFC 8058) */
export async function POST(req: NextRequest) {
  const ok = await unsubscribe(req);
  return NextResponse.json({ ok: !!ok }, { status: ok ? 200 : 400 });
}
