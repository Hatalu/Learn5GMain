import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { isSameOrigin } from '@/lib/server/rate-limit';
import { CODE_LEN, makeCode } from '@/lib/redeem';

export const dynamic = 'force-dynamic';

/** สุ่มจนได้ครบ 10 ตัว (ไบต์ที่ถูกตัดทิ้งอาจทำให้สั้นกว่า ซึ่งแทบไม่เกิด) */
function newCode(): string {
  for (;;) {
    const c = makeCode(crypto.randomBytes(24));
    if (c.length === CODE_LEN) return c;
  }
}

async function verifyDev() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'กรุณาเข้าสู่ระบบ' };
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!p || p.role !== 'dev') return { ok: false, status: 403, error: 'สำหรับ Dev เท่านั้น' };
  return { ok: true, status: 200, error: '' };
}

const dbError = (m: string) => (/relation|does not exist|schema cache/i.test(m) ? 'ยังไม่ได้รัน migration 027_redeem_codes.sql' : m);

/** รายการโค้ดทั้งหมด (ล่าสุดก่อน) */
export async function GET() {
  const c = await verifyDev();
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: c.status });
  const { data, error } = await getAdminClient()
    .from('redeem_codes')
    .select('code, days, created_at, used_username, used_at')
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) return NextResponse.json({ error: dbError(error.message) }, { status: 500 });
  return NextResponse.json({ codes: data || [] });
}

/** POST {count, days} สร้างโค้ดใหม่ | {action:'delete', code} ลบโค้ดที่ยังไม่ถูกใช้ */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const c = await verifyDev();
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: c.status });
  let body: { count?: unknown; days?: unknown; action?: unknown; code?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* ว่าง */
  }
  const admin = getAdminClient();

  if (body.action === 'delete') {
    const { error } = await admin.from('redeem_codes').delete().eq('code', String(body.code || '')).is('used_at', null);
    if (error) return NextResponse.json({ error: dbError(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const count = Math.round(Number(body.count));
  const days = Math.round(Number(body.days));
  if (!(count >= 1 && count <= 200)) return NextResponse.json({ error: 'จำนวนโค้ด 1-200' }, { status: 400 });
  if (!(days >= 1 && days <= 3650)) return NextResponse.json({ error: 'จำนวนวัน 1-3650' }, { status: 400 });

  const made = new Set<string>();
  while (made.size < count) made.add(newCode());
  // ชนกับโค้ดเก่า (โอกาสน้อยมาก) ข้ามแถวนั้นไป แล้วสุ่มเติมอีกรอบ
  const out: string[] = [];
  for (let round = 0; round < 3 && out.length < count; round++) {
    const rows = [...made].map((code) => ({ code, days }));
    const { data, error } = await admin.from('redeem_codes').upsert(rows, { onConflict: 'code', ignoreDuplicates: true }).select('code');
    if (error) return NextResponse.json({ error: dbError(error.message) }, { status: 500 });
    out.push(...(data || []).map((r) => r.code as string));
    made.clear();
    while (made.size < count - out.length) made.add(newCode());
  }
  return NextResponse.json({ codes: out, days });
}
