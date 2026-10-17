import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient, deleteMember } from '@/lib/supabase/admin';
import { TRIAL_PREFIX, sweepTrialAccounts } from '@/lib/server/trial-account';
import { isSameOrigin } from '@/lib/server/rate-limit';

async function verifyDev() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'กรุณาเข้าสู่ระบบ' };
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!p || p.role !== 'dev') return { ok: false, status: 403, error: 'สำหรับ Dev เท่านั้น' };
  return { ok: true, status: 200, error: '' };
}

/** รายการบัญชีทดลองเล่น (แยกจากสมาชิกปกติ) */
export async function GET() {
  const c = await verifyDev();
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: c.status });
  const { data, error } = await getAdminClient()
    .from('profiles')
    .select('id, username, premium_until, created_at')
    .like('username', `${TRIAL_PREFIX}%`)
    .eq('role', 'member')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accounts: data || [] });
}

/** POST {action:'sweep'} ลบที่หมดอายุ | {action:'purge'} ลบบัญชีทดลองทั้งหมด */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const c = await verifyDev();
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: c.status });
  let action = '';
  try { action = String((await req.json())?.action || ''); } catch { /* ว่าง */ }
  try {
    if (action === 'sweep') return NextResponse.json({ deleted: await sweepTrialAccounts() });
    if (action === 'purge') {
      const { data } = await getAdminClient().from('profiles').select('id').like('username', `${TRIAL_PREFIX}%`).eq('role', 'member').limit(200);
      let n = 0;
      for (const p of data || []) { try { await deleteMember(p.id); n++; } catch { /* ข้าม */ } }
      return NextResponse.json({ deleted: n });
    }
    return NextResponse.json({ error: 'คำสั่งไม่ถูกต้อง' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'ผิดพลาด' }, { status: 500 });
  }
}
