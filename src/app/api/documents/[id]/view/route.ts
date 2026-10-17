import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { clientIp, isSameOrigin, limit } from '@/lib/server/rate-limit';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** นับยอดเปิดดูเอกสาร/ใบงาน: 1 ครั้ง/เอกสาร/10 นาที/IP และไม่เกิน 120 ครั้ง/ชม./IP */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id || '')) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  if (!isSameOrigin(req)) return NextResponse.json({ counted: false });
  const ip = clientIp(req);
  if (!(await limit(`docview:${ip}:${id}`, 1, 10 * 60 * 1000)) || !(await limit(`docview-ip:${ip}`, 120, 3600 * 1000))) {
    return NextResponse.json({ counted: false });
  }
  const { error } = await getAdminClient().rpc('increment_document_count', { p_id: id, p_download: false });
  return NextResponse.json({ counted: !error });
}
