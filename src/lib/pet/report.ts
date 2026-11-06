/** รายงานรายสัปดาห์ + ระดับใบประกาศ คำนวณจากบันทึกในเครื่อง/บัญชี */
import { puzzleScore } from './puzzle';
import { puzzleStreak, weekOf, type PetState, type SubjKey } from './logic';

export const SUBJ_LABEL: Record<SubjKey, string> = { m: 'คณิตศาสตร์', s: 'วิทยาศาสตร์', e: 'ภาษาอังกฤษ', t: 'ภาษาไทย/คำ', x: 'ชุดคำถามของครู' };
export const DAY_LABEL = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];

export type CertTier = 'gold' | 'silver' | 'bronze' | null;
export const CERT_LABEL: Record<Exclude<CertTier, null>, string> = { gold: 'ทอง', silver: 'เงิน', bronze: 'ทองแดง' };
/** เงื่อนไข: จำนวนวันที่มาเรียน + ข้อที่ตอบถูก */
export const CERT_RULES: { tier: Exclude<CertTier, null>; days: number; ok: number; pct: number }[] = [
  { tier: 'gold', days: 5, ok: 60, pct: 70 },
  { tier: 'silver', days: 4, ok: 30, pct: 60 },
  { tier: 'bronze', days: 2, ok: 10, pct: 0 },
];

export interface WeekReport {
  week: string;
  end: string;
  days: { d: string; ok: number; tot: number }[];
  activeDays: number;
  ok: number;
  tot: number;
  pct: number;
  subjects: { key: SubjKey; ok: number; tot: number; pct: number }[];
  best: SubjKey | null;
  practice: SubjKey | null;
  puzzles: number;
  bestPuzzle: number;
  streak: number;
  cert: CertTier;
  /** สัปดาห์ก่อนหน้า ใช้เทียบ */
  prevOk: number;
  prevPct: number;
}

const addDays = (date: string, n: number) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

function sum(pet: PetState, week: string) {
  const end = addDays(week, 6);
  const rows = pet.log.filter((l) => l.d >= week && l.d <= end);
  const ok = rows.reduce((a, l) => a + l.ok, 0);
  const tot = rows.reduce((a, l) => a + l.tot, 0);
  return { rows, ok, tot, pct: tot ? Math.round((ok / tot) * 100) : 0 };
}

export function weekReport(pet: PetState, today: string, weekStart?: string): WeekReport {
  const week = weekStart || weekOf(today);
  const end = addDays(week, 6);
  const cur = sum(pet, week);
  const prev = sum(pet, addDays(week, -7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(week, i);
    const l = cur.rows.find((x) => x.d === d);
    return { d, ok: l?.ok || 0, tot: l?.tot || 0 };
  });
  const pz = pet.puzzles.filter((p) => p.d >= week && p.d <= end);
  // วันที่มาเรียน = ตอบคำถามอย่างน้อย 1 ข้อ (ปริศนาก็บันทึกเป็นการตอบ)
  const activeDays = days.filter((d) => d.tot > 0).length;

  const by = new Map<SubjKey, [number, number]>();
  for (const l of cur.rows) {
    for (const [k, v] of Object.entries(l.by)) {
      const o = by.get(k as SubjKey) || [0, 0];
      by.set(k as SubjKey, [o[0] + v![0], o[1] + v![1]]);
    }
  }
  const subjects = Array.from(by.entries())
    .map(([key, [ok, tot]]) => ({ key, ok, tot, pct: tot ? Math.round((ok / tot) * 100) : 0 }))
    .sort((a, b) => b.tot - a.tot);
  const enough = subjects.filter((s) => s.tot >= 3);
  const ranked = [...enough].sort((a, b) => b.pct - a.pct);
  const best = ranked.length ? ranked[0].key : null;
  const practice = ranked.length > 1 && ranked[ranked.length - 1].pct < ranked[0].pct ? ranked[ranked.length - 1].key : null;

  let cert: CertTier = null;
  for (const r of CERT_RULES) {
    if (activeDays >= r.days && cur.ok >= r.ok && cur.pct >= r.pct) {
      cert = r.tier;
      break;
    }
  }
  return {
    week,
    end,
    days,
    activeDays,
    ok: cur.ok,
    tot: cur.tot,
    pct: cur.pct,
    subjects,
    best,
    practice,
    puzzles: pz.length,
    bestPuzzle: pz.reduce((a, p) => Math.max(a, puzzleScore(p.m, p.s)), 0),
    streak: puzzleStreak(pet, today),
    cert,
    prevOk: prev.ok,
    prevPct: prev.pct,
  };
}

export const prevWeek = (week: string) => addDays(week, -7);
