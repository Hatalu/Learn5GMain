import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const PAGE = 50;

/** บันทึกการเข้าเว็บรายครั้งของผู้ที่มีบัญชีเท่านั้น (เฉพาะ Dev): ?before=<id> ใหม่สุดก่อน ทีละ 50 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!me || me.role !== 'dev') return NextResponse.json({ error: 'สำหรับ Dev เท่านั้น' }, { status: 403 });

  const before = Number(req.nextUrl.searchParams.get('before'));

  const run = (cols: string) => {
    let q = getAdminClient()
      .from('site_visits')
      .select(`${cols}, profiles(username, display_name, premium_until)`)
      .not('user_id', 'is', null)
      .order('id', { ascending: false })
      .limit(PAGE);
    if (Number.isFinite(before) && before > 0) q = q.lt('id', before);
    return q;
  };

  let res = await run('id, created_at, user_id, device, path');
  // ยังไม่ได้รัน migration 028: ไม่มีคอลัมน์ device/path
  const old = !!res.error;
  if (old) res = await run('id, created_at, user_id');
  if (res.error) return NextResponse.json({ missing: true });

  type Row = {
    id: number;
    created_at: string;
    user_id: string | null;
    device?: string | null;
    path?: string | null;
    profiles: { username: string; display_name: string | null; premium_until: string | null } | null;
  };
  const rows = ((res.data || []) as unknown as Row[]).map((r) => ({
    id: r.id,
    at: r.created_at,
    member: !!r.user_id,
    username: r.profiles?.username || null,
    name: r.profiles?.display_name || null,
    paid: !!r.profiles?.premium_until && new Date(r.profiles.premium_until).getTime() > Date.now(),
    device: r.device || null,
    path: r.path || null,
  }));
  return NextResponse.json({ rows, more: rows.length === PAGE, old });
}
