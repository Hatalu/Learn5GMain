import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'dev') {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (สำหรับ Dev เท่านั้น)' }, { status: 403 });
  }

  try {
    const admin = getAdminClient();

    // 1. Total Media
    const { count: totalMedia } = await admin
      .from('media')
      .select('*', { count: 'exact', head: true });

    // 2. Total Members
    const { count: totalMembers } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // 3. Total Views (sum of view_count)
    const { data: viewsData } = await admin
      .from('media')
      .select('view_count');

    const totalViews = viewsData?.reduce((acc, curr) => acc + (curr.view_count || 0), 0) || 0;

    // 4. Total Favorites
    const { count: totalFavorites } = await admin
      .from('favorites')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      stats: {
        totalMedia: totalMedia || 0,
        totalMembers: totalMembers || 0,
        totalViews,
        totalFavorites: totalFavorites || 0,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching stats';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
