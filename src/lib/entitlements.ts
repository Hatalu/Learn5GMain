import { hasMembership } from '@/lib/membership';
import { PLANS, isPlanId, type PlanId } from '@/lib/plans';
import type { Profile } from '@/types/database';

/**
 * สิทธิ์ของแต่ละแพ็กเกจ (ตาราง plan_entitlements, migration 030) Dev แก้ในหน้า Dev > แพ็กเกจและสิทธิ์
 * ค่า null = ไม่จำกัด · บัญชีฟรีนับชุดคำถาม/สื่อ "ตลอดอายุบัญชี" (ลบแล้วไม่คืน) แพ็กเกจนับที่มีอยู่
 * ตัวกันจริงอยู่ฝั่งฐานข้อมูล (trigger + can_discover) และ API (upload-url, innovation)
 */
export type Tier = 'free' | PlanId;
export const TIERS: Tier[] = ['free', 'plus', 'pro', 'master'];
export const isTier = (v: unknown): v is Tier => v === 'free' || isPlanId(v);

export interface Ent {
  sets: number | null;
  designs: number | null;
  upload_mb: number;
  discover: boolean;
  ai_game: boolean;
  worksheet: boolean;
  innovation_jobs: number;
  innovation_revisions: number;
  extra: string;
}
export type EntTable = Record<Tier, Ent>;

/** ค่าเริ่มต้น (ใช้เมื่อยังไม่ได้รัน migration 030 หรือโหลดไม่สำเร็จ) ต้องตรงกับแถวเริ่มต้นใน migration */
export const DEFAULT_ENTS: EntTable = {
  free: { sets: 2, designs: 3, upload_mb: 5, discover: false, ai_game: true, worksheet: true, innovation_jobs: 0, innovation_revisions: 0, extra: '' },
  plus: { sets: null, designs: null, upload_mb: 30, discover: true, ai_game: true, worksheet: true, innovation_jobs: 0, innovation_revisions: 0, extra: '' },
  pro: { sets: null, designs: null, upload_mb: 60, discover: true, ai_game: true, worksheet: true, innovation_jobs: 0, innovation_revisions: 0, extra: '' },
  master: { sets: null, designs: null, upload_mb: 100, discover: true, ai_game: true, worksheet: true, innovation_jobs: 2, innovation_revisions: 3, extra: '' },
};

/** เพดานกันสแปมเมื่อ "ไม่จำกัด" (ตรงกับ trigger) */
export const HARD_SETS = 300;
export const HARD_DESIGNS = 500;

const num = (v: unknown, lo: number, hi: number, d: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};
/** undefined = ใช้ค่าเดิม, null/'' = ไม่จำกัด */
const cap = (v: unknown, d: number | null): number | null => {
  if (v === undefined) return d;
  if (v === null || v === '') return null;
  return num(v, 0, 100000, d ?? 0);
};

/** ทำความสะอาดแถวสิทธิ์ (ใช้ทั้งตอนอ่านจาก DB และตอน Dev บันทึก) */
export function cleanEnt(raw: Partial<Record<keyof Ent, unknown>> | null | undefined, d: Ent): Ent {
  const r = raw || {};
  return {
    sets: cap(r.sets, d.sets),
    designs: cap(r.designs, d.designs),
    upload_mb: num(r.upload_mb, 0, 2000, d.upload_mb),
    discover: typeof r.discover === 'boolean' ? r.discover : d.discover,
    ai_game: typeof r.ai_game === 'boolean' ? r.ai_game : d.ai_game,
    worksheet: typeof r.worksheet === 'boolean' ? r.worksheet : d.worksheet,
    innovation_jobs: num(r.innovation_jobs, 0, 50, d.innovation_jobs),
    innovation_revisions: num(r.innovation_revisions, 0, 50, d.innovation_revisions),
    extra: typeof r.extra === 'string' ? r.extra.slice(0, 1000) : d.extra,
  };
}

export function entTableFrom(rows: Array<Record<string, unknown>> | null | undefined): EntTable {
  const t = { ...DEFAULT_ENTS };
  for (const r of rows || []) if (isTier(r.tier)) t[r.tier] = cleanEnt(r, DEFAULT_ENTS[r.tier]);
  return t;
}

export const isTrialName = (name: string | null | undefined) => String(name || '').startsWith('trial_');

/** แพ็กเกจปัจจุบันของบัญชี (ต้องตรงกับฟังก์ชัน user_tier ใน migration 030): dev = master, สมาชิกเก่าที่ยังไม่มี plan = plus */
export function tierOf(profile: Pick<Profile, 'role' | 'premium_until' | 'username'> & { plan?: string | null } | null | undefined): Tier {
  if (!profile || isTrialName(profile.username)) return 'free';
  if (profile.role === 'dev') return 'master';
  if (!hasMembership(profile)) return 'free';
  return isPlanId(profile.plan) ? profile.plan : 'plus';
}

export const unlimited = (n: number | null) => n === null;
export const capText = (n: number | null, unit: string) => (n === null ? 'ไม่จำกัด' : `${n.toLocaleString('th-TH')} ${unit}`);

/** ข้อความสิทธิ์ของแพ็กเกจ (ใช้บนการ์ดราคาและตารางเทียบ) สร้างจากค่าจริงทุกครั้ง */
export function entLines(tier: Tier, e: Ent): string[] {
  const life = tier === 'free' ? ' (ตลอดอายุบัญชี)' : '';
  const out = [
    `ชุดคำถาม/เกม ${capText(e.sets, 'ชุด')}${e.sets === null ? '' : life}`,
    `สื่อการสอน ${capText(e.designs, 'ชิ้น')}${e.designs === null ? '' : life}`,
    `พื้นที่รูปและคลิป ${e.upload_mb} MB`,
  ];
  if (e.discover) out.push('ใช้ผลงานจากคลังครูทั่วประเทศ (Discover)');
  if (e.ai_game) out.push('สร้างเกมด้วย AI');
  if (e.worksheet) out.push('ใบงาน AI');
  if (e.innovation_jobs > 0) out.push(`สั่งทำนวัตกรรมตามแผนการสอน ${e.innovation_jobs} งาน/เดือน แก้ได้ ${e.innovation_revisions} ครั้ง/งาน`);
  for (const l of e.extra.split('\n').map((s) => s.trim()).filter(Boolean)) out.push(l);
  return out;
}

export const TIER_LABEL: Record<Tier, string> = { free: 'บัญชีฟรี', plus: 'Plus', pro: 'Pro', master: 'Master' };
export const tierPrice = (t: Tier) => PLANS.find((p) => p.id === t)?.price ?? 0;
