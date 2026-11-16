import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { verifyDev } from '@/lib/server/dev-auth';
import { clearEntCache, getEntTable } from '@/lib/server/entitlements';
import { isSameOrigin } from '@/lib/server/rate-limit';
import { DEFAULT_ENTS, TIERS, cleanEnt, isTier } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

/** สิทธิ์ของทุกแพ็กเกจ + บอกว่ารัน migration 030 แล้วหรือยัง */
export async function GET() {
  const c = await verifyDev();
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: c.status });
  const { error } = await getAdminClient().from('plan_entitlements').select('tier').limit(1);
  return NextResponse.json({ ents: await getEntTable(true), missing: !!error });
}

/** บันทึกสิทธิ์ของแพ็กเกจเดียว { tier, ...ค่า } */
export async function PUT(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const c = await verifyDev();
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: c.status });
  let b: Record<string, unknown> = {};
  try {
    b = await req.json();
  } catch {
    /* ว่าง */
  }
  if (!isTier(b.tier)) return NextResponse.json({ error: `แพ็กเกจต้องเป็น ${TIERS.join('/')}` }, { status: 400 });
  const cur = (await getEntTable(true))[b.tier] ?? DEFAULT_ENTS[b.tier];
  const e = cleanEnt(b, cur);
  const { error } = await getAdminClient()
    .from('plan_entitlements')
    .upsert({ tier: b.tier, ...e, updated_at: new Date().toISOString() }, { onConflict: 'tier' });
  if (error) return NextResponse.json({ error: /plan_entitlements/.test(error.message) ? 'ยังไม่ได้รัน migration 030' : 'บันทึกไม่สำเร็จ' }, { status: 500 });
  clearEntCache();
  return NextResponse.json({ ok: true, ents: await getEntTable(true) });
}
