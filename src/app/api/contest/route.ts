import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { TRIAL_PREFIX } from '@/lib/server/trial-account';
import { clientIp, isSameOrigin, limit } from '@/lib/server/rate-limit';
import { MISSING_MSG, CONTEST_COLS, currentContest, isMissing, ownImage, toContest } from '@/lib/server/contest';
import { MAX_ENTRIES, phaseOf } from '@/lib/worksheet/contest';
import { cleanRecipe, cleanText } from '@/lib/worksheet/recipe';
import { SUBJECTS } from '@/lib/worksheet/options';

export const dynamic = 'force-dynamic';

const PAGE = 24;
/** บัญชีที่สมัครหลังกิจกรรมเริ่ม */
const isFresh = (created: string, start: string) => !!created && new Date(created).getTime() > new Date(start).getTime();
const ENTRY_COLS = 'id, title, subject, owner_id, owner_name, image_url, like_count, created_at, recipe';

type EntryRow = { id: string; title: string; subject: string; owner_id: string; owner_name: string; image_url: string; like_count: number; created_at: string; recipe: unknown };
const pub = (r: EntryRow, uid?: string) => ({
  id: r.id,
  title: r.title,
  subject: r.subject,
  owner_name: r.owner_name,
  image_url: r.image_url,
  like_count: r.like_count,
  created_at: r.created_at,
  recipe: cleanRecipe(r.recipe),
  mine: !!uid && r.owner_id === uid,
});

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await getAdminClient().from('profiles').select('username, display_name, created_at').eq('id', user.id).maybeSingle();
  if (!p) return null;
  return { id: user.id, username: String(p.username), name: String(p.display_name || p.username), created: String(p.created_at || ''), trial: String(p.username).startsWith(TRIAL_PREFIX) };
}

/**
 * แกลเลอรีกิจกรรม (ทุกคนดูได้): ?brief=1 = แค่ข้อมูลกิจกรรม (แบนเนอร์หน้าแรก)
 * ?sort=top|new &subject= &from=  · ล็อกอินแล้วได้ใจที่ตัวเองกด + ผลงานของตัวเอง (รวมที่รออนุมัติ)
 */
export async function GET(req: NextRequest) {
  const contest = await currentContest();
  if (contest === undefined) return NextResponse.json({ missing: true });
  if (!contest) return NextResponse.json({ contest: null });
  const phase = phaseOf(contest);
  const sp = req.nextUrl.searchParams;
  if (sp.get('brief')) return NextResponse.json({ contest, phase }, { headers: { 'Cache-Control': 'public, max-age=60' } });

  const admin = getAdminClient();
  const sort = sp.get('sort') === 'new' ? 'new' : 'top';
  const subject = SUBJECTS.some((s) => s.id === sp.get('subject')) ? sp.get('subject')! : '';
  const from = Math.max(0, Math.min(5000, Math.round(Number(sp.get('from')) || 0)));

  let q = admin.from('contest_entries').select(ENTRY_COLS).eq('contest_id', contest.id).eq('status', 'approved');
  if (subject) q = q.eq('subject', subject);
  q = sort === 'new' ? q.order('created_at', { ascending: false }) : q.order('like_count', { ascending: false }).order('created_at', { ascending: true });
  const [list, top, user] = await Promise.all([
    q.range(from, from + PAGE - 1),
    from === 0
      ? admin.from('contest_entries').select(ENTRY_COLS).eq('contest_id', contest.id).eq('status', 'approved').order('like_count', { ascending: false }).order('created_at', { ascending: true }).limit(10)
      : Promise.resolve({ data: null }),
    me(),
  ]);
  if (list.error) return NextResponse.json({ error: isMissing(list.error.message) ? MISSING_MSG : 'โหลดไม่สำเร็จ' }, { status: 500 });
  const rows = (list.data || []) as EntryRow[];

  let liked: string[] = [];
  let mine: ReturnType<typeof pub>[] = [];
  let mineStatus: Record<string, string> = {};
  if (user) {
    const ids = rows.map((r) => r.id).concat(((top.data || []) as EntryRow[]).map((r) => r.id));
    const [l, m] = await Promise.all([
      ids.length ? admin.from('contest_likes').select('entry_id').eq('user_id', user.id).in('entry_id', ids) : Promise.resolve({ data: [] }),
      admin.from('contest_entries').select(ENTRY_COLS + ', status').eq('contest_id', contest.id).eq('owner_id', user.id).order('created_at', { ascending: false }),
    ]);
    liked = ((l.data || []) as { entry_id: string }[]).map((r) => r.entry_id);
    const mr = (m.data || []) as unknown as (EntryRow & { status: string })[];
    mine = mr.map((r) => pub(r, user.id));
    mineStatus = Object.fromEntries(mr.map((r) => [r.id, r.status]));
  }

  return NextResponse.json(
    {
      contest,
      phase,
      entries: rows.map((r) => pub(r, user?.id)),
      more: rows.length === PAGE,
      top: ((top.data || []) as EntryRow[]).map((r) => pub(r, user?.id)),
      liked,
      mine,
      mineStatus,
      canLike: !!user && !user.trial && (contest.count_new || !isFresh(user.created, contest.starts_at)),
      signedIn: !!user && !user.trial,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

/** POST {action:'like', entry, on} | {action:'submit', title, recipe, image, consent} | {action:'delete', entry} */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const user = await me();
  if (!user) return NextResponse.json({ error: 'เข้าสู่ระบบก่อนนะ', login: true }, { status: 401 });
  if (user.trial) return NextResponse.json({ error: 'สมัครบัญชีจริงก่อนนะ', login: true }, { status: 403 });
  if (!(await limit(`contest:${user.id}`, 90, 10 * 60 * 1000)) || !(await limit(`contest-ip:${clientIp(req)}`, 300, 10 * 60 * 1000))) {
    return NextResponse.json({ error: 'กดบ่อยเกินไป พักสักครู่นะ' }, { status: 429 });
  }
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* ตรวจด้านล่าง */
  }
  const admin = getAdminClient();

  /* ---------------- กดใจ / ยกเลิกใจ ---------------- */
  if (body.action === 'like') {
    const entryId = String(body.entry || '');
    if (!/^[0-9a-f-]{36}$/i.test(entryId)) return NextResponse.json({ error: 'ไม่พบผลงาน' }, { status: 400 });
    const { data: e, error } = await admin.from('contest_entries').select('id, owner_id, status, contest_id').eq('id', entryId).maybeSingle();
    if (error) return NextResponse.json({ error: isMissing(error.message) ? MISSING_MSG : 'กดใจไม่สำเร็จ' }, { status: 500 });
    if (!e || e.status !== 'approved') return NextResponse.json({ error: 'ไม่พบผลงาน' }, { status: 404 });
    if (e.owner_id === user.id) return NextResponse.json({ error: 'กดใจผลงานตัวเองไม่ได้นะ' }, { status: 400 });
    const { data: c } = await admin.from('contests').select(CONTEST_COLS).eq('id', e.contest_id).maybeSingle();
    if (!c) return NextResponse.json({ error: 'ไม่พบกิจกรรม' }, { status: 404 });
    const contest = toContest(c as Record<string, unknown>);
    if (phaseOf(contest) !== 'open') return NextResponse.json({ error: 'ตอนนี้ไม่ได้อยู่ในช่วงกดใจ' }, { status: 400 });
    const fresh = isFresh(user.created, contest.starts_at);
    if (fresh && !contest.count_new) return NextResponse.json({ error: 'กิจกรรมนี้นับใจจากบัญชีที่สมัครก่อนเริ่มกิจกรรมเท่านั้น' }, { status: 403 });

    const res =
      body.on === false
        ? await admin.from('contest_likes').delete().eq('entry_id', entryId).eq('user_id', user.id)
        : await admin.from('contest_likes').upsert({ entry_id: entryId, user_id: user.id, fresh }, { onConflict: 'entry_id,user_id', ignoreDuplicates: true });
    if (res.error) return NextResponse.json({ error: 'กดใจไม่สำเร็จ ลองใหม่นะ' }, { status: 500 });
    const { data: after } = await admin.from('contest_entries').select('like_count').eq('id', entryId).maybeSingle();
    return NextResponse.json({ ok: true, on: body.on !== false, likes: after?.like_count ?? 0 });
  }

  /* ---------------- ลบผลงานของตัวเอง ---------------- */
  if (body.action === 'delete') {
    const entryId = String(body.entry || '');
    if (!/^[0-9a-f-]{36}$/i.test(entryId)) return NextResponse.json({ error: 'ไม่พบผลงาน' }, { status: 400 });
    const { error } = await admin.from('contest_entries').delete().eq('id', entryId).eq('owner_id', user.id);
    if (error) return NextResponse.json({ error: 'ลบไม่สำเร็จ' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  /* ---------------- ส่งผลงาน ---------------- */
  if (body.action === 'submit') {
    if (body.consent !== true) return NextResponse.json({ error: 'ติ๊กยอมรับกติกาก่อนส่งนะ' }, { status: 400 });
    const contest = await currentContest();
    if (contest === undefined) return NextResponse.json({ error: MISSING_MSG }, { status: 500 });
    if (!contest || phaseOf(contest) !== 'open') return NextResponse.json({ error: 'ตอนนี้ยังไม่เปิดรับผลงาน' }, { status: 400 });
    const title = cleanText(body.title, 60);
    if (!title) return NextResponse.json({ error: 'ตั้งชื่อผลงานก่อนนะ' }, { status: 400 });
    const image = ownImage(body.image, user.id);
    if (!image) return NextResponse.json({ error: 'อัปโหลดรูปใบงานก่อนนะ' }, { status: 400 });
    const recipe = cleanRecipe(body.recipe);
    if (!(await limit(`contest-submit:${user.id}`, 10, 60 * 60 * 1000))) return NextResponse.json({ error: 'ส่งบ่อยเกินไป ลองใหม่ภายหลังนะ' }, { status: 429 });

    const { count } = await admin.from('contest_entries').select('id', { count: 'exact', head: true }).eq('contest_id', contest.id).eq('owner_id', user.id);
    if ((count || 0) >= MAX_ENTRIES) return NextResponse.json({ error: `ส่งได้คนละ ${MAX_ENTRIES} ผลงานต่อกิจกรรม ลบผลงานเดิมก่อนถ้าอยากส่งใหม่` }, { status: 400 });

    const { data, error } = await admin
      .from('contest_entries')
      .insert({ contest_id: contest.id, owner_id: user.id, owner_name: user.name.slice(0, 40), title, subject: recipe.s, recipe, image_url: image })
      .select('id')
      .single();
    if (error || !data) return NextResponse.json({ error: 'ส่งผลงานไม่สำเร็จ ลองใหม่นะ' }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id });
  }

  return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 400 });
}
