import { NextRequest, NextResponse } from 'next/server';
import { deleteTrialAccount } from '@/lib/server/trial-account';
import { clientIp, isSameOrigin, rateLimit } from '@/lib/server/rate-limit';

/** จบทดลองเล่น: ลบบัญชีทดลองทันที (ถ้าไม่ได้เรียก ตัวกวาดจะลบให้ภายหลัง) */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  if (!rateLimit(`trial-end:${clientIp(req)}`, 60, 10 * 60 * 1000)) return NextResponse.json({ ok: false }, { status: 429 });
  let n = '';
  try { n = String((await req.json())?.account || ''); } catch { /* ว่าง */ }
  try {
    return NextResponse.json({ ok: await deleteTrialAccount(n) });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
