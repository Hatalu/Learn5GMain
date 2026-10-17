import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { clientIp, isSameOrigin, limit } from '@/lib/server/rate-limit';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// กันปั่นยอดเบื้องต้น: 1 ครั้ง/นาที ต่อ IP ต่อสื่อ (ในหน่วยความจำ)
const seen = new Map<string, number>();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: mediaId } = await params;
  if (!mediaId || !UUID.test(mediaId)) {
    return NextResponse.json({ error: 'Invalid media id' }, { status: 400 });
  }

  if (!isSameOrigin(req)) return NextResponse.json({ success: true, counted: false });
  const ip = clientIp(req);
  const key = `${ip}:${mediaId}`;
  const now = Date.now();
  if (now - (seen.get(key) || 0) < 60_000) {
    return NextResponse.json({ success: true, counted: false });
  }
  seen.set(key, now);
  if (seen.size > 5000) seen.clear();
  // กันปั่นยอด: 1 ครั้ง/สื่อ/10 นาที และไม่เกิน 120 ครั้ง/ชั่วโมงต่อ IP (ใช้ร่วมทุกเครื่อง)
  if (!(await limit(`view:${key}`, 1, 10 * 60 * 1000)) || !(await limit(`view-ip:${ip}`, 120, 3600 * 1000))) {
    return NextResponse.json({ success: true, counted: false });
  }

  try {
    // ฟังก์ชันนับยอดถูกจำกัดให้เรียกได้เฉพาะฝั่งเซิร์ฟเวอร์ (migration 004)
    const { error } = await getAdminClient().rpc('increment_media_view', { p_media_id: mediaId });
    if (error) throw error;
    return NextResponse.json({ success: true, counted: true });
  } catch (err: unknown) {
    console.error('view count error', err);
    return NextResponse.json({ error: 'error' }, { status: 500 });
  }
}
