import { SupabaseClient } from '@supabase/supabase-js';
import {
  BADGES,
  BadgeContext,
  BadgeDef,
  BUDDY_COLORS,
  HATS,
  Hat,
  TodayResult,
  bangkokDate,
  buddyStage,
  liveStreak,
  missionsForDay,
  newlyEarnedBadges,
  starsFromAccuracy,
  unlockedHats,
  updateStreak,
} from '@/lib/gamify';

export interface StatsRow {
  student_id: string;
  stars_total: number;
  bonus_stars: number;
  plays_total: number;
  streak: number;
  best_streak: number;
  last_play_date: string | null;
  last_freeze_week: string | null;
  buddy_color: string;
  buddy_hat: string | null;
}

const EMPTY_STATS = (id: string): StatsRow => ({
  student_id: id,
  stars_total: 0,
  bonus_stars: 0,
  plays_total: 0,
  streak: 0,
  best_streak: 0,
  last_play_date: null,
  last_freeze_week: null,
  buddy_color: 'violet',
  buddy_hat: null,
});

export async function loadStats(admin: SupabaseClient, studentId: string): Promise<StatsRow> {
  const { data, error } = await admin.from('student_stats').select('*').eq('student_id', studentId).maybeSingle();
  if (error) throw error;
  return (data as StatsRow) || EMPTY_STATS(studentId);
}

const startOfDay = (day: string) => new Date(`${day}T00:00:00+07:00`).toISOString();

interface RawResult {
  media_id: string;
  stars: number;
  correct: number;
  total: number;
}

async function todayContext(admin: SupabaseClient, studentId: string, day: string) {
  const since = startOfDay(day);
  const { data: rows, error } = await admin
    .from('play_results')
    .select('media_id, stars, correct, total')
    .eq('student_id', studentId)
    .gte('played_at', since)
    .limit(500);
  if (error) throw error;
  const raw = (rows || []) as RawResult[];

  const mediaIds = Array.from(new Set(raw.map((r) => r.media_id)));
  const subjects = new Map<string, string>();
  let newMediaCount = 0;
  if (mediaIds.length) {
    const { data: media } = await admin.from('media').select('id, subject').in('id', mediaIds);
    (media || []).forEach((m: { id: string; subject: string }) => subjects.set(m.id, m.subject));
    const { data: before } = await admin
      .from('play_results')
      .select('media_id')
      .eq('student_id', studentId)
      .lt('played_at', since)
      .in('media_id', mediaIds)
      .limit(1000);
    const seenBefore = new Set((before || []).map((b: { media_id: string }) => b.media_id));
    newMediaCount = mediaIds.filter((id) => !seenBefore.has(id)).length;
  }

  const results: TodayResult[] = raw.map((r) => ({
    mediaId: r.media_id,
    subject: subjects.get(r.media_id) || '',
    stars: r.stars,
    correct: r.correct,
    total: r.total,
  }));
  return { results, newMediaCount };
}

/** สรุปสถิติสะสมทั้งหมด (ใช้ตัดสินตรา และแสดงสติกเกอร์) */
async function lifetimeContext(admin: SupabaseClient, studentId: string) {
  const { data, error } = await admin
    .from('play_results')
    .select('media_id, stars')
    .eq('student_id', studentId)
    .limit(5000);
  if (error) throw error;
  const bestByMedia = new Map<string, number>();
  (data || []).forEach((r: { media_id: string; stars: number }) => {
    bestByMedia.set(r.media_id, Math.max(bestByMedia.get(r.media_id) || 0, r.stars));
  });
  const ids = Array.from(bestByMedia.keys());
  const subjects = new Set<string>();
  if (ids.length) {
    const { data: media } = await admin.from('media').select('id, subject').in('id', ids);
    (media || []).forEach((m: { subject: string }) => subjects.add(m.subject));
  }
  return {
    bestByMedia,
    distinctMedia: ids.length,
    distinctSubjects: subjects.size,
    hasPerfect: Array.from(bestByMedia.values()).some((s) => s >= 3),
  };
}

/* ------------------------------------------------------------------ */
/* รับผลการเล่นจากเกม                                                  */
/* ------------------------------------------------------------------ */

export interface ResultInput {
  studentId: string;
  mediaId: string;
  sessionId: string;
  levelKey: string;
  score: number;
  stars?: number;
  correct: number;
  total: number;
  durationSec: number;
  mistakes: string[];
}

export async function processResult(admin: SupabaseClient, input: ResultInput) {
  // ดาวที่เกมส่งมา "เกินความแม่นยำจริง" ไม่ได้ (กันตัวเลขปลอม)
  const derived = starsFromAccuracy(input.correct, input.total);
  const stars = input.total > 0 ? Math.min(input.stars ?? derived, derived) : Math.max(0, Math.min(3, input.stars ?? 0));

  const { error: insErr } = await admin.from('play_results').insert({
    student_id: input.studentId,
    media_id: input.mediaId,
    session_id: input.sessionId,
    level_key: input.levelKey,
    score: input.score,
    stars,
    correct: input.correct,
    total: input.total,
    duration_sec: input.durationSec,
    mistakes: input.mistakes,
  });
  if (insErr) throw insErr;

  const today = bangkokDate();
  const prev = await loadStats(admin, input.studentId);
  const streakState = updateStreak(
    { streak: prev.streak, best: prev.best_streak, lastDate: prev.last_play_date, lastFreezeWeek: prev.last_freeze_week },
    today
  );

  const next: StatsRow = {
    ...prev,
    stars_total: prev.stars_total + stars,
    plays_total: prev.plays_total + 1,
    streak: streakState.streak,
    best_streak: streakState.best,
    last_play_date: streakState.lastDate,
    last_freeze_week: streakState.lastFreezeWeek,
  };

  const life = await lifetimeContext(admin, input.studentId);
  const total = next.stars_total + next.bonus_stars;
  const ctx: BadgeContext = {
    starsTotal: total,
    playsTotal: next.plays_total,
    bestStreak: next.best_streak,
    distinctMedia: life.distinctMedia,
    distinctSubjects: life.distinctSubjects,
    hasPerfect: life.hasPerfect,
  };

  const { data: have } = await admin.from('student_badges').select('badge_key').eq('student_id', input.studentId);
  const already = new Set((have || []).map((b: { badge_key: string }) => b.badge_key));
  const fresh = newlyEarnedBadges(ctx, already);
  if (fresh.length) {
    await admin
      .from('student_badges')
      .upsert(fresh.map((b) => ({ student_id: input.studentId, badge_key: b.key })), { onConflict: 'student_id,badge_key', ignoreDuplicates: true });
  }

  const { error: upErr } = await admin
    .from('student_stats')
    .upsert({ ...next, updated_at: new Date().toISOString() }, { onConflict: 'student_id' });
  if (upErr) throw upErr;

  const before = buddyStage(prev.stars_total + prev.bonus_stars).index;
  const after = buddyStage(total).index;

  return {
    stars,
    starsTotal: total,
    streak: next.streak,
    newBadges: fresh.map((b: BadgeDef) => ({ key: b.key, title: b.title })),
    buddyEvolved: after > before,
    buddyStage: buddyStage(total).name,
  };
}

/* ------------------------------------------------------------------ */
/* ข้อมูลหน้า "ห้องผจญภัยของฉัน"                                      */
/* ------------------------------------------------------------------ */

export async function minutesPlayedToday(admin: SupabaseClient, studentId: string, day = bangkokDate()): Promise<number> {
  const { data } = await admin
    .from('play_sessions')
    .select('seconds')
    .eq('student_id', studentId)
    .gte('started_at', startOfDay(day))
    .limit(1000);
  const sec = (data || []).reduce((a: number, r: { seconds: number }) => a + (r.seconds || 0), 0);
  return Math.floor(sec / 60);
}

export async function buildStudentHome(admin: SupabaseClient, studentId: string) {
  const today = bangkokDate();
  const stats = await loadStats(admin, studentId);
  const total = stats.stars_total + stats.bonus_stars;
  const stage = buddyStage(total);

  const [{ results, newMediaCount }, life, badgeRows, claimRows, minutes] = await Promise.all([
    todayContext(admin, studentId, today),
    lifetimeContext(admin, studentId),
    admin.from('student_badges').select('badge_key, earned_at').eq('student_id', studentId),
    admin.from('mission_claims').select('mission_key').eq('student_id', studentId).eq('day', today),
    minutesPlayedToday(admin, studentId, today),
  ]);

  const claimed = new Set((claimRows.data || []).map((c: { mission_key: string }) => c.mission_key));
  const missions = missionsForDay(today).map((m) => {
    const progress = Math.min(m.progress({ results, newMediaCount }), m.target);
    return {
      key: m.key,
      title: m.title,
      target: m.target,
      reward: m.reward,
      progress,
      done: progress >= m.target,
      claimed: claimed.has(m.key),
    };
  });

  const earned = new Map((badgeRows.data || []).map((b: { badge_key: string; earned_at: string }) => [b.badge_key, b.earned_at]));
  const badges = BADGES.map((b) => ({
    key: b.key,
    title: b.title,
    desc: b.desc,
    tone: b.tone,
    icon: b.icon,
    earnedAt: earned.get(b.key) || null,
  }));

  const hat = (HATS as readonly string[]).includes(stats.buddy_hat || '') ? (stats.buddy_hat as Hat) : 'none';
  const color = (BUDDY_COLORS as readonly string[]).includes(stats.buddy_color) ? stats.buddy_color : 'violet';

  return {
    stats: {
      starsTotal: total,
      playsTotal: stats.plays_total,
      streak: liveStreak(
        { streak: stats.streak, best: stats.best_streak, lastDate: stats.last_play_date, lastFreezeWeek: stats.last_freeze_week },
        today
      ),
      bestStreak: stats.best_streak,
    },
    buddy: {
      stage: stage.index,
      stageName: stage.name,
      nextAt: stage.next,
      color,
      hat,
      unlockedHats: unlockedHats(total, stats.best_streak),
    },
    missions,
    badges,
    stickers: Object.fromEntries(life.bestByMedia),
    minutesToday: minutes,
  };
}
