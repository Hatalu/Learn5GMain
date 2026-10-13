import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// กันปั่นยอดเบื้องต้น: 1 ครั้ง/นาที ต่อ IP ต่อสื่อ (ในหน่วยความจำ)
const seen = new Map<string, number>();

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const mediaId = params.id;
  if (!mediaId || !UUID.test(mediaId)) {
    return NextResponse.json({ error: 'Invalid media id' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `${ip}:${mediaId}`;
  const now = Date.now();
  if (now - (seen.get(key) || 0) < 60_000) {
    return NextResponse.json({ success: true, counted: false });
  }
  seen.set(key, now);
  if (seen.size > 5000) seen.clear();

  try {
    // ฟังก์ชันนับยอดถูกจำกัดให้เรียกได้เฉพาะฝั่งเซิร์ฟเวอร์ (migration 004)
    const { error } = await getAdminClient().rpc('increment_media_view', { p_media_id: mediaId });
    if (error) throw error;
    return NextResponse.json({ success: true, counted: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error incrementing view';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
