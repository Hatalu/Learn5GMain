import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { isSameOrigin } from '@/lib/server/rate-limit';
import { extendUntil } from '@/lib/server/payments';
import { CONTEST_COLS, MISSING_MSG, isMissing, toContest } from '@/lib/server/contest';
import { cleanPrizes, phaseOf, pickWinners, type Winner } from '@/lib/worksheet/contest';
import { cleanText } from '@/lib/worksheet/recipe';

export const dynamic = 'force-dynamic';

async function verifyDev() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'กรุณาเข้าสู่ระบบ' };
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!p || p.role !== 'dev') return { ok: false, status: 403, error: 'สำหรับ Dev เท่านั้น' };
  return { ok: true, status: 200, error: '' };
}

const fail = (m: string, status = 500) => NextResponse.json({ error: isMissing(m) ? MISSING_MSG : m }, { status });
const uuid = (v: unknown) => (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v) ? v : '');

/** GET = รายการกิจกรรม · ?id= ผลงานทุกสถานะของกิจกรรมนั้น + ใจจากบัญชีใหม่ */
export async function GET(req: NextRequest) {
  const c = await verifyDev();
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: c.status });
  const admin = getAdminClient();
  const id = uuid(req.nextUrl.searchParams.get('id'));
  if (!id) {
    const { data, error } = await admin.from('contests').select(CONTEST_COLS).order('starts_at', { ascending: false }).limit(50);
    if (error) return fail(error.message);
    return NextResponse.json({ contests: (data || []).map((r) => toContest(r as Record<string, unknown>)) });
  }
  const { data, error } = await admin
    .from('contest_entries')
    .select('id, title, subject, owner_id, owner_name, image_url, like_count, status, created_at, profiles(username)')
    .eq('contest_id', id)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return fail(error.message);
  const ids = (data || []).map((r) => r.id as string);
  const fresh: Record<string, number> = {};
  if (ids.length) {
    const { data: likes } = await admin.from('contest_likes').select('entry_id').eq('fresh', true).in('entry_id', ids).limit(20000);
    for (const l of likes || []) fresh[l.entry_id as string] = (fresh[l.entry_id as string] || 0) + 1;
  }
  type Row = { id: string; profiles: { username: string } | null } & Record<string, unknown>;
  return NextResponse.json({
    entries: ((data || []) as unknown as Row[]).map((r) => ({ ...r, username: r.profiles?.username || '', profiles: undefined, fresh: fresh[r.id] || 0 })),
  });
}

/**
 * POST {action:'save', id?, title, starts_at, ends_at, prize_days, join_days, count_new}
 *      {action:'status', entry, status} | {action:'delete_entry', entry} | {action:'delete', id}
 *      {action:'award', id}  ปิดกิจกรรม + ต่อวันสมาชิกให้ผู้ชนะทันที (ทำได้ครั้งเดียว)
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const c = await verifyDev();
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: c.status });
  let b: Record<string, unknown> = {};
  try {
    b = await req.json();
  } catch {
    /* ว่าง */
  }
  const admin = getAdminClient();

  if (b.action === 'save') {
    const title = cleanText(b.title, 80);
    const s = new Date(String(b.starts_at || ''));
    const e = new Date(String(b.ends_at || ''));
    if (!title) return fail('ใส่ชื่อกิจกรรม', 400);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) return fail('ช่วงเวลาไม่ถูกต้อง (วันจบต้องหลังวันเริ่ม)', 400);
    const row = {
      title,
      starts_at: s.toISOString(),
      ends_at: e.toISOString(),
      prize_days: cleanPrizes(b.prize_days),
      join_days: Math.min(30, Math.max(0, Math.round(Number(b.join_days)) || 0)),
      count_new: b.count_new !== false,
    };
    const id = uuid(b.id);
    const res = id ? await admin.from('contests').update(row).eq('id', id).is('awarded_at', null).select('id') : await admin.from('contests').insert(row).select('id');
    if (res.error) return fail(res.error.message);
    if (!res.data?.length) return fail('กิจกรรมนี้มอบรางวัลไปแล้ว แก้ไม่ได้', 400);
    return NextResponse.json({ ok: true, id: res.data[0].id });
  }

  if (b.action === 'status') {
    const st = b.status === 'approved' || b.status === 'rejected' || b.status === 'pending' ? b.status : '';
    if (!uuid(b.entry) || !st) return fail('คำขอไม่ถูกต้อง', 400);
    const { error } = await admin.from('contest_entries').update({ status: st }).eq('id', uuid(b.entry));
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true });
  }

  if (b.action === 'delete_entry') {
    if (!uuid(b.entry)) return fail('คำขอไม่ถูกต้อง', 400);
    const { error } = await admin.from('contest_entries').delete().eq('id', uuid(b.entry));
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true });
  }

  if (b.action === 'delete') {
    if (!uuid(b.id)) return fail('คำขอไม่ถูกต้อง', 400);
    const { error } = await admin.from('contests').delete().eq('id', uuid(b.id));
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true });
  }

  if (b.action === 'award') {
    const id = uuid(b.id);
    if (!id) return fail('คำขอไม่ถูกต้อง', 400);
    const { data: row, error } = await admin.from('contests').select(CONTEST_COLS).eq('id', id).maybeSingle();
    if (error) return fail(error.message);
    if (!row) return fail('ไม่พบกิจกรรม', 404);
    const contest = toContest(row as Record<string, unknown>);
    if (phaseOf(contest) !== 'ended') return fail(contest.awarded_at ? 'มอบรางวัลไปแล้ว' : 'กิจกรรมยังไม่จบ', 400);

    // จองสิทธิ์มอบรางวัลแบบอะตอมมิก: กดซ้ำ/สองแท็บพร้อมกันได้ผลครั้งเดียว
    const now = new Date().toISOString();
    const { data: claimed, error: cErr } = await admin.from('contests').update({ awarded_at: now }).eq('id', id).is('awarded_at', null).select('id');
    if (cErr) return fail(cErr.message);
    if (!claimed?.length) return fail('มอบรางวัลไปแล้ว', 400);

    const { data: ents } = await admin.from('contest_entries').select('id, owner_id, owner_name, like_count, created_at').eq('contest_id', id).eq('status', 'approved').limit(5000);
    const rows = (ents || []) as { id: string; owner_id: string; owner_name: string; like_count: number; created_at: string }[];
    const places = contest.prize_days.filter((d) => d > 0).length ? 3 : 0;
    const top = pickWinners(rows, places);

    // วันที่แต่ละบัญชีได้: รางวัลอันดับ + วันร่วมสนุก (ทุกคนที่ผลงานผ่านการอนุมัติ)
    const gift = new Map<string, number>();
    if (contest.join_days > 0) for (const r of rows) gift.set(r.owner_id, contest.join_days);
    const winners: Winner[] = top.map((r, i) => ({ rank: i + 1, entry: r.id, owner: r.owner_id, name: r.owner_name, likes: r.like_count, days: contest.prize_days[i] || 0 }));
    for (const w of winners) gift.set(w.owner, (gift.get(w.owner) || 0) + w.days);

    const failed: string[] = [];
    for (const [uid, days] of gift) {
      if (days <= 0) continue;
      const { data: p } = await admin.from('profiles').select('premium_until').eq('id', uid).maybeSingle();
      if (!p) continue;
      const { error: upErr } = await admin.from('profiles').update({ premium_until: extendUntil(p.premium_until, days) }).eq('id', uid);
      if (upErr) failed.push(uid);
    }
    await admin.from('contests').update({ winners }).eq('id', id);
    return NextResponse.json({ ok: true, winners, gifted: gift.size - failed.length, failed: failed.length });
  }

  return fail('คำขอไม่ถูกต้อง', 400);
}
