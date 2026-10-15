import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const DAYS = 14;

/** สถิติการเข้าเว็บ (เฉพาะ Dev): รวม/วันนี้/7 วัน/30 วัน แยกผู้เยี่ยมชม-สมาชิก + กราฟรายวัน */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!me || me.role !== 'dev') return NextResponse.json({ error: 'สำหรับ Dev เท่านั้น' }, { status: 403 });

  const admin = getAdminClient();
  const since = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
  const bkkMidnight = new Date(new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10) + 'T00:00:00+07:00').toISOString();
  const count = (from?: string, members?: boolean) => {
    let q = admin.from('site_visits').select('*', { count: 'exact', head: true });
    if (from) q = q.gte('created_at', from);
    if (members === true) q = q.not('user_id', 'is', null);
    if (members === false) q = q.is('user_id', null);
    return q;
  };

  const [total, today, d7, d30, members30, guests30, daily] = await Promise.all([
    count(),
    count(bkkMidnight),
    count(since(7)),
    count(since(30)),
    count(since(30), true),
    count(since(30), false),
    admin.rpc('visit_daily', { p_days: DAYS }),
  ]);
  if (total.error) return NextResponse.json({ missing: true });

  // เติมวันที่ว่างให้ครบ 14 วัน (เวลาไทย)
  const map = new Map<string, { guests: number; members: number }>();
  for (const r of (daily.data || []) as { day: string; guests: number; members: number }[]) {
    map.set(String(r.day).slice(0, 10), { guests: Number(r.guests), members: Number(r.members) });
  }
  const todayBkk = new Date(Date.now() + 7 * 3600000);
  const series = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(todayBkk.getTime() - (DAYS - 1 - i) * 86400000).toISOString().slice(0, 10);
    const v = map.get(d) || { guests: 0, members: 0 };
    return { day: d, ...v };
  });

  return NextResponse.json({
    total: total.count || 0,
    today: today.count || 0,
    d7: d7.count || 0,
    d30: d30.count || 0,
    members30: members30.count || 0,
    guests30: guests30.count || 0,
    series,
  });
}
