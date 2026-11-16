import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { verifyDev } from '@/lib/server/dev-auth';
import { isSameOrigin } from '@/lib/server/rate-limit';
import { getEntTable } from '@/lib/server/entitlements';
import { emailConfigured, innovationEmail, sendEmail, siteUrl } from '@/lib/server/email';
import { tierOf } from '@/lib/entitlements';
import { INNOV_BUCKET, INNOV_STATUS, isInnovStatus } from '@/lib/innovation';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * ทุกงาน + ประวัติ (ล่าสุดก่อน 300 งาน)
 * ?file=<path> = ลิงก์ดาวน์โหลดไฟล์แนบ 5 นาที
 */
export async function GET(req: NextRequest) {
  const c = await verifyDev();
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: c.status });
  const admin = getAdminClient();
  const file = req.nextUrl.searchParams.get('file');
  if (file) {
    if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z]{3,4}$/.test(file)) return NextResponse.json({ error: 'ไฟล์ไม่ถูกต้อง' }, { status: 400 });
    const { data, error } = await admin.storage.from(INNOV_BUCKET).createSignedUrl(file, 300);
    if (error || !data) return NextResponse.json({ error: 'หาไฟล์ไม่เจอ' }, { status: 404 });
    return NextResponse.json({ url: data.signedUrl });
  }
  const { data, error } = await admin.from('innovation_requests').select('*').order('created_at', { ascending: false }).limit(300);
  if (error) return NextResponse.json({ missing: true, items: [], email: emailConfigured() });
  const ids = (data || []).map((r) => r.id);
  const { data: ev } = ids.length ? await admin.from('innovation_events').select('*').in('request_id', ids).order('created_at') : { data: [] };
  return NextResponse.json({ items: (data || []).map((r) => ({ ...r, events: (ev || []).filter((e) => e.request_id === r.id) })), email: emailConfigured() });
}

/** อัปเดตงาน { id, status, link?, note?, notify? } ส่งงาน (delivered) + notify = ส่งอีเมลลิงก์ให้ครู */
export async function PUT(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const c = await verifyDev();
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: c.status });
  let b: Record<string, unknown> = {};
  try {
    b = await req.json();
  } catch {
    /* ว่าง */
  }
  const id = String(b.id || '');
  if (!UUID.test(id)) return NextResponse.json({ error: 'ไม่พบงาน' }, { status: 400 });
  if (!isInnovStatus(b.status)) return NextResponse.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 });
  const status = b.status;
  const link = String(b.link ?? '').trim().slice(0, 1000);
  const note = String(b.note ?? '').trim().slice(0, 2000);
  if (status === 'delivered' && !/^https?:\/\/\S+$/i.test(link)) return NextResponse.json({ error: 'ส่งงานต้องใส่ลิงก์ที่ขึ้นต้นด้วย http(s)://' }, { status: 400 });

  const admin = getAdminClient();
  const { data: r } = await admin.from('innovation_requests').select('*').eq('id', id).maybeSingle();
  if (!r) return NextResponse.json({ error: 'ไม่พบงาน' }, { status: 404 });
  const now = new Date().toISOString();
  const { error } = await admin
    .from('innovation_requests')
    .update({ status, link: link || r.link, dev_note: note, updated_at: now, ...(status === 'delivered' ? { delivered_at: now } : {}) })
    .eq('id', id);
  if (error) return NextResponse.json({ error: 'บันทึกไม่สำเร็จ' }, { status: 500 });
  await admin.from('innovation_events').insert({
    request_id: id,
    kind: status === 'delivered' ? 'deliver' : 'status',
    by_dev: true,
    message: status === 'delivered' ? [link, note].filter(Boolean).join('\n') : `${INNOV_STATUS[status]}${note ? `\n${note}` : ''}`,
  });

  let mail: 'sent' | 'off' | 'failed' | null = null;
  if (status === 'delivered' && b.notify) {
    if (!emailConfigured()) mail = 'off';
    else {
      const { data: p } = await admin.from('profiles').select('*').eq('id', r.user_id).maybeSingle();
      const ents = await getEntTable();
      const left = Math.max(0, ents[tierOf(p)].innovation_revisions - r.revisions_used);
      const m = innovationEmail({ username: r.username, title: r.title, link, note, revision: r.revisions_used > 0, revisionsLeft: left, site: siteUrl() || 'https://learn5g-th.online' });
      mail = (await sendEmail(r.email, m.subject, m.html)).ok ? 'sent' : 'failed';
    }
  }
  return NextResponse.json({ ok: true, mail });
}
