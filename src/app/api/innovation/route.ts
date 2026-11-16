import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getEntTable } from '@/lib/server/entitlements';
import { clientIp, isSameOrigin, limit } from '@/lib/server/rate-limit';
import { tierOf } from '@/lib/entitlements';
import { INNOV_BUCKET, INNOV_FILE_TYPES, INNOV_MAX_MB, monthKey } from '@/lib/innovation';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const REQ_COLS = 'id, username, email, title, subject, grade, details, file_name, file_size, status, link, dev_note, revisions_used, month_key, created_at, updated_at, delivered_at';
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** ผู้ใช้ที่ล็อกอิน + สิทธิ์นวัตกรรมของแพ็กเกจ */
async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!p) return null;
  const tier = tierOf(p);
  const e = (await getEntTable())[tier];
  return { id: user.id, username: p.username as string, email: (p.contact_email as string) || '', tier, jobs: e.innovation_jobs, revisions: e.innovation_revisions };
}

/** ไฟล์ที่อ้างถึงต้องอยู่ในโฟลเดอร์ของผู้ใช้เองเท่านั้น */
function cleanFile(f: unknown, uid: string): { path: string; name: string; size: number } | null | 'bad' {
  if (!f || typeof f !== 'object') return null;
  const o = f as Record<string, unknown>;
  const path = str(o.path, 200);
  if (!new RegExp(`^${uid}/[0-9a-f-]{36}\\.[a-z]{3,4}$`).test(path)) return 'bad';
  return { path, name: str(o.name, 200) || 'ไฟล์แนบ', size: Math.max(0, Math.floor(Number(o.size) || 0)) };
}

/** รายการงานของฉัน + โควต้าเดือนนี้ */
export async function GET() {
  const u = await me();
  if (!u) return fail('เข้าสู่ระบบก่อน', 401);
  const admin = getAdminClient();
  const { data, error } = await admin.from('innovation_requests').select(REQ_COLS).eq('user_id', u.id).order('created_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ missing: true, tier: u.tier, jobs: u.jobs, revisions: u.revisions, used: 0, items: [], email: u.email });
  const ids = (data || []).map((r) => r.id);
  const { data: ev } = ids.length
    ? await admin.from('innovation_events').select('id, request_id, kind, by_dev, message, file_name, created_at').in('request_id', ids).order('created_at')
    : { data: [] };
  const mk = monthKey();
  const used = (data || []).filter((r) => r.month_key === mk && r.status !== 'cancelled').length;
  const items = (data || []).map((r) => ({ ...r, events: (ev || []).filter((e) => e.request_id === r.id) }));
  return NextResponse.json({ tier: u.tier, jobs: u.jobs, revisions: u.revisions, used, items, email: u.email, month: mk });
}

/**
 * op = upload-url  ขอลิงก์อัปโหลดไฟล์แผนการสอน { type, size }
 * op = create      ส่งงานใหม่ { title, subject, grade, details, email, file? }
 * op = revise      ขอแก้ไขงานที่ส่งแล้ว { id, message, file? }
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return fail('คำขอไม่ถูกต้อง', 403);
  const ip = clientIp(req);
  if (!(await limit(`innov:${ip}`, 30, 10 * 60 * 1000))) return fail('ทำรายการบ่อยเกินไป รอสักครู่แล้วลองใหม่', 429);
  const u = await me();
  if (!u) return fail('เข้าสู่ระบบก่อน', 401);
  if (u.jobs <= 0) return fail('สั่งทำนวัตกรรมได้เฉพาะแพ็กเกจ Master', 403);

  let b: Record<string, unknown> = {};
  try {
    b = await req.json();
  } catch {
    /* ว่าง */
  }
  const admin = getAdminClient();
  const op = String(b.op || '');

  if (op === 'upload-url') {
    const type = str(b.type, 120).toLowerCase();
    const ext = INNOV_FILE_TYPES[type];
    const size = Math.floor(Number(b.size));
    if (!ext) return fail('รองรับไฟล์ PDF Word PowerPoint และรูปภาพ');
    if (!Number.isFinite(size) || size <= 0) return fail('ไฟล์ว่างเปล่า');
    if (size > INNOV_MAX_MB * 1024 * 1024) return fail(`ไฟล์ใหญ่เกิน ${INNOV_MAX_MB} MB`, 413);
    const path = `${u.id}/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await admin.storage.from(INNOV_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return fail('ยังอัปโหลดไม่ได้ (รัน migration 030 แล้วหรือยัง)', 500);
    return NextResponse.json({ path, token: data.token });
  }

  if (op === 'create') {
    const title = str(b.title, 120);
    const email = str(b.email, 200).toLowerCase();
    const details = str(b.details, 4000);
    const file = cleanFile(b.file, u.id);
    if (!title) return fail('ตั้งชื่องานก่อน');
    if (!EMAIL.test(email)) return fail('อีเมลสำหรับรับงานไม่ถูกต้อง');
    if (file === 'bad') return fail('ไฟล์แนบไม่ถูกต้อง');
    if (!file && details.length < 20) return fail('แนบไฟล์แผนการสอน หรือเล่ารายละเอียดอย่างน้อย 20 ตัวอักษร');
    const mk = monthKey();
    // shortcut: นับแล้วค่อย insert (ไม่ใช่ธุรกรรมเดียว) ส่งพร้อมกันหลายแท็บอาจเกินโควต้าได้ 1 งาน, ถ้าเกิดจริงค่อยย้ายไปเป็น trigger
    const { count, error: cErr } = await admin
      .from('innovation_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', u.id)
      .eq('month_key', mk)
      .neq('status', 'cancelled');
    if (cErr) return fail('ระบบยังไม่พร้อม (ยังไม่ได้รัน migration 030)', 503);
    if ((count ?? 0) >= u.jobs) return fail(`เดือนนี้สั่งครบ ${u.jobs} งานแล้ว สั่งใหม่ได้เดือนหน้า`, 403);
    const { data: r, error } = await admin
      .from('innovation_requests')
      .insert({
        user_id: u.id,
        username: u.username,
        email,
        title,
        subject: str(b.subject, 60),
        grade: str(b.grade, 40),
        details,
        file_path: file?.path ?? null,
        file_name: file?.name ?? null,
        file_size: file?.size ?? null,
        month_key: mk,
      })
      .select('id')
      .single();
    if (error || !r) return fail('ส่งงานไม่สำเร็จ ลองใหม่อีกครั้ง', 500);
    await admin.from('innovation_events').insert({ request_id: r.id, kind: 'submit', message: details.slice(0, 4000), file_path: file?.path ?? null, file_name: file?.name ?? null });
    return NextResponse.json({ ok: true, id: r.id });
  }

  if (op === 'revise') {
    const id = String(b.id || '');
    const message = str(b.message, 4000);
    const file = cleanFile(b.file, u.id);
    if (!UUID.test(id)) return fail('ไม่พบงานนี้');
    if (file === 'bad') return fail('ไฟล์แนบไม่ถูกต้อง');
    if (message.length < 5) return fail('บอกสิ่งที่อยากให้แก้ก่อน');
    const { data: r } = await admin.from('innovation_requests').select('id, user_id, status, revisions_used').eq('id', id).maybeSingle();
    if (!r || r.user_id !== u.id) return fail('ไม่พบงานนี้', 404);
    if (r.status !== 'delivered') return fail('ขอแก้ไขได้หลังจากได้รับงานแล้ว');
    if (r.revisions_used >= u.revisions) return fail(`งานนี้ขอแก้ครบ ${u.revisions} ครั้งแล้ว`, 403);
    // จองสิทธิ์แก้ด้วยเงื่อนไขค่าเดิม กันกดซ้ำพร้อมกัน
    const { data: ok } = await admin
      .from('innovation_requests')
      .update({ status: 'revision', revisions_used: r.revisions_used + 1, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'delivered')
      .eq('revisions_used', r.revisions_used)
      .select('id')
      .maybeSingle();
    if (!ok) return fail('งานนี้ถูกอัปเดตไปแล้ว รีเฟรชหน้าแล้วลองใหม่');
    await admin.from('innovation_events').insert({ request_id: id, kind: 'revision', message, file_path: file?.path ?? null, file_name: file?.name ?? null });
    return NextResponse.json({ ok: true });
  }

  return fail('คำขอไม่ถูกต้อง');
}
