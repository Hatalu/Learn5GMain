import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { clientIp, isSameOrigin, rateLimit } from '@/lib/server/security';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * นับยอดเล่นของผู้เยี่ยมชมที่ยังไม่ล็อกอิน (สื่อฟรีเท่านั้น)
 * - ผู้ที่ล็อกอินนับผ่าน /api/play/start อยู่แล้ว
 * - จำกัด 1 ครั้ง/นาที ต่อ IP ต่อสื่อ กันปั่นยอด
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const mediaId = params.id;
  if (!UUID.test(mediaId)) return NextResponse.json({ error: 'Invalid media id' }, { status: 400 });

  if (!rateLimit(`guestview:${clientIp(req)}:${mediaId}`, 1, 60 * 1000)) {
    return NextResponse.json({ success: true, counted: false });
  }

  try {
    const admin = getAdminClient();
    const { data: media } = await admin.from('media').select('access_tier, is_public').eq('id', mediaId).maybeSingle();
    if (!media || media.is_public === false || String(media.access_tier).toLowerCase() !== 'free') {
      return NextResponse.json({ success: true, counted: false });
    }
    await admin.rpc('increment_media_view', { p_media_id: mediaId });
    return NextResponse.json({ success: true, counted: true });
  } catch {
    return NextResponse.json({ error: 'Error incrementing view' }, { status: 500 });
  }
}
