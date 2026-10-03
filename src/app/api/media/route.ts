import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('API /api/media error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mapped = (data || []).map((m: any) => ({
      ...m,
      access_tier: m.access_tier || 'premium',
    }));

    return NextResponse.json({ media: mapped });
  } catch (err: any) {
    console.error('API /api/media unexpected error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
