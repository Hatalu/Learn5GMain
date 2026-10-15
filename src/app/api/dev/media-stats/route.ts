import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** สถิติรายสื่อ (เฉพาะ Dev): จำนวนครั้งที่กดเล่น (view_count) / ทดลองเล่น / ถูกใจ */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!me || me.role !== 'dev') return NextResponse.json({ error: 'สำหรับ Dev เท่านั้น' }, { status: 403 });

  const id = req.nextUrl.searchParams.get('id') || '';
  if (!UUID.test(id)) return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });

  const admin = getAdminClient();
  const since = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
  const trials = (from?: string) => {
    let q = admin.from('trial_plays').select('*', { count: 'exact', head: true }).eq('media_id', id);
    if (from) q = q.gte('created_at', from);
    return q;
  };
  const bkkMidnight = new Date(new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10) + 'T00:00:00+07:00').toISOString();

  const [media, tAll, tToday, t7, t30, favs] = await Promise.all([
    admin.from('media').select('title, view_count').eq('id', id).maybeSingle(),
    trials(),
    trials(bkkMidnight),
    trials(since(7)),
    trials(since(30)),
    admin.from('favorites').select('*', { count: 'exact', head: true }).eq('media_id', id),
  ]);
  if (!media.data) return NextResponse.json({ error: 'ไม่พบสื่อ' }, { status: 404 });
  return NextResponse.json({
    title: media.data.title,
    plays: media.data.view_count || 0,
    favorites: favs.count || 0,
    trials: { total: tAll.count || 0, today: tToday.count || 0, d7: t7.count || 0, d30: t30.count || 0 },
    trialsReady: !tAll.error,
  });
}
