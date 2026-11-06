import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { showcaseRows, type ShowcaseItem } from '@/lib/game-creator/showcase';

export const dynamic = 'force-dynamic';

const TTL = 10 * 60 * 1000;
let cache: { at: number; items: ShowcaseItem[] } | null = null;

/** ผลงานครูบนหน้าแรก (RLS ให้เฉพาะสมาชิกอ่านชุดคนอื่น จึงต้องผ่านเซิร์ฟเวอร์) แคช 10 นาที */
export async function GET() {
  if (!cache || Date.now() - cache.at > TTL) {
    const { data, error } = await getAdminClient()
      .from('user_games')
      .select('id, title, question_count, cover_url')
      .eq('is_public', true)
      .order('play_count', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(60);
    if (error) return NextResponse.json({ items: [] });
    cache = { at: Date.now(), items: showcaseRows(data || []) };
  }
  return NextResponse.json({ items: cache.items }, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300' } });
}
