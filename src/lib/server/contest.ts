import { getAdminClient } from '@/lib/supabase/admin';
import { mediaPrefix } from '@/lib/game-creator/prefix';
import { cleanPrizes, phaseOf, type Contest } from '@/lib/worksheet/contest';

export const CONTEST_COLS = 'id, title, starts_at, ends_at, prize_days, join_days, count_new, awarded_at, winners';

export const isMissing = (m?: string) => /relation|does not exist|schema cache|contest_/i.test(m || '');
export const MISSING_MSG = 'ยังไม่ได้รัน migration 029_worksheet_contest.sql';

export function toContest(r: Record<string, unknown>): Contest {
  return {
    id: String(r.id),
    title: String(r.title || ''),
    starts_at: String(r.starts_at),
    ends_at: String(r.ends_at),
    prize_days: cleanPrizes(r.prize_days),
    join_days: Number(r.join_days) || 0,
    count_new: r.count_new !== false,
    awarded_at: (r.awarded_at as string) || null,
    winners: Array.isArray(r.winners) ? (r.winners as Contest['winners']) : null,
  };
}

/**
 * กิจกรรมที่จะโชว์หน้าแกลเลอรี: ที่เปิดอยู่ > ที่กำลังจะเริ่ม > ที่จบล่าสุด
 * คืน undefined เมื่อยังไม่ได้รัน migration
 */
export async function currentContest(): Promise<Contest | null | undefined> {
  const { data, error } = await getAdminClient().from('contests').select(CONTEST_COLS).order('starts_at', { ascending: false }).limit(10);
  if (error) return isMissing(error.message) ? undefined : null;
  const all = (data || []).map((r) => toContest(r as Record<string, unknown>));
  const now = Date.now();
  return (
    all.find((c) => phaseOf(c, now) === 'open') ||
    [...all].reverse().find((c) => phaseOf(c, now) === 'soon') ||
    all.find((c) => new Date(c.ends_at).getTime() <= now) ||
    null
  );
}

/** รูปผลงานต้องอยู่ในโฟลเดอร์ของเจ้าของเองใน bucket game-media */
export function ownImage(url: unknown, uid: string): string | null {
  if (typeof url !== 'string') return null;
  const pre = mediaPrefix() + uid + '/';
  if (!mediaPrefix() || !url.startsWith(pre)) return null;
  const rest = url.slice(pre.length);
  return /^[A-Za-z0-9._-]{1,120}$/.test(rest) && !rest.includes('..') ? url : null;
}
